import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getLoanStats, getLoanItems, getLoans } from "../api.js";
import BookCover from "../components/BookCover.jsx";
import { money, fmtDate, loanBadge, dueBadge } from "../utils/format.js";

const TABS = [
  ["active", "Sách đang mượn"],
  ["overdue", "Quá hạn"],
  ["all", "Tất cả phiếu"],
];

function Stat({ label, value, danger }) {
  return (
    <div className={`stat card ${danger ? "danger" : ""}`}>
      <div className="stat-value">{value}</div>
      <div className="muted small">{label}</div>
    </div>
  );
}

export default function ManageLoans() {
  const [tab, setTab] = useState("active");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getLoanStats().then(setStats).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const data = tab === "all" ? await getLoans(status, q) : await getLoanItems(tab, q);
        if (!cancelled) {
          setRows(data);
          setError("");
        }
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [tab, q, status]);

  const switchTab = (t) => {
    setRows([]);
    setTab(t);
  };

  return (
    <div>
      <div className="page-head">
        <h1>Quản lý mượn trả sách</h1>
        <Link to="/admin/loans/new" className="btn primary" style={{ textDecoration: "none" }}>+ Tạo phiếu mượn</Link>
      </div>
      {error && <div className="error">{error}</div>}

      {stats && (
        <div className="stats">
          <Stat label="Phiếu đang mượn" value={stats.borrowingSlips} />
          <Stat label="Sách đang được mượn" value={stats.borrowedBooks} />
          <Stat label="Phiếu quá hạn" value={stats.overdueSlips} danger={stats.overdueSlips > 0} />
          <Stat label="Sách quá hạn" value={stats.overdueBooks} danger={stats.overdueBooks > 0} />
          <Stat label="Phạt tạm tính (đang quá hạn)" value={money(stats.estimatedLateFees)} />
          <Stat label="Phạt/bồi thường chưa thu" value={money(stats.unpaidFines)} danger={stats.unpaidFines > 0} />
        </div>
      )}

      <div className="tabs">
        {TABS.map(([key, label]) => (
          <button key={key} className={`tab ${tab === key ? "active" : ""}`} onClick={() => switchTab(key)}>
            {label}
          </button>
        ))}
      </div>

      <div className="row filter-row">
        <input className="search" placeholder="Tìm theo mã phiếu, người mượn, tên sách..." value={q} onChange={(e) => setQ(e.target.value)} />
        {tab === "all" && (
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ flex: "0 0 180px" }}>
            <option value="all">Mọi trạng thái</option>
            <option value="borrowing">Đang mượn</option>
            <option value="completed">Hoàn tất</option>
            <option value="cancelled">Đã hủy</option>
          </select>
        )}
      </div>

      <div className="card">
        {tab !== "all" ? (
          <table>
            <thead>
              <tr>
                <th>Mã phiếu</th><th>Sách</th><th>Người mượn</th><th>Ngày mượn</th><th>Hạn trả</th><th>Tình trạng</th>
                {tab === "overdue" && <th>Phạt tạm tính</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const b = dueBadge(r.dueDate, r.overdue, r.daysOverdue);
                return (
                  <tr key={`${r.loanId}-${r.itemId}`}>
                    <td><Link to={`/admin/loans/${r.loanId}`}>{r.code}</Link></td>
                    <td>
                      <div className="with-thumb">
                        <BookCover book={r} className="thumb" />
                        <span>{r.title} {r.quantity > 1 && <b>×{r.quantity}</b>}</span>
                      </div>
                    </td>
                    <td>{r.borrowerName}<div className="muted small">{r.borrowerEmail}</div></td>
                    <td>{fmtDate(r.borrowDate)}</td>
                    <td>{fmtDate(r.dueDate)}{r.renewCount > 0 && <div className="muted small">đã gia hạn {r.renewCount} lần</div>}</td>
                    <td><span className={`badge ${b.cls}`}>{b.text}</span></td>
                    {tab === "overdue" && <td>{money(r.estimatedLateFee)}</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <table>
            <thead>
              <tr><th>Mã phiếu</th><th>Người mượn</th><th>Sách</th><th>Ngày mượn</th><th>Hạn trả</th><th>Trạng thái</th><th>Phạt / bồi thường</th></tr>
            </thead>
            <tbody>
              {rows.map((l) => {
                const b = loanBadge(l);
                return (
                  <tr key={l._id}>
                    <td><Link to={`/admin/loans/${l._id}`}>{l.code}</Link></td>
                    <td>{l.borrowerName}<div className="muted small">{l.borrowerEmail}</div></td>
                    <td>{l.items.map((i) => `${i.title}${i.quantity > 1 ? ` ×${i.quantity}` : ""}`).join(", ")}</td>
                    <td>{fmtDate(l.borrowDate)}</td>
                    <td>{fmtDate(l.dueDate)}</td>
                    <td><span className={`badge ${b.cls}`}>{b.text}</span></td>
                    <td>
                      {l.totalFine > 0
                        ? <>{money(l.totalFine)} <span className={`badge ${l.finePaid ? "ok" : "off"}`}>{l.finePaid ? "đã thu" : "chưa thu"}</span></>
                        : l.estimatedLateFee > 0 ? <span className="muted">~{money(l.estimatedLateFee)}</span> : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {rows.length === 0 && (
          <p className="empty">
            {tab === "overdue" ? "Không có sách nào quá hạn 🎉" : "Không có dữ liệu."}
          </p>
        )}
      </div>
    </div>
  );
}
