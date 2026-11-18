import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getBooks, getCategories } from "../api.js";
import { formatVND, stars } from "../utils/format.js";
import BookCover from "../components/BookCover.jsx";

export default function Home() {
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        setBooks(await getBooks(query, category));
        setError("");
      } catch (e) {
        setError(e.message);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query, category]);

  return (
    <div>
      <div className="hero">
        <h1>Tìm kiếm sách</h1>
        <input
          className="search big"
          placeholder="Nhập tên sách, tác giả hoặc thể loại..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="chips">
          <button className={`chip ${category === "" ? "active" : ""}`} onClick={() => setCategory("")}>
            Tất cả
          </button>
          {categories.filter((c) => c.bookCount > 0).map((c) => (
            <button
              key={c._id}
              className={`chip ${category === c.name ? "active" : ""}`}
              onClick={() => setCategory(c.name)}
            >
              {c.name} ({c.bookCount})
            </button>
          ))}
        </div>
      </div>

      {error && <div className="error">{error}</div>}
      {books.length === 0 ? (
        <p className="empty">Không tìm thấy sách nào.</p>
      ) : (
        <div className="grid">
          {books.map((b) => (
            <Link to={`/books/${b._id}`} className="book-card card" key={b._id}>
              <BookCover book={b} />
              <h3>{b.title}</h3>
              <p className="muted">{b.author}</p>
              {b.ratingCount > 0 && (
                <p className="rating small">
                  <span className="star">{stars(b.avgRating)}</span> {b.avgRating} ({b.ratingCount})
                </p>
              )}
              <p className="price">{formatVND(b.price)}</p>
              <div className="meta">
                {b.category && <span className="badge">{b.category}</span>}
                <span className={`badge ${b.quantity > 0 ? "ok" : "off"}`}>
                  {b.quantity > 0 ? `Còn ${b.quantity}` : "Hết sách"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
