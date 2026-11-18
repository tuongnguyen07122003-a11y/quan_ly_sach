import { Router } from "express";
import Review from "../models/Review.js";
import Book from "../models/Book.js";
import Order from "../models/Order.js";
import { protect } from "../middleware/auth.js";
import { logActivity } from "../utils/activity.js";

const router = Router();

// Công khai: xem đánh giá của một cuốn sách
router.get("/book/:bookId", async (req, res) => {
  try {
    const reviews = await Review.find({ book: req.params.bookId })
      .sort({ createdAt: -1 })
      .populate("user", "name avatar");
    res.json(reviews);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Đăng nhập: viết đánh giá (đã có thì cập nhật đánh giá cũ của mình)
router.post("/book/:bookId", protect, async (req, res) => {
  try {
    const rating = Math.round(Number(req.body.rating));
    if (!(rating >= 1 && rating <= 5)) {
      return res.status(400).json({ message: "Số sao phải từ 1 đến 5" });
    }
    const book = await Book.findById(req.params.bookId).catch(() => null);
    if (!book) return res.status(404).json({ message: "Không tìm thấy sách" });

    // Đánh dấu "Đã mua" nếu người này có đơn đã thanh toán (hoặc COD đang giao) chứa cuốn sách
    const verifiedPurchase = Boolean(
      await Order.exists({
        user: req.user._id,
        "items.book": book._id,
        $or: [{ status: "paid" }, { paymentMethod: "cod", status: "pending" }],
      })
    );

    const review = await Review.findOneAndUpdate(
      { book: book._id, user: req.user._id },
      { rating, comment: String(req.body.comment || "").trim().slice(0, 1000), verifiedPurchase },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );
    res.status(201).json(review);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Chủ đánh giá hoặc admin được xóa
router.delete("/:id", protect, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: "Không tìm thấy đánh giá" });
    const isOwner = String(review.user) === String(req.user._id);
    if (!isOwner && req.user.role !== "admin") {
      return res.status(403).json({ message: "Bạn không có quyền xóa đánh giá này" });
    }
    await review.deleteOne();
    if (!isOwner) logActivity(req, "Xóa đánh giá", "review", review._id, `Sách ${review.book}`);
    res.json({ message: "Đã xóa" });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

export default router;
