import { Router } from "express";
import multer from "multer";
import crypto from "crypto";
import fs from "fs";
import { protect } from "../middleware/auth.js";
import { UPLOAD_DIR } from "../utils/paths.js";
import { sniffImage } from "../utils/imageType.js";

const router = Router();
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const EXT = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif" };

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    // Tên file ngẫu nhiên: không dùng tên gốc của người tải lên
    filename: (req, file, cb) => cb(null, crypto.randomBytes(12).toString("hex") + EXT[file.mimetype]),
  }),
  limits: { fileSize: 3 * 1024 * 1024, files: 1 }, // tối đa 3MB
  fileFilter: (req, file, cb) =>
    EXT[file.mimetype] ? cb(null, true) : cb(new Error("Chỉ chấp nhận ảnh JPG, PNG, WEBP hoặc GIF")),
});

// POST /api/uploads?type=avatar  -> mọi người dùng đã đăng nhập (ảnh đại diện của mình)
// POST /api/uploads?type=book    -> chỉ admin (ảnh bìa sách)
router.post("/", protect, (req, res) => {
  const isAvatar = req.query.type === "avatar";
  if (!isAvatar && req.user.role !== "admin") {
    return res.status(403).json({ message: "Bạn không có quyền tải ảnh lên" });
  }
  upload.single("image")(req, res, (err) => {
    if (err) {
      const msg = err.code === "LIMIT_FILE_SIZE" ? "Ảnh tối đa 3MB" : err.message;
      return res.status(400).json({ message: msg });
    }
    if (!req.file) return res.status(400).json({ message: "Chưa chọn ảnh" });
    if (!sniffImage(req.file.path)) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ message: "File không phải là ảnh hợp lệ" });
    }
    res.status(201).json({ url: `/uploads/${req.file.filename}` });
  });
});

export default router;
