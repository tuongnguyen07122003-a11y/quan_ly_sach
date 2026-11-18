import { Router } from "express";
import Order from "../models/Order.js";
import Payment from "../models/Payment.js";
import { verifyVnpay } from "../utils/vnpay.js";
import { verifyMomo } from "../utils/momo.js";
import { deductStock } from "../utils/stock.js";

const router = Router();
const clientUrl = () => process.env.CLIENT_URL || "http://localhost:5173";

// Ghi nhận kết quả thanh toán cho đơn hàng (dùng chung VNPay + MoMo)
async function settle(order, { success, transactionNo }) {
  if (order.status === "paid") return "already";
  if (success) {
    order.status = "paid";
    order.paidAt = new Date();
    order.transactionNo = transactionNo;
    await order.save();
    await deductStock(order);
  } else if (order.status === "pending") {
    order.status = "failed";
    await order.save();
  }
  return "done";
}

// Cập nhật bản ghi trong collection payments (không bao giờ hạ "success" xuống "failed")
async function recordPayment({ order, provider, txnRef, success, transactionNo, code, message }) {
  try {
    if (!txnRef) return;
    const existing = await Payment.findOne({ txnRef });
    if (existing?.status === "success") return;
    await Payment.findOneAndUpdate(
      { txnRef },
      {
        $set: {
          order: order._id,
          user: order.user,
          provider,
          amount: order.total,
          status: success ? "success" : "failed",
          transactionNo,
          resultCode: code,
          message,
          ...(success ? { paidAt: new Date() } : {}),
        },
      },
      { upsert: true, setDefaultsOnInsert: true }
    );
  } catch {
    /* ghi nhật ký lỗi không được làm hỏng luồng thanh toán */
  }
}

const findOrder = (txnRef) => Order.findById(String(txnRef || "").slice(0, 24)).catch(() => null);

// ================= VNPay =================
async function processVnpay(q) {
  if (!verifyVnpay(q)) return { rsp: "97", message: "Invalid signature", success: false };
  const order = await findOrder(q.vnp_TxnRef);
  if (!order) return { rsp: "01", message: "Order not found", success: false };
  if (Number(q.vnp_Amount) !== order.total * 100) {
    return { rsp: "04", message: "Invalid amount", success: false, order };
  }
  const success =
    q.vnp_ResponseCode === "00" && (q.vnp_TransactionStatus === undefined || q.vnp_TransactionStatus === "00");
  await recordPayment({
    order,
    provider: "vnpay",
    txnRef: q.vnp_TxnRef,
    success,
    transactionNo: q.vnp_TransactionNo,
    code: q.vnp_ResponseCode,
    message: success ? "Thành công" : "Thất bại hoặc bị hủy",
  });
  const state = await settle(order, { success, transactionNo: q.vnp_TransactionNo });
  return state === "already"
    ? { rsp: "02", message: "Order already confirmed", success: true, order }
    : { rsp: "00", message: "Confirm Success", success, order };
}

router.get("/vnpay-return", async (req, res) => {
  try {
    const r = await processVnpay(req.query);
    res.redirect(`${clientUrl()}/payment-result?status=${r.success ? "success" : "failed"}&orderId=${r.order?._id || ""}`);
  } catch {
    res.redirect(`${clientUrl()}/payment-result?status=failed`);
  }
});

router.get("/vnpay-ipn", async (req, res) => {
  try {
    const r = await processVnpay(req.query);
    res.json({ RspCode: r.rsp, Message: r.message });
  } catch {
    res.json({ RspCode: "99", Message: "Unknown error" });
  }
});

// ================= MoMo =================
async function processMomo(data) {
  if (!verifyMomo(data)) return { ok: false, success: false };
  const order = await findOrder(data.orderId);
  if (!order || Number(data.amount) !== order.total) return { ok: false, success: false, order };
  const success = Number(data.resultCode) === 0;
  await recordPayment({
    order,
    provider: "momo",
    txnRef: data.orderId,
    success,
    transactionNo: String(data.transId || ""),
    code: String(data.resultCode),
    message: data.message,
  });
  await settle(order, { success, transactionNo: String(data.transId || "") });
  return { ok: true, success, order };
}

// Người dùng được MoMo chuyển về đây (redirectUrl)
router.get("/momo-return", async (req, res) => {
  try {
    const r = await processMomo(req.query);
    res.redirect(`${clientUrl()}/payment-result?status=${r.success ? "success" : "failed"}&orderId=${r.order?._id || ""}`);
  } catch {
    res.redirect(`${clientUrl()}/payment-result?status=failed`);
  }
});

// MoMo gọi server-to-server (ipnUrl) - cần địa chỉ công khai khi triển khai thật
router.post("/momo-ipn", async (req, res) => {
  try {
    await processMomo(req.body);
  } catch {
    /* vẫn phản hồi để MoMo không gọi lại liên tục */
  }
  res.status(204).end();
});

export default router;
