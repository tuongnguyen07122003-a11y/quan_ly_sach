import path from "path";
import { fileURLToPath } from "url";

// Thư mục lưu ảnh: server/uploads (không phụ thuộc thư mục đang chạy lệnh)
export const UPLOAD_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "uploads");
export const COVER_DIR = path.join(UPLOAD_DIR, "covers");
