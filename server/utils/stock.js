import Book from "../models/Book.js";

// Trừ tồn kho (chỉ trừ một lần cho mỗi đơn)
export async function deductStock(order) {
  if (order.stockDeducted) return;
  for (const it of order.items) {
    await Book.updateOne({ _id: it.book }, { $inc: { quantity: -it.quantity } });
  }
  order.stockDeducted = true;
  await order.save();
}

// Hoàn lại tồn kho khi hủy đơn
export async function restoreStock(order) {
  if (!order.stockDeducted) return;
  for (const it of order.items) {
    await Book.updateOne({ _id: it.book }, { $inc: { quantity: it.quantity } });
  }
  order.stockDeducted = false;
  await order.save();
}
