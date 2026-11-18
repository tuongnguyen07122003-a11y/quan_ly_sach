import { Router } from "express";
import Category from "../models/Category.js";
import Book from "../models/Book.js";
import { protect, adminOnly } from "../middleware/auth.js";
import { logActivity } from "../utils/activity.js";

const router = Router();

const dupMsg = (err) => (err.code === 11000 ? "Thể loại này đã tồn tại" : err.message);

// Công khai: danh sách thể loại kèm số sách
router.get("/", async (req, res) => {
  try {
    const [cats, counts] = await Promise.all([
      Category.find().sort({ name: 1 }),
      Book.aggregate([{ $group: { _id: "$category", count: { $sum: 1 } } }]),
    ]);
    const map = new Map(counts.map((c) => [c._id, c.count]));
    res.json(cats.map((c) => ({ ...c.toObject(), bookCount: map.get(c.name) || 0 })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/", protect, adminOnly, async (req, res) => {
  try {
    const name = (req.body.name || "").trim();
    if (!name) return res.status(400).json({ message: "Vui lòng nhập tên thể loại" });
    const cat = await Category.create({ name, description: req.body.description });
    logActivity(req, "Thêm thể loại", "category", cat._id, cat.name);
    res.status(201).json(cat);
  } catch (err) {
    res.status(400).json({ message: dupMsg(err) });
  }
});

// Đổi tên thể loại -> tự cập nhật luôn các sách thuộc thể loại đó
router.put("/:id", protect, adminOnly, async (req, res) => {
  try {
    const cat = await Category.findById(req.params.id);
    if (!cat) return res.status(404).json({ message: "Không tìm thấy thể loại" });

    const oldName = cat.name;
    const newName = (req.body.name ?? cat.name).trim();
    if (!newName) return res.status(400).json({ message: "Tên thể loại không được để trống" });

    cat.name = newName;
    if (req.body.description !== undefined) cat.description = req.body.description;
    await cat.save();
    if (newName !== oldName) await Book.updateMany({ category: oldName }, { category: newName });

    logActivity(req, "Sửa thể loại", "category", cat._id, oldName === newName ? newName : `${oldName} → ${newName}`);
    res.json(cat);
  } catch (err) {
    res.status(400).json({ message: dupMsg(err) });
  }
});

// Không cho xóa thể loại đang có sách
router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    const cat = await Category.findById(req.params.id);
    if (!cat) return res.status(404).json({ message: "Không tìm thấy thể loại" });
    const n = await Book.countDocuments({ category: cat.name });
    if (n > 0) return res.status(400).json({ message: `Còn ${n} sách thuộc thể loại này, không thể xóa` });
    await cat.deleteOne();
    logActivity(req, "Xóa thể loại", "category", cat._id, cat.name);
    res.json({ message: "Đã xóa" });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

export default router;
