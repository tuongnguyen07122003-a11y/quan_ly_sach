import fs from "fs";
import path from "path";
import crypto from "crypto";
import Book from "../models/Book.js";
import { COVER_DIR } from "./paths.js";
import { coverSvg } from "./coverSvg.js";
import { releaseImage } from "./uploads.js";

const isGenerated = (img) => !img || img.startsWith("/uploads/covers/");

// Sách chưa có ảnh (hoặc đang dùng bìa tự tạo) -> tạo bìa SVG theo tên/tác giả/thể loại.
// Sách có ảnh do admin tải lên hoặc link ngoài thì giữ nguyên. Trả về true nếu vừa tạo bìa mới.
export async function ensureCover(book) {
  if (!isGenerated(book.image)) return false;
  const hash = crypto.createHash("md5").update(`${book.title}|${book.author}|${book.category}`).digest("hex").slice(0, 8);
  const name = `${book._id}-${hash}.svg`;
  const url = `/uploads/covers/${name}`;
  const file = path.join(COVER_DIR, name);
  if (book.image === url && fs.existsSync(file)) return false;

  fs.mkdirSync(COVER_DIR, { recursive: true });
  fs.writeFileSync(file, coverSvg(book));
  const old = book.image;
  book.image = url;
  await book.save();
  if (old && old !== url) await releaseImage(old);
  return true;
}

// Chạy khi khởi động: bổ sung bìa cho mọi sách chưa có ảnh
export async function ensureAllCovers() {
  const books = await Book.find({
    $or: [{ image: "" }, { image: null }, { image: { $exists: false } }, { image: /^\/uploads\/covers\// }],
  });
  let created = 0;
  for (const b of books) {
    try {
      if (await ensureCover(b)) created++;
    } catch {
      /* bỏ qua sách lỗi */
    }
  }
  if (created) console.log(`Đã tạo ảnh bìa cho ${created} cuốn sách`);
}
