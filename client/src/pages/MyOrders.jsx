import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { getMyOrders, getPayUrl } from "../api.js";
import { formatVND, METHOD_LABEL, statusInfo } from "../utils/format.js";
import BookCover from "../components/BookCover.jsx";

export default function MyOrders() {
  const location = useLocation();
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState(location.state?.error || "");

  useEffect(() => {
    getMyOrders().then(setOrders).catch((e) => setError(e.message));
  }, []);

  const payAgain = async (id, provider) => {
    try {
      const { url } = await getPayUrl(id, provider);
      window.location.href = url;
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div>
      <h1>Đơn hàng của tôi</h1>
      {error && <div className="error">{error}</div>}
      {orders.length === 0 && <p className="empty">Bạn chưa có đơn hàng nào.</p>}
      {orders.map((o) => {
        const st = statusInfo(o);
        const canPay = o.paymentMethod !== "cod" && ["pending", "failed"].includes(o.status);
        return (
          <div className="card order" key={o._id}>
            <div className="order-head">
              <div>
                <b>Đơn #{o._id.slice(-6).toUpperCase()}</b>
                <span className="muted small"> · {new Date(o.createdAt).toLocaleString("vi-VN")}</span>
              </div>
              <span className={`badge ${st.cls}`}>{st.text}</span>
            </div>
            <ul className="order-items">
              {o.items.map((it) => (
                <li key={it._id} className="order-item">
                  <BookCover book={{ title: it.title, image: it.image }} className="thumb" />
                  <span>{it.title} × {it.quantity} <span className="muted">— {formatVND(it.price * it.quantity)}</span></span>
                </li>
              ))}
            </ul>
            <div className="order-foot">
              <span className="muted">{METHOD_LABEL[o.paymentMethod]}</span>
              <b>{formatVND(o.total)}</b>
              {canPay && (
                <>
                  <button className="btn primary" onClick={() => payAgain(o._id, "vnpay")}>Thanh toán VNPay</button>
                  <button className="btn momo" onClick={() => payAgain(o._id, "momo")}>Thanh toán MoMo</button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
