import mongoose from "mongoose";

const bookSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    author: { type: String, required: true, trim: true },
    category: { type: String, trim: true, default: "" },
    year: { type: Number },
    price: { type: Number, default: 0, min: 0 }, // giá bán (VND)
    quantity: { type: Number, default: 1, min: 0 },
    // Ảnh bìa: đường dẫn /uploads/... (tải lên) hoặc link https://...
    image: {
      type: String,
      default: "",
      trim: true,
      validate: {
        validator: (v) => !v || /^(\/uploads\/(covers\/)?[\w.-]+|https?:\/\/\S+)$/.test(v),
        message: "Đường dẫn ảnh không hợp lệ",
      },
    },
    description: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("Book", bookSchema);
