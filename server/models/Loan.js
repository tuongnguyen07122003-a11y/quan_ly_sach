import mongoose from "mongoose";

const { Schema } = mongoose;

// Mỗi dòng sách trong phiếu mượn (lưu kèm tên/giá tại thời điểm mượn)
const loanItemSchema = new Schema({
  book: { type: Schema.Types.ObjectId, ref: "Book", required: true },
  title: String,
  image: String,
  price: { type: Number, default: 0 },
  quantity: { type: Number, default: 1, min: 1 },
  status: { type: String, enum: ["borrowed", "returned", "lost", "damaged"], default: "borrowed" },
  resolvedAt: Date, // ngày trả / báo mất / báo hỏng
  lateFee: { type: Number, default: 0 }, // phạt trả muộn
  compensation: { type: Number, default: 0 }, // tiền bồi thường mất / hư hỏng
  note: String,
});

const loanSchema = new Schema(
  {
    code: { type: String, unique: true }, // mã phiếu, ví dụ PM-1A2B3C
    borrower: { type: Schema.Types.ObjectId, ref: "User", required: true },
    borrowerName: String, // lưu kèm để vẫn đọc được khi tài khoản bị xóa
    borrowerEmail: String,
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    createdByName: String,
    items: { type: [loanItemSchema], validate: (v) => v.length > 0 },
    borrowDate: { type: Date, required: true },
    dueDate: { type: Date, required: true }, // hạn trả (cuối ngày, giờ Việt Nam)
    status: { type: String, enum: ["borrowing", "completed", "cancelled"], default: "borrowing" },
    renewals: [
      {
        at: Date,
        previousDue: Date,
        newDue: Date,
        by: { type: Schema.Types.ObjectId, ref: "User" },
        byName: String,
      },
    ],
    finePaid: { type: Boolean, default: false }, // đã thu tiền phạt / bồi thường
    note: String,
    completedAt: Date,
  },
  { timestamps: true }
);

loanSchema.pre("validate", function (next) {
  if (!this.code) this.code = `PM-${String(this._id).slice(-6).toUpperCase()}`;
  next();
});

loanSchema.index({ status: 1, dueDate: 1 });
loanSchema.index({ borrower: 1, createdAt: -1 });

export default mongoose.model("Loan", loanSchema);
