import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Yêu cầu đăng nhập: đọc token từ header "Authorization: Bearer <token>"
export async function protect(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Bạn chưa đăng nhập" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id);
    if (!user) return res.status(401).json({ message: "Tài khoản không tồn tại" });
    if (!user.active) return res.status(403).json({ message: "Tài khoản đã bị khóa" });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn" });
  }
}

// Chỉ cho phép quản trị viên (dùng sau protect)
export function adminOnly(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Bạn không có quyền thực hiện thao tác này" });
  }
  next();
}
