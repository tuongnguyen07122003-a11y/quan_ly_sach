import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [
      {
        book: { type: mongoose.Schema.Types.ObjectId, ref: "Book" },
        title: String,
        image: String, // ảnh bìa tại thời điểm đặt
        price: Number, // giá tại thời điểm đặt
        quantity: Number,
      },
    ],
    total: { type: Number, required: true },
    paymentMethod: { type: String, enum: ["vnpay", "momo", "cod"], default: "vnpay" },
    status: { type: String, enum: ["pending", "paid", "failed", "cancelled"], default: "pending" },
    stockDeducted: { type: Boolean, default: false },
    paidAt: Date,
    transactionNo: String, // mã giao dịch của VNPay/MoMo
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);
