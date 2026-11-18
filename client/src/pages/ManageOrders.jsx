import { useEffect, useState } from "react";
import { getAllOrders, updateOrderStatus } from "../api.js";
import { formatVND, METHOD_LABEL, statusInfo } from "../utils/format.js";

export default function ManageOrders() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");

  const load = () =>
    getAllOrders()
      .then((o) => { setOrders(o); setError(""); })
      .catch((e) => setError(e.message));

  useEffect(() => { load(); }, []);

  const changeStatus = async (id, status) => {
    try {
      await updateOrderStatus(id, status);
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div>
      <h1>Quản lý đơn hàng</h1>
      {error && <div className="error">{error}</div>}
      <div className="card">
        <table>
          <thead>
            <tr><th>Mã</th><th>Khách hàng</th><th>Sách</th><th>Tổng tiền</th><th>Thanh toán</th><th>Trạng thái</th></tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const st = statusInfo(o);
              return (
                <tr key={o._id}>
                  <td>#{o._id.slice(-6).toUpperCase()}<div className="muted small">{new Date(o.createdAt).toLocaleDateString("vi-VN")}</div></td>
                  <td>{o.user?.name || "—"}<div className="muted small">{o.user?.email}</div></td>
                  <td>{o.items.map((i) => `${i.title} ×${i.quantity}`).join(", ")}</td>
                  <td>{formatVND(o.total)}</td>
                  <td>{METHOD_LABEL[o.paymentMethod]}</td>
                  <td>
                    <span className={`badge ${st.cls}`}>{st.text}</span>{" "}
                    <select
                      value={["pending", "paid", "cancelled"].includes(o.status) ? o.status : "pending"}
                      onChange={(e) => changeStatus(o._id, e.target.value)}
                    >
                      <option value="pending">Chờ xử lý</option>
                      <option value="paid">Đã thanh toán</option>
                      <option value="cancelled">Đã hủy</option>
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {orders.length === 0 && <p className="empty">Chưa có đơn hàng nào.</p>}
      </div>
    </div>
  );
}
