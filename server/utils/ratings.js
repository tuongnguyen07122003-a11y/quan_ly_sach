import Review from "../models/Review.js";

// Gắn điểm trung bình + số lượt đánh giá vào sách (1 sách hoặc danh sách)
export async function attachRatings(books) {
  const list = Array.isArray(books) ? books : [books];
  const stats = await Review.aggregate([
    { $match: { book: { $in: list.map((b) => b._id) } } },
    { $group: { _id: "$book", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  const map = new Map(stats.map((s) => [String(s._id), s]));
  const out = list.map((b) => {
    const o = b.toObject ? b.toObject() : { ...b };
    const s = map.get(String(b._id));
    o.avgRating = s ? Math.round(s.avg * 10) / 10 : 0;
    o.ratingCount = s ? s.count : 0;
    return o;
  });
  return Array.isArray(books) ? out : out[0];
}
