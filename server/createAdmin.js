import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";

dotenv.config();

// Cách dùng: npm run create-admin -- <email> <mật khẩu> [tên]
// - Chưa có tài khoản với email này -> tạo mới với vai trò admin
// - Đã có -> đặt lại mật khẩu, nâng lên admin và mở khóa
const [email, password, ...nameParts] = process.argv.slice(2);
const name = nameParts.join(" ").trim();

if (!email || !password) {
  console.log("Cách dùng: npm run create-admin -- <email> <mật khẩu> [tên]");
  process.exit(1);
}
if (password.length < 6) {
  console.log("Mật khẩu phải có ít nhất 6 ký tự");
  process.exit(1);
}

try {
  await mongoose.connect(process.env.MONGO_URI);
  const mail = email.toLowerCase().trim();
  let user = await User.findOne({ email: mail });

  if (user) {
    user.password = password; // tự được mã hóa khi lưu
    user.role = "admin";
    user.active = true;
    if (name) user.name = name;
    await user.save();
    console.log(`Đã cập nhật ${mail}: vai trò admin, mật khẩu mới, đã mở khóa.`);
  } else {
    await User.create({ name: name || "Quản trị viên", email: mail, password, role: "admin" });
    console.log(`Đã tạo tài khoản admin: ${mail}`);
  }
} catch (err) {
  console.error("Lỗi:", err.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
