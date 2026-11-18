import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { hashingEnabled, isBcryptHash, plainEquals } from "../utils/passwordFormat.js";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Tài khoản đăng nhập bằng Google/Facebook không cần mật khẩu
    password: {
      type: String,
      minlength: 6,
      required: function () {
        return !this.googleId && !this.facebookId;
      },
    },
    googleId: { type: String, unique: true, sparse: true },
    facebookId: { type: String, unique: true, sparse: true },
    avatar: { type: String },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Mã hóa mật khẩu trước khi lưu, trừ khi HASH_PASSWORDS=false (xem .env)
userSchema.pre("save", async function (next) {
  if (!this.password || !this.isModified("password")) return next();
  if (!hashingEnabled()) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Đọc được cả hai dạng: đã mã hóa (bcrypt) hoặc chữ thường
userSchema.methods.matchPassword = async function (plain) {
  if (!this.password) return false;
  if (isBcryptHash(this.password)) return bcrypt.compare(plain, this.password);
  return plainEquals(this.password, plain);
};

// Không bao giờ trả mật khẩu ra ngoài qua API
userSchema.set("toJSON", {
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model("User", userSchema);
