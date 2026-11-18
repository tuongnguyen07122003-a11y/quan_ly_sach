import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import bookRoutes from "./routes/books.js";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import orderRoutes from "./routes/orders.js";
import categoryRoutes from "./routes/categories.js";
import reviewRoutes from "./routes/reviews.js";
import transactionRoutes from "./routes/transactions.js";
import logRoutes from "./routes/logs.js";
import cartRoutes from "./routes/cart.js";
import uploadRoutes from "./routes/uploads.js";
import loanRoutes from "./routes/loans.js";
import adminRoutes from "./routes/admin.js";
import { UPLOAD_DIR } from "./utils/paths.js";
import { ensureAllCovers } from "./utils/covers.js";
import { syncCategories } from "./utils/categories.js";
import paymentRoutes from "./routes/payment.js";
import User from "./models/User.js";

dotenv.config();

if (!process.env.JWT_SECRET) {
  console.error("Thiếu JWT_SECRET trong file server/.env (xem .env.example)");
  process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.json());

// Phục vụ ảnh đã tải lên (http://localhost:5000/uploads/...)
app.use(
  "/uploads",
  express.static(UPLOAD_DIR, {
    maxAge: "7d",
    setHeaders: (res) => res.setHeader("X-Content-Type-Options", "nosniff"),
  })
);

app.get("/", (req, res) => {
  res.send("API quản lý sách đang chạy. Mở http://localhost:5173 để xem website.");
});
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/logs", logRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/loans", loanRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/payment", paymentRoutes);

// Tự tạo tài khoản admin đầu tiên nếu hệ thống chưa có admin nào
async function ensureAdmin() {
  if (await User.exists({ role: "admin" })) return;
  await User.create({
    name: process.env.ADMIN_NAME || "Quản trị viên",
    email: process.env.ADMIN_EMAIL || "admin@example.com",
    password: process.env.ADMIN_PASSWORD || "admin123",
    role: "admin",
  });
  console.log(`Đã tạo admin mặc định: ${process.env.ADMIN_EMAIL || "admin@example.com"}`);
}

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("Đã kết nối MongoDB");
    await ensureAdmin();
    await syncCategories();
    await ensureAllCovers();
    app.listen(PORT, () => console.log(`Server chạy tại http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("Lỗi kết nối MongoDB:", err.message);
    process.exit(1);
  });
