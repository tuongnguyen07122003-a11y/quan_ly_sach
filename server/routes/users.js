import { Router } from "express";
import User from "../models/User.js";
import Review from "../models/Review.js";
import Loan from "../models/Loan.js";
import { protect, adminOnly } from "../middleware/auth.js";
import { logActivity } from "../utils/activity.js";

const router = Router();

// Toàn bộ API người dùng chỉ dành cho admin
router.use(protect, adminOnly);

router.get("/", async (req, res) => {
  try {
    const { q } = req.query;
    const filter = q
      ? { $or: [{ name: { $regex: q, $options: "i" } }, { email: { $regex: q, $options: "i" } }] }
      : {};
    res.json(await User.find(filter).sort({ createdAt: -1 }));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Đổi vai trò / khóa - mở khóa
router.put("/:id", async (req, res) => {
  try {
    if (req.params.id === String(req.user._id)) {
      return res.status(400).json({ message: "Bạn không thể tự đổi vai trò hoặc khóa chính mình" });
    }
    const changes = {};
    if (req.body.role !== undefined) {
      if (!["user", "admin"].includes(req.body.role)) {
        return res.status(400).json({ message: "Vai trò không hợp lệ" });
      }
      changes.role = req.body.role;
    }
    if (req.body.active !== undefined) changes.active = Boolean(req.body.active);

    const user = await User.findByIdAndUpdate(req.params.id, changes, { new: true });
    if (!user) return res.status(404).json({ message: "Không tìm thấy người dùng" });

    if (changes.role !== undefined) {
      logActivity(req, "Đổi vai trò người dùng", "user", user._id, `${user.email} → ${changes.role === "admin" ? "Quản trị" : "Người dùng"}`);
    }
    if (changes.active !== undefined) {
      logActivity(req, changes.active ? "Mở khóa người dùng" : "Khóa người dùng", "user", user._id, user.email);
    }
    res.json(user);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    if (req.params.id === String(req.user._id)) {
      return res.status(400).json({ message: "Bạn không thể tự xóa chính mình" });
    }
    if (await Loan.exists({ borrower: req.params.id, status: "borrowing" })) {
      return res.status(400).json({ message: "Người dùng còn sách chưa trả, không thể xóa" });
    }
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: "Không tìm thấy người dùng" });
    await Review.deleteMany({ user: user._id }); // đơn hàng vẫn giữ lại để đối soát
    logActivity(req, "Xóa người dùng", "user", user._id, user.email);
    res.json({ message: "Đã xóa" });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

export default router;
