import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getBook } from "../api.js";
import { useCart } from "../context/CartContext.jsx";
import Reviews from "../components/Reviews.jsx";
import BookCover from "../components/BookCover.jsx";
import { formatVND, stars } from "../utils/format.js";

export default function BookDetail() {
  const { id } = useParams();
  const { add } = useCart();
  const [book, setBook] = useState(null);
  const [error, setError] = useState("");
  const [added, setAdded] = useState(false);

  const load = () => getBook(id).then(setBook).catch((e) => setError(e.message));
  useEffect(() => { load(); }, [id]);

  if (error) return <div className="error">{error}</div>;
  if (!book) return <p className="empty">Đang tải...</p>;

  const canBuy = book.price > 0 && book.quantity > 0;

  const addToCart = () => {
    add(book, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <div>
      <Link to="/" className="back">← Quay lại danh sách</Link>
      <div className="card detail">
        <BookCover book={book} className="large" />
        <div className="detail-info">
          <h1>{book.title}</h1>
          <p className="muted">Tác giả: <b>{book.author}</b></p>
          <p className="rating">
            {book.ratingCount > 0 ? (
              <>
                <span className="star">{stars(book.avgRating)}</span> {book.avgRating}/5 · {book.ratingCount} đánh giá
              </>
            ) : (
              <span className="muted">Chưa có đánh giá</span>
            )}
          </p>
          <table className="info-table">
            <tbody>
              <tr><th>Thể loại</th><td>{book.category || "—"}</td></tr>
              <tr><th>Năm xuất bản</th><td>{book.year || "—"}</td></tr>
              <tr>
                <th>Tình trạng</th>
                <td>
                  <span className={`badge ${book.quantity > 0 ? "ok" : "off"}`}>
                    {book.quantity > 0 ? `Còn ${book.quantity} cuốn` : "Hết sách"}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>

          <div className="buy">
            <span className="price big">{formatVND(book.price)}</span>
            <button className="btn primary" disabled={!canBuy} onClick={addToCart}>
              {added ? "✓ Đã thêm" : "Thêm vào giỏ hàng"}
            </button>
          </div>

          <h3>Mô tả</h3>
          <p>{book.description || "Chưa có mô tả cho cuốn sách này."}</p>
        </div>
      </div>

      <Reviews bookId={book._id} onChange={load} />
    </div>
  );
}
