import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";
import { createOrder, getPayUrl } from "../api.js";
import { formatVND } from "../utils/format.js";
import BookCover from "../components/BookCover.jsx";

export default function Cart() {
  const { user } = useAuth();
  const { items, setQty, remove, clear, total } = useCart();
  const navigate = useNavigate();
  const [method, setMethod] = useState("vnpay");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (items.length === 0) {
    return (
      <div className="empty">
        <p>Giỏ hàng của bạn đang trống.</p>
        <Link to="/" className="btn primary" style={{ textDecoration: "none" }}>Tìm sách</Link>
      </div>
    );
  }

  const checkout = async () => {
    if (!user) return navigate("/login");
    setBusy(true);
    setError("");
    let order;
    try {
      order = await createOrder({
        items: items.map((i) => ({ bookId: i._id, quantity: i.qty })),
        paymentMethod: method,
      });
    } catch (e) {
      setError(e.message);
      setBusy(false);
      return;
    }
    clear();
    if (method === "cod") return navigate("/orders");
    try {
      const { url } = await getPayUrl(order._id, method);
      window.location.href = url; // chuyển sang trang thanh toán của VNPay/MoMo
    } catch (e) {
      navigate("/orders", { state: { error: `Đơn hàng đã được tạo nhưng chưa thể thanh toán: ${e.message}` } });
    }
  };

  return (
    <div>
      <h1>Giỏ hàng</h1>
      {error && <div className="error">{error}</div>}
      <div className="layout cart-layout">
        <div className="card">
          <table>
            <thead>
              <tr><th>Sách</th><th>Đơn giá</th><th>Số lượng</th><th>Thành tiền</th><th></th></tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i._id}>
                  <td>
                    <div className="with-thumb">
                      <BookCover book={i} className="thumb" />
                      <div>
                        <Link to={`/books/${i._id}`}>{i.title}</Link>
                        <div className="muted small">{i.author}</div>
                      </div>
                    </div>
                  </td>
                  <td>{formatVND(i.price)}</td>
                  <td>
                    <input
                      className="qty"
                      type="number"
                      min="1"
                      max={i.stock}
                      value={i.qty}
                      onChange={(e) => setQty(i._id, Number(e.target.value) || 1)}
                    />
                  </td>
                  <td>{formatVND(i.price * i.qty)}</td>
                  <td className="actions">
                    <button className="btn danger" onClick={() => remove(i._id)}>Xóa</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card form">
          <h2>Thanh toán</h2>
          <div className="total-line">
            <span>Tổng cộng</span>
            <b className="price big">{formatVND(total)}</b>
          </div>
          <label className="radio">
            <input type="radio" checked={method === "vnpay"} onChange={() => setMethod("vnpay")} />
            Thanh toán online qua VNPay
          </label>
          <label className="radio">
            <input type="radio" checked={method === "momo"} onChange={() => setMethod("momo")} />
            Thanh toán online qua ví MoMo
          </label>
          <label className="radio">
            <input type="radio" checked={method === "cod"} onChange={() => setMethod("cod")} />
            Thanh toán khi nhận hàng (COD)
          </label>
          <button className="btn primary" onClick={checkout} disabled={busy}>
            {busy ? "Đang xử lý..." : user ? "Đặt hàng" : "Đăng nhập để đặt hàng"}
          </button>
        </div>
      </div>
    </div>
  );
}
