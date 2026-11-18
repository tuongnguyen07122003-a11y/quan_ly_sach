import mongoose from "mongoose";

// Mỗi lần thanh toán online (VNPay/MoMo) là một bản ghi, dùng để đối soát
const paymentSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    provider: { type: String, enum: ["vnpay", "momo"], required: true },
    txnRef: { type: String, required: true, unique: true }, // mã giao dịch gửi cho cổng thanh toán
    amount: { type: Number, required: true },
    status: { type: String, enum: ["initiated", "success", "failed"], default: "initiated" },
    transactionNo: String, // mã giao dịch của VNPay/MoMo
    resultCode: String,
    message: String,
    paidAt: Date,
  },
  { timestamps: true }
);

export default mongoose.model("Payment", paymentSchema);
