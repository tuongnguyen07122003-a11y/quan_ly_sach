import mongoose from "mongoose";

// Nhật ký các thao tác của quản trị viên
const logSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    userName: String, // lưu kèm tên để vẫn đọc được khi tài khoản bị xóa
    action: { type: String, required: true },
    targetType: String, // book | user | order | category | review
    targetId: String,
    detail: String,
  },
  { timestamps: true }
);

export default mongoose.model("ActivityLog", logSchema);
