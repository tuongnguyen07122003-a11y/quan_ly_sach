import { useEffect, useState } from "react";
import BookForm from "../components/BookForm.jsx";
import BookList from "../components/BookList.jsx";
import { getBooks, createBook, updateBook, deleteBook } from "../api.js";

export default function ManageBooks() {
  const [books, setBooks] = useState([]);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");

  const load = async (q = query) => {
    try {
      setBooks(await getBooks(q));
      setError("");
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => load(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const handleSubmit = async (data) => {
    try {
      if (editing) await updateBook(editing._id, data);
      else await createBook(data);
      setEditing(null);
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Bạn chắc chắn muốn xóa cuốn sách này?")) return;
    try {
      await deleteBook(id);
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div>
      <h1>Quản lý sách</h1>
      {error && <div className="error">{error}</div>}
      <div className="layout">
        <BookForm editing={editing} onSubmit={handleSubmit} onCancel={() => setEditing(null)} />
        <div>
          <input
            className="search"
            placeholder="Tìm theo tên, tác giả, thể loại..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <BookList books={books} onEdit={setEditing} onDelete={handleDelete} />
        </div>
      </div>
    </div>
  );
}
