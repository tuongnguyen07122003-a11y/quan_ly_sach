import { Router } from "express";
import Order from "../models/Order.js";
import Book from "../models/Book.js";
import { protect, adminOnly } from "../middleware/auth.js";
import { buildPaymentUrl, vnpayConfigured } from "../utils/vnpay.js";
import { createMomoPayment, momoConfigured } from "../utils/momo.js";
import { deductStock, restoreStock } from "../utils/stock.js";
import Payment from "../models/Payment.js";
import Cart from "../models/Cart.js";
import { logActivity } from "../utils/activity.js";

const router = Router();
router.use(protect);

function clientIp(req) {
  const raw = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1").toString().split(",")[0].trim();
  const ip = raw.replace("::ffff:", "");
  return ip === "::1" ? "127.0.0.1" : ip;
}

// Các cổng thanh toán online: giới hạn số tiền và cách tạo link thanh toán
const PROVIDERS = {
  vnpay: {
    label: "VNPay",
    min: 5000,
    max: 1_000_000_000,
    configured: vnpayConfigured,
    getUrl: async (order, req, txnRef) => buildPaymentUrl({ order, ipAddr: clientIp(req), txnRef }),
  },
  momo: {
    label: "MoMo",
    min: 1000,
    max: 50_000_000,
    configured: momoConfigured,
    getUrl: async (order, req, txnRef) => createMomoPayment(order, txnRef),
  },
};

const money = (n) => `${n.toLocaleString("vi-VN")} ₫`;

// Tạo đơn hàng - giá và tồn kho luôn lấy từ database, không tin dữ liệu từ client
router.post("/", async (req, res) => {
  try {
    const { items, paymentMethod = "vnpay" } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Giỏ hàng trống" });
    }
    if (paymentMethod !== "cod" && !PROVIDERS[paymentMethod]) {
      return res.status(400).json({ message: "Phương thức thanh toán không hợp lệ" });
    }

    // Gộp số lượng theo từng sách
    const wanted = new Map();
    for (const it of items) {
      const qty = Math.floor(Number(it.quantity));
      if (!it.bookId || !qty || qty < 1) return res.status(400).json({ message: "Số lượng không hợp lệ" });
      wanted.set(String(it.bookId), (wanted.get(String(it.bookId)) || 0) + qty);
    }

    const orderItems = [];
    let total = 0;
    for (const [bookId, qty] of wanted) {
      const book = await Book.findById(bookId).catch(() => null);
      if (!book) return res.status(400).json({ message: "Có sách không còn tồn tại" });
      if (!(book.price > 0)) return res.status(400).json({ message: `"${book.title}" chưa có giá bán` });
      if (book.quantity < qty) {
        return res.status(400).json({ message: `"${book.title}" chỉ còn ${book.quantity} cuốn` });
      }
      orderItems.push({ book: book._id, title: book.title, image: book.image, price: book.price, quantity: qty });
      total += book.price * qty;
    }

    const provider = PROVIDERS[paymentMethod];
    if (provider && (total < provider.min || total > provider.max)) {
      return res.status(400).json({
        message: `${provider.label} chỉ nhận đơn từ ${money(provider.min)} đến ${money(provider.max)}`,
      });
    }

    const order = await Order.create({ user: req.user._id, items: orderItems, total, paymentMethod });
    await Cart.updateOne({ user: req.user._id }, { items: [] }); // đặt hàng xong -> làm trống giỏ
    if (paymentMethod === "cod") await deductStock(order); // COD: giữ hàng ngay
    res.status(201).json(order);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Đơn hàng của tôi
router.get("/mine", async (req, res) => {
  try {
    res.json(await Order.find({ user: req.user._id }).sort({ createdAt: -1 }));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Lấy link thanh toán (vnpay hoặc momo) cho đơn của chính mình.
// Đơn chưa thanh toán có thể đổi sang cổng khác khi thanh toán lại.
router.post("/:id/:provider", async (req, res) => {
  try {
    const provider = PROVIDERS[req.params.provider];
    if (!provider) return res.status(404).json({ message: "Cổng thanh toán không tồn tại" });
    if (!provider.configured()) {
      return res.status(503).json({ message: `Chưa cấu hình thanh toán ${provider.label}` });
    }

    const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
    if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    if (order.paymentMethod === "cod") {
      return res.status(400).json({ message: "Đơn này chọn thanh toán khi nhận hàng" });
    }
    if (["paid", "cancelled"].includes(order.status)) {
      return res.status(400).json({ message: "Đơn hàng này không thể thanh toán" });
    }
    if (order.total < provider.min || order.total > provider.max) {
      return res.status(400).json({
        message: `${provider.label} chỉ nhận đơn từ ${money(provider.min)} đến ${money(provider.max)}`,
      });
    }

    if (order.paymentMethod !== req.params.provider) {
      order.paymentMethod = req.params.provider;
      await order.save();
    }
    // Mã giao dịch gửi cho cổng thanh toán; lưu lại vào collection payments để đối soát
    const txnRef = `${order._id}${Date.now()}`;
    const url = await provider.getUrl(order, req, txnRef);
    await Payment.create({
      order: order._id,
      user: req.user._id,
      provider: req.params.provider,
      txnRef,
      amount: order.total,
      status: "initiated",
    });
    res.json({ url });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ===== Chỉ admin =====
router.get("/", adminOnly, async (req, res) => {
  try {
    res.json(await Order.find().sort({ createdAt: -1 }).populate("user", "name email"));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/:id/status", adminOnly, async (req, res) => {
  try {
    const { status } = req.body;
    if (!["pending", "paid", "cancelled"].includes(status)) {
      return res.status(400).json({ message: "Trạng thái không hợp lệ" });
    }
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });

    if (status === "cancelled") await restoreStock(order);
    if (status === "paid") {
      await deductStock(order);
      order.paidAt = order.paidAt || new Date();
    }
    order.status = status;
    await order.save();
    logActivity(req, "Đổi trạng thái đơn hàng", "order", order._id, `#${String(order._id).slice(-6).toUpperCase()} → ${status}`);
    res.json(order);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

export default router;
