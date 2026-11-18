import Category from "../models/Category.js";
import Book from "../models/Book.js";

// Đảm bảo thể loại của sách luôn có trong collection categories
export async function ensureCategory(name) {
  const n = (name || "").trim();
  if (!n) return;
  await Category.updateOne({ name: n }, { $setOnInsert: { name: n } }, { upsert: true }).catch(() => {});
}

// Chạy khi khởi động: đồng bộ thể loại từ sách đã có (không cần nhập tay)
export async function syncCategories() {
  const names = await Book.distinct("category");
  for (const n of names) await ensureCategory(n);
}
