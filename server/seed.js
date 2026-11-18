import mongoose from "mongoose";
import dotenv from "dotenv";
import Book from "./models/Book.js";

dotenv.config();

const raw = [
  { title: "Dế Mèn phiêu lưu ký", author: "Tô Hoài", category: "Thiếu nhi", year: 1941, quantity: 5, description: "Cuộc phiêu lưu của chú Dế Mèn qua thế giới loài vật, mang nhiều bài học về lòng dũng cảm và tình bạn." },
  { title: "Truyện Kiều", author: "Nguyễn Du", category: "Thơ", year: 1820, quantity: 3, description: "Truyện thơ nổi tiếng viết bằng chữ Nôm, kể về cuộc đời đầy sóng gió của nàng Thúy Kiều." },
  { title: "Số đỏ", author: "Vũ Trọng Phụng", category: "Tiểu thuyết", year: 1936, quantity: 4, description: "Tiểu thuyết châm biếm xã hội thành thị Việt Nam đầu thế kỷ 20." },
  { title: "Tắt đèn", author: "Ngô Tất Tố", category: "Tiểu thuyết", year: 1939, quantity: 2, description: "Phản ánh cuộc sống cùng cực của người nông dân dưới thời thực dân phong kiến." },
  { title: "Lão Hạc", author: "Nam Cao", category: "Truyện ngắn", year: 1943, quantity: 6, description: "Truyện ngắn cảm động về số phận và lòng tự trọng của người nông dân nghèo." },
  { title: "Chí Phèo", author: "Nam Cao", category: "Truyện ngắn", year: 1941, quantity: 0, description: "Bi kịch của người nông dân bị đẩy đến bước đường cùng trong xã hội cũ." },
  { title: "Nhà giả kim", author: "Paulo Coelho", category: "Tiểu thuyết", year: 1988, quantity: 8, description: "Hành trình theo đuổi ước mơ của cậu bé chăn cừu Santiago." },
  { title: "Đắc nhân tâm", author: "Dale Carnegie", category: "Kỹ năng sống", year: 1936, quantity: 10, description: "Cuốn sách kinh điển về nghệ thuật giao tiếp và ứng xử." },
  { title: "Sapiens: Lược sử loài người", author: "Yuval Noah Harari", category: "Lịch sử", year: 2011, quantity: 4, description: "Cái nhìn tổng quan về lịch sử phát triển của loài người." },
  { title: "Clean Code", author: "Robert C. Martin", category: "Công nghệ", year: 2008, quantity: 3, description: "Hướng dẫn viết mã nguồn sạch, dễ đọc và dễ bảo trì." },
  { title: "Eloquent JavaScript", author: "Marijn Haverbeke", category: "Công nghệ", year: 2018, quantity: 2, description: "Sách học JavaScript hiện đại, từ cơ bản đến nâng cao." },
  { title: "Harry Potter và Hòn đá Phù thủy", author: "J.K. Rowling", category: "Giả tưởng", year: 1997, quantity: 7, description: "Tập đầu tiên về cậu bé phù thủy Harry Potter." },
];

const prices = [45000, 60000, 55000, 50000, 48000, 52000, 79000, 86000, 189000, 420000, 380000, 125000];
const books = raw.map((b, i) => ({ ...b, price: prices[i] }));

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const force = process.argv.includes("--force");
  const count = await Book.countDocuments();

  if (count > 0 && !force) {
    console.log(`Database đã có ${count} cuốn sách, bỏ qua. Dùng "npm run seed -- --force" để xóa và nạp lại.`);
  } else {
    if (force) await Book.deleteMany({});
    await Book.insertMany(books);
    console.log(`Đã thêm ${books.length} cuốn sách mẫu.`);
  }
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Lỗi:", err.message);
  process.exit(1);
});
