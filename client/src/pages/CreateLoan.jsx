import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getUsers, getBooks, getLoanRules, createLoan } from "../api.js";
import BookCover from "../components/BookCover.jsx";
import Avatar from "../components/Avatar.jsx";

// Ngày hiện tại theo giờ Việt Nam (UTC+7), dạng YYYY-MM-DD
const todayVN = () => new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
const addDays = (ymd, n) => {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export default function CreateLoan() {
  const navigate = useNavigate();
  const today = todayVN();
  const [rules, setRules] = useState(null);
  const [borrower, setBorrower] = useState(null);
  const [uq, setUq] = useState("");
  const [users, setUsers] = useState([]);
  const [bq, setBq] = useState("");
  const [books, setBooks] = useState([]);
  const [items, setItems] = useState([]); // { book, qty }
  const [borrowDate, setBorrowDate] = useState(today);
  const [dueDate, setDueDate] = useState("");
  const [dueTouched, setDueTouched] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getLoanRules().then(setRules).catch(() => {});
  }, []);

  // Hạn trả mặc định = ngày mượn + số ngày theo quy định (đến khi admin tự chọn)
  useEffect(() => {
    if (rules && !dueTouched) setDueDate(addDays(borrowDate, rules.loanDays));
  }, [rules, borrowDate, dueTouched]);

  // Tìm người mượn
  useEffect(() => {
    if (!uq.trim() || borrower) return setUsers([]);
    const t = setTimeout(() => getUsers(uq.trim()).then((l) => setUsers(l.filter((u) => u.active).slice(0, 8))).catch(() => {}), 250);
    return () => clearTimeout(t);
  }, [uq, borrower]);

  // Tìm sách
  useEffect(() => {
    if (!bq.trim()) return setBooks([]);
    const t = setTimeout(() => getBooks(bq.trim()).then((l) => setBooks(l.slice(0, 8))).catch(() => {}), 250);
    return () => clearTimeout(t);
  }, [bq]);

  const addBook = (book) => {
    setItems((prev) => {
      const found = prev.find((i) => i.book._id === book._id);
      if (found) return prev.map((i) => (i.book._id === book._id ? { ...i, qty: Math.min(i.qty + 1, book.quantity) } : i));
      return [...prev, { book, qty: 1 }];
    });
  };
  const setQty = (id, qty) =>
    setItems((prev) => prev.map((i) => (i.book._id === id ? { ...i, qty: Math.max(1, Math.min(qty || 1, i.book.quantity)) } : i)));
  const removeBook = (id) => setItems((prev) => prev.filter((i) => i.book._id !== id));

  const totalQty = items.reduce((s, i) => s + i.qty, 0);

  const submit = async (e) => {
    e.preventDefault();
    if (!borrower) return setError("Vui lòng chọn người mượn");
    if (items.length === 0) return setError("Vui lòng chọn ít nhất một cuốn sách");
    setBusy(true);
    setError("");
    try {
      const loan = await createLoan({
        borrowerId: borrower._id,
        items: items.map((i) => ({ bookId: i.book._id, quantity: i.qty })),
        borrowDate,
        dueDate,
        note,
      });
      navigate(`/admin/loans/${loan._id}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div>
      <Link to="/admin/loans" className="back">← Quay lại quản lý mượn trả</Link>
      <h1>Tạo phiếu mượn sách</h1>
      {error && <div className="error">{error}</div>}

      <form className="loan-form" onSubmit={submit}>
        <div className="card form">
          <h2>1. Người mượn</h2>
          {borrower ? (
            <div className="picked">
              <Avatar user={borrower} size={36} />
              <div style={{ flex: 1 }}>
                <b>{borrower.name}</b>
                <div className="muted small">{borrower.email}</div>
              </div>
              <button type="button" className="btn" onClick={() => { setBorrower(null); setUq(""); }}>Đổi</button>
            </div>
          ) : (
            <>
              <input placeholder="Tìm người mượn theo tên hoặc email..." value={uq} onChange={(e) => setUq(e.target.value)} />
              {users.length > 0 && (
                <ul className="pick-list">
                  {users.map((u) => (
                    <li key={u._id}>
                      <button type="button" onClick={() => setBorrower(u)}>
                        <Avatar user={u} size={28} /> <span>{u.name} <span className="muted small">· {u.email}</span></span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="hint">Người mượn cần có tài khoản trên website (bạn có thể nhờ họ đăng ký trước).</p>
            </>
          )}

          <h2>2. Ngày mượn và hạn trả</h2>
          <div className="row">
            <div>
              <label className="field-label">Ngày mượn</label>
              <input type="date" value={borrowDate} max={today} onChange={(e) => setBorrowDate(e.target.value)} required />
            </div>
            <div>
              <label className="field-label">Hạn trả</label>
              <input type="date" value={dueDate} min={borrowDate} onChange={(e) => { setDueTouched(true); setDueDate(e.target.value); }} required />
            </div>
          </div>
          <textarea rows="2" placeholder="Ghi chú (không bắt buộc)" value={note} onChange={(e) => setNote(e.target.value)} />
          {rules && (
            <p className="hint">
              Quy định: mượn mặc định {rules.loanDays} ngày, tối đa {rules.maxBooks} cuốn/người, gia hạn +{rules.renewDays} ngày
              (tối đa {rules.maxRenewals} lần), phạt trễ {Number(rules.lateFeePerDay).toLocaleString("vi-VN")} ₫/cuốn/ngày.
            </p>
          )}
        </div>

        <div className="card form">
          <h2>3. Chọn sách</h2>
          <input placeholder="Tìm sách theo tên, tác giả..." value={bq} onChange={(e) => setBq(e.target.value)} />
          {books.length > 0 && (
            <ul className="pick-list">
              {books.map((b) => (
                <li key={b._id}>
                  <button type="button" disabled={b.quantity < 1} onClick={() => addBook(b)}>
                    <BookCover book={b} className="thumb" />
                    <span>
                      {b.title} <span className="muted small">· {b.author}</span>
                      <div className="small">{b.quantity > 0 ? `Còn ${b.quantity} cuốn` : <span style={{ color: "#c92a2a" }}>Hết sách</span>}</div>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <h3 style={{ margin: "8px 0 0" }}>Sách trong phiếu ({totalQty})</h3>
          {items.length === 0 && <p className="muted small">Chưa chọn cuốn nào.</p>}
          {items.map((i) => (
            <div className="picked" key={i.book._id}>
              <BookCover book={i.book} className="thumb" />
              <div style={{ flex: 1 }}>
                <b>{i.book.title}</b>
                <div className="muted small">Trong kho: {i.book.quantity}</div>
              </div>
              <input className="qty" type="number" min="1" max={i.book.quantity} value={i.qty} onChange={(e) => setQty(i.book._id, Number(e.target.value))} />
              <button type="button" className="btn danger" onClick={() => removeBook(i.book._id)}>Xóa</button>
            </div>
          ))}
          {rules && totalQty > rules.maxBooks && <div className="error">Vượt quá {rules.maxBooks} cuốn cho một người mượn.</div>}

          <button className="btn primary" type="submit" disabled={busy}>
            {busy ? "Đang tạo..." : "Tạo phiếu mượn"}
          </button>
        </div>
      </form>
    </div>
  );
}
