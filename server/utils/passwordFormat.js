import crypto from "crypto";

// HASH_PASSWORDS=false trong .env -> lưu mật khẩu dạng chữ thường (chỉ nên dùng khi học/thử nghiệm)
export const hashingEnabled = () => String(process.env.HASH_PASSWORDS ?? "true").trim().toLowerCase() !== "false";

// Chuỗi có dạng bcrypt ($2b$10$... dài 60 ký tự)?
export const isBcryptHash = (s) => /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(s || "");

// So sánh mật khẩu chữ thường (không bị lộ qua thời gian xử lý)
export function plainEquals(stored, given) {
  const a = Buffer.from(String(stored));
  const b = Buffer.from(String(given));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
