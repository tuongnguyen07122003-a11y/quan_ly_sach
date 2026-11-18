import { useEffect, useState } from "react";
import { getMyLoans, renewLoan } from "../api.js";
import BookCover from "../components/BookCover.jsx";
import { money, fmtDate, loanBadge, dueBadge, ITEM_STATUS } from "../utils/format.js";

export default function MyLoans() {
  const [loans, setLoans] = useState([]);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const load = () => getMyLoans().then(setLoans).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const renew = async (id) => {
    setError("");
    setMsg("");
    try {
      await renewLoan(id);
      setMsg("Đã gia hạn thành công");
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div>
      <h1>Sách tôi mượn</h1>
      {error && <div className="error">{error}</div>}
      {msg && <div className="success">{msg}</div>}
      {loans.length === 0 && <p className="empty">Bạn chưa có phiếu mượn nào. Liên hệ thủ thư để mượn sách.</p>}

      {loans.map((l) => {
        const b = loanBadge(l);
        const d = dueBadge(l.dueDate, l.overdue, l.daysOverdue);
        const active = l.status === "borrowing";
        const canRenew = active && !l.overdue && l.renewalsLeft > 0;
        return (
          <div className="card order" key={l._id}>
            <div className="order-head">
              <div>
                <b>Phiếu {l.code}</b>
                <span className="muted small"> · mượn ngày {fmtDate(l.borrowDate)}</span>
              </div>
              <span className={`badge ${b.cls}`}>{b.text}</span>
            </div>

            {l.overdue && (
              <div className="error" style={{ margin: "10px 0 0" }}>
                Phiếu đã quá hạn {l.daysOverdue} ngày. Vui lòng mang sách đến trả sớm — tiền phạt tạm tính hiện tại: <b>{money(l.estimatedLateFee)}</b>.
              </div>
            )}

            <ul className="order-items">
              {l.items.map((it) => {
                const st = ITEM_STATUS[it.status];
                return (
                  <li key={it._id} className="order-item">
                    <BookCover book={it} className="thumb" />
                    <span style={{ flex: 1 }}>
                      {it.title} {it.quantity > 1 && <b>×{it.quantity}</b>}
                      {(it.lateFee > 0 || it.compensation > 0) && (
                        <div className="small" style={{ color: "#c92a2a" }}>Phạt/bồi thường: {money(it.lateFee + it.compensation)}</div>
                      )}
                    </span>
                    <span className={`badge ${st.cls}`}>{st.text}</span>
                  </li>
                );
              })}
            </ul>

            <div className="order-foot">
              <span>
                Hạn trả: <b>{fmtDate(l.dueDate)}</b>{" "}
                {active && l.outstanding > 0 && <span className={`badge ${d.cls}`}>{d.text}</span>}
                {l.renewals.length > 0 && <span className="muted small"> · đã gia hạn {l.renewals.length} lần</span>}
              </span>
              {l.totalFine > 0 && (
                <span>
                  Tiền phạt/bồi thường: <b>{money(l.totalFine)}</b>{" "}
                  <span className={`badge ${l.finePaid ? "ok" : "off"}`}>{l.finePaid ? "đã thanh toán" : "chưa thanh toán"}</span>
                </span>
              )}
              {active && l.outstanding > 0 && (
                <button className="btn primary" disabled={!canRenew} onClick={() => renew(l._id)}
                  title={l.overdue ? "Phiếu đã quá hạn" : l.renewalsLeft <= 0 ? "Đã hết lượt gia hạn" : ""}>
                  Gia hạn{canRenew ? ` (còn ${l.renewalsLeft} lần)` : ""}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
