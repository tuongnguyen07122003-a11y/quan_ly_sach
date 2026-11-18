import fs from "fs";
import path from "path";
import Book from "../models/Book.js";
import User from "../models/User.js";
import { UPLOAD_DIR } from "./paths.js";

const LOCAL = /^\/uploads\/((covers\/)?[\w.-]+)$/;

// Xóa file ảnh trên đĩa khi không còn sách hoặc người dùng nào dùng đến nó.
// (Gọi SAU khi đã cập nhật database.)
export async function releaseImage(url) {
  try {
    const m = LOCAL.exec(url || "");
    if (!m) return; // link ngoài (https://...) thì không có file để xóa
    const file = path.resolve(UPLOAD_DIR, m[1]);
    if (!file.startsWith(UPLOAD_DIR + path.sep)) return;
    const used = (await Book.exists({ image: url })) || (await User.exists({ avatar: url }));
    if (used) return;
    await fs.promises.unlink(file).catch(() => {});
  } catch {
    /* không để lỗi dọn file làm hỏng thao tác chính */
  }
}
