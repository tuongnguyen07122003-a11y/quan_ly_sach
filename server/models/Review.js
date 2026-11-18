import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    book: { type: mongoose.Schema.Types.ObjectId, ref: "Book", required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 1000, default: "" },
    verifiedPurchase: { type: Boolean, default: false }, // người này đã mua cuốn sách này
  },
  { timestamps: true }
);

// Mỗi người chỉ có 1 đánh giá cho mỗi cuốn sách
reviewSchema.index({ book: 1, user: 1 }, { unique: true });

export default mongoose.model("Review", reviewSchema);
