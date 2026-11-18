import { Router } from "express";
import Book from "../models/Book.js";
import Review from "../models/Review.js";
import Loan from "../models/Loan.js";
import { protect, adminOnly } from "../middleware/auth.js";
import { attachRatings } from "../utils/ratings.js";
import { ensureCategory } from "../utils/categories.js";
import { ensureCover } from "../utils/covers.js";
import { releaseImage } from "../utils/uploads.js";
import { logActivity } from "../utils/activity.js";

const router = Router();
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ===== Công khai: ai cũng xem / tìm kiếm được =====
router.get("/", async (req, res) => {
  try {
    const { q, category } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (q) {
      const rx = { $regex: escapeRegex(String(q)), $options: "i" };
      filter.$or = [{ title: rx }, { author: rx }, { category: rx }];
    }
    const books = await Book.find(filter).sort({ createdAt: -1 });
    res.json(await attachRatings(books));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: "Không tìm thấy sách" });
    res.json(await attachRatings(book));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ===== Chỉ admin: thêm / sửa / xóa =====
router.post("/", protect, adminOnly, async (req, res) => {
  try {
    const book = await Book.create(req.body);
    await ensureCategory(book.category);
    await ensureCover(book); // không có ảnh -> tự tạo bìa
    logActivity(req, "Thêm sách", "book", book._id, book.title);
    res.status(201).json(book);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put("/:id", protect, adminOnly, async (req, res) => {
  try {
    const old = await Book.findById(req.params.id).select("image");
    if (!old) return res.status(404).json({ message: "Không tìm thấy sách" });

    const book = await Book.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    await ensureCategory(book.category);
    if (old.image && old.image !== book.image) await releaseImage(old.image); // dọn ảnh cũ
    await ensureCover(book);
    logActivity(req, "Sửa sách", "book", book._id, book.title);
    res.json(book);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    if (await Loan.exists({ status: "borrowing", items: { $elemMatch: { book: req.params.id, status: "borrowed" } } })) {
      return res.status(400).json({ message: "Sách đang được mượn, không thể xóa" });
    }
    const book = await Book.findByIdAndDelete(req.params.id);
    if (!book) return res.status(404).json({ message: "Không tìm thấy sách" });
    await Review.deleteMany({ book: book._id }); // xóa luôn đánh giá của sách này
    await releaseImage(book.image);
    logActivity(req, "Xóa sách", "book", book._id, book.title);
    res.json({ message: "Đã xóa" });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

export default router;
