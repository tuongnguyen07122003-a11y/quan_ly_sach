import { Router } from "express";
import Cart from "../models/Cart.js";
import Book from "../models/Book.js";
import { protect } from "../middleware/auth.js";

const router = Router();
router.use(protect);

// Giá và tồn kho luôn lấy mới từ collection books
async function loadShaped(userId) {
  const cart = await Cart.findOne({ user: userId }).populate("items.book", "title author image price quantity");
  return (cart?.items || [])
    .filter((i) => i.book) // bỏ sách đã bị xóa
    .map((i) => ({
      _id: i.book._id,
      title: i.book.title,
      author: i.book.author,
      image: i.book.image,
      price: i.book.price,
      stock: i.book.quantity,
      qty: i.quantity,
    }));
}

// Làm sạch dữ liệu client gửi lên: gộp trùng, bỏ sách không tồn tại/hết hàng, giới hạn theo tồn kho
async function normalize(items) {
  const wanted = new Map();
  for (const it of (Array.isArray(items) ? items : []).slice(0, 100)) {
    const q = Math.floor(Number(it.quantity));
    if (!it.bookId || !(q >= 1)) continue;
    wanted.set(String(it.bookId), (wanted.get(String(it.bookId)) || 0) + q);
  }
  const out = [];
  for (const [id, q] of wanted) {
    const book = await Book.findById(id).select("quantity").catch(() => null);
    if (!book || book.quantity < 1) continue;
    out.push({ book: book._id, quantity: Math.min(q, book.quantity) });
  }
  return out;
}

router.get("/", async (req, res) => {
  try {
    res.json(await loadShaped(req.user._id));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Thay toàn bộ giỏ hàng
router.put("/", async (req, res) => {
  try {
    await Cart.findOneAndUpdate(
      { user: req.user._id },
      { items: await normalize(req.body.items) },
      { upsert: true, setDefaultsOnInsert: true }
    );
    res.json(await loadShaped(req.user._id));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Gộp giỏ hàng của khách (trước khi đăng nhập) vào giỏ hàng đã lưu
router.post("/merge", async (req, res) => {
  try {
    const current = (await Cart.findOne({ user: req.user._id }))?.items || [];
    const combined = [
      ...current.map((i) => ({ bookId: i.book, quantity: i.quantity })),
      ...(Array.isArray(req.body.items) ? req.body.items : []),
    ];
    await Cart.findOneAndUpdate(
      { user: req.user._id },
      { items: await normalize(combined) },
      { upsert: true, setDefaultsOnInsert: true }
    );
    res.json(await loadShaped(req.user._id));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete("/", async (req, res) => {
  try {
    await Cart.deleteOne({ user: req.user._id });
    res.json([]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
