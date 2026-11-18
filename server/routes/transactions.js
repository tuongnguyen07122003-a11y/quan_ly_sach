import { Router } from "express";
import Payment from "../models/Payment.js";
import { protect, adminOnly } from "../middleware/auth.js";

const router = Router();
router.use(protect, adminOnly);

// Admin: lịch sử giao dịch thanh toán online
router.get("/", async (req, res) => {
  try {
    const list = await Payment.find()
      .sort({ createdAt: -1 })
      .limit(500)
      .populate("user", "name email")
      .populate("order", "total status");
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
