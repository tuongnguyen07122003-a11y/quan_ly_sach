import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { getReviews, saveReview, deleteReview } from "../api.js";
import { stars } from "../utils/format.js";
import Avatar from "./Avatar.jsx";

export default function Reviews({ bookId, onChange }) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const list = await getReviews(bookId);
      setReviews(list);
      const mine = user && list.find((r) => r.user?._id === user._id);
      if (mine) {
        setRating(mine.rating);
        setComment(mine.comment);
      }
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => { load(); }, [bookId, user?._id]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await saveReview(bookId, { rating, comment });
      setError("");
      await load();
      onChange?.();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (id) => {
    if (!confirm("Xóa đánh giá này?")) return;
    try {
      await deleteReview(id);
      setComment("");
      setRating(5);
      await load();
      onChange?.();
    } catch (err) {
      setError(err.message);
    }
  };

  const hasMine = user && reviews.some((r) => r.user?._id === user._id);

  return (
    <div className="card reviews">
      <h2>Đánh giá ({reviews.length})</h2>
      {error && <div className="error">{error}</div>}

      {user ? (
        <form className="review-form" onSubmit={submit}>
          <div className="star-pick">
            {[1, 2, 3, 4, 5].map((n) => (
              <button type="button" key={n} className={n <= rating ? "on" : ""} onClick={() => setRating(n)}>
                ★
              </button>
            ))}
          </div>
          <textarea
            rows="3"
            placeholder="Chia sẻ cảm nhận của bạn về cuốn sách..."
            value={comment}
            maxLength={1000}
            onChange={(e) => setComment(e.target.value)}
          />
          <button className="btn primary" type="submit">
            {hasMine ? "Cập nhật đánh giá" : "Gửi đánh giá"}
          </button>
        </form>
      ) : (
        <p className="hint"><Link to="/login">Đăng nhập</Link> để viết đánh giá.</p>
      )}

      {reviews.length === 0 && <p className="empty">Chưa có đánh giá nào.</p>}
      {reviews.map((r) => (
        <div className="review" key={r._id}>
          <div className="review-head">
            <Avatar user={r.user} size={26} />
            <b>{r.user?.name || "Người dùng đã xóa"}</b>
            {r.verifiedPurchase && <span className="badge ok">Đã mua</span>}
            <span className="star">{stars(r.rating)}</span>
            <span className="muted small">{new Date(r.createdAt).toLocaleDateString("vi-VN")}</span>
            {(user?.role === "admin" || r.user?._id === user?._id) && (
              <button className="btn danger small-btn" onClick={() => remove(r._id)}>Xóa</button>
            )}
          </div>
          {r.comment && <p>{r.comment}</p>}
        </div>
      ))}
    </div>
  );
}
