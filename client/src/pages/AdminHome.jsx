import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { getAdminSummary } from "../api.js";
import BookCover from "../components/BookCover.jsx";
import { money, statusInfo, METHOD_LABEL } from "../utils/format.js";

function StatLink({ to, label, value, sub, danger }) {
  return (
    <Link to={to} className={`stat card stat-link ${danger ? "danger" : ""}`}>
      <div className="stat-value">{value}</div>
      <div className="small">{label}</div>
      {sub && <div className="muted small">{sub}</div>}
    </Link>
  );
}

function Panel({ title, to, linkText = "Xem tất cả", children }) {
  return (
    <section className="card panel">
      <div className="panel-head">
        <h2>{title}</h2>
        {to && <Link to={to} className="small">{linkText} →</Link>}
      </div>
      {children}
    </section>
  );
}

// Trang chủ của quản trị viên: bảng điều khiển tổng quan
export default function AdminHome() {
  const { user } = useAuth();
  const [d, setD] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getAdminSummary().then(setD).catch((e) => setError(e.message));
  }, []);

  const today = new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 style={{ marginBottom: 2 }}>Xin chào, {user.name} 👋</h1>
          <div className="muted small" style={{ marginBottom: 12 }}>{today}</div>
        </div>
        <div className="row" style={{ flex: "none" }}>
          <Link to="/admin/loans/new" className="btn primary" style={{ textDecoration: "none" }}>+ Tạo phiếu mượn</Link>
          <Link to="/admin/books" className="btn" style={{ textDecoration: "none" }}>+ Thêm sách</Link>
        </div>
      </div>

      {error && <div className="error">{error}</div>}
      {!d && !error && <p className="empty">Đang tải...</p>}

      {d && (
        <>
          <div className="stats stats-wide">
            <StatLink to="/admin/books" label="Đầu sách" value={d.books.titles} sub={`${d.books.stock} cuốn trong kho`} />
            <StatLink to="/admin/books" label="Đầu sách hết hàng" value={d.books.outOfStock} danger={d.books.outOfStock > 0} />
            <StatLink to="/admin/users" label="Người dùng" value={d.users.total} sub={`+${d.users.newThisWeek} trong 7 ngày`} />
            <StatLink to="/admin/orders" label="Đơn chờ xử lý" value={d.orders.pending} sub={`${d.orders.total} đơn tất cả`} danger={d.orders.pending > 0} />
            <StatLink to="/admin/transactions" label="Doanh thu (đã thanh toán)" value={money(d.orders.revenue)} sub={`Hôm nay: ${money(d.orders.revenueToday)}`} />
            <StatLink to="/admin/loans" label="Sách đang được mượn" value={d.loans.borrowedBooks} sub={`${d.loans.borrowingSlips} phiếu`} />
            <StatLink to="/admin/loans" label="Sách quá hạn" value={d.loans.overdueBooks} sub={`${d.loans.overdueSlips} phiếu`} danger={d.loans.overdueBooks > 0} />
            <StatLink to="/admin/loans" label="Phạt/bồi thường chưa thu" value={money(d.loans.unpaidFines)} danger={d.loans.unpaidFines > 0} />
          </div>

          <div className="panels">
            <Panel title="⏰ Sách quá hạn cần xử lý" to="/admin/loans">
              {d.overdueList.length === 0 ? (
                <p className="empty small">Không có sách nào quá hạn 🎉</p>
              ) : (
                <table>
                  <tbody>
                    {d.overdueList.map((l) => (
                      <tr key={l.loanId}>
                        <td className="nw"><Link to={`/admin/loans/${l.loanId}`}>{l.code}</Link></td>
                        <td>{l.borrowerName}<div className="muted small">{l.titles.join(", ")}</div></td>
                        <td className="nw"><span className="badge off">Quá hạn {l.daysOverdue} ngày</span></td>
                        <td className="small nw">{money(l.estimatedLateFee)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Panel>

            <Panel title="🧾 Đơn hàng gần đây" to="/admin/orders">
              {d.recentOrders.length === 0 ? (
                <p className="empty small">Chưa có đơn hàng nào.</p>
              ) : (
                <table>
                  <tbody>
                    {d.recentOrders.map((o) => {
                      const st = statusInfo(o);
                      return (
                        <tr key={o._id}>
                          <td className="nw">#{String(o._id).slice(-6).toUpperCase()}<div className="muted small">{new Date(o.createdAt).toLocaleDateString("vi-VN")}</div></td>
                          <td>{o.userName}<div className="muted small">{METHOD_LABEL[o.paymentMethod]}</div></td>
                          <td className="nw">{money(o.total)}</td>
                          <td className="nw"><span className={`badge ${st.cls}`}>{st.text}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </Panel>

            <Panel title="📉 Sách sắp hết" to="/admin/books" linkText="Quản lý sách">
              {d.lowStock.length === 0 ? (
                <p className="empty small">Kho sách đang đầy đủ.</p>
              ) : (
                <table>
                  <tbody>
                    {d.lowStock.map((b) => (
                      <tr key={b._id}>
                        <td>
                          <div className="with-thumb">
                            <BookCover book={b} className="thumb" />
                            <div>{b.title}<div className="muted small">{b.author}</div></div>
                          </div>
                        </td>
                        <td className="nw"><span className={`badge ${b.quantity === 0 ? "off" : "warn"}`}>{b.quantity === 0 ? "Hết sách" : `Còn ${b.quantity}`}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Panel>

            <Panel title="📝 Hoạt động gần đây" to="/admin/logs">
              {d.activity.length === 0 ? (
                <p className="empty small">Chưa có hoạt động nào.</p>
              ) : (
                <ul className="plain-list activity">
                  {d.activity.map((a) => (
                    <li key={a._id}>
                      <span className="badge">{a.action}</span> <span className="small">{a.detail}</span>
                      <div className="muted small">{a.userName || "—"} · {new Date(a.createdAt).toLocaleString("vi-VN")}</div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
