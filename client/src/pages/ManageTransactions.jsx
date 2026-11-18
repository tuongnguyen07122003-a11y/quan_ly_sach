import { useEffect, useState } from "react";
import { getTransactions } from "../api.js";
import { formatVND, METHOD_LABEL, PAYMENT_STATUS } from "../utils/format.js";

export default function ManageTransactions() {
  const [list, setList] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    getTransactions().then(setList).catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <h1>Giao dịch thanh toán</h1>
      {error && <div className="error">{error}</div>}
      <div className="card">
        <table>
          <thead>
            <tr><th>Thời gian</th><th>Đơn hàng</th><th>Khách hàng</th><th>Cổng</th><th>Số tiền</th><th>Trạng thái</th><th>Mã GD</th></tr>
          </thead>
          <tbody>
            {list.map((p) => {
              const st = PAYMENT_STATUS[p.status] || PAYMENT_STATUS.initiated;
              return (
                <tr key={p._id}>
                  <td>{new Date(p.createdAt).toLocaleString("vi-VN")}</td>
                  <td>#{String(p.order?._id || "").slice(-6).toUpperCase()}</td>
                  <td>{p.user?.name || "—"}<div className="muted small">{p.user?.email}</div></td>
                  <td>{METHOD_LABEL[p.provider]}</td>
                  <td>{formatVND(p.amount)}</td>
                  <td>
                    <span className={`badge ${st.cls}`}>{st.text}</span>
                    {p.message && <div className="muted small">{p.message}</div>}
                  </td>
                  <td className="muted small">{p.transactionNo || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {list.length === 0 && <p className="empty">Chưa có giao dịch nào.</p>}
      </div>
    </div>
  );
}
