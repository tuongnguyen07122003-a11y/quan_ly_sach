import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getLoan, getLoanRules, resolveLoan, renewLoan, cancelLoan, setLoanFinePaid } from "../api.js";
import BookCover from "../components/BookCover.jsx";
import { money, fmtDate, loanBadge, ITEM_STATUS } from "../utils/format.js";

export default function LoanDetail() {
  const { id } = useParams();
  const [loan, setLoan] = useState(null);
  const [rules, setRules] = useState(null);
  const [pending, setPending] = useState({}); // itemId -> { action, compensation, note }
  const [renewDays, setRenewDays] = useState("");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => getLoan(id).then(setLoan).catch((e) => setError(e.message));
  useEffect(() => {
    load();
    getLoanRules().then(setRules).catch(() => {});
  }, [id]);

  if (!loan) return error ? <div className="error">{error}</div> : <p className="empty">Đang tải...</p>;

  const badge = loanBadge(loan);
  const open = loan.items.filter((i) => i.status === "borrowed");
  const active = loan.status === "borrowing";
  const pct = rules?.damagedPercent ?? 50;

  const setPend = (itemId, patch) => setPending((p) => ({ ...p, [itemId]: { ...p[itemId], ...patch } }));
  const suggest = (it, action) => Math.round(action === "lost" ? it.price * it.quantity : (it.price * it.quantity * pct) / 100);

  // Chạy một thao tác gọi API, cập nhật phiếu và hiện thông báo
  const run = async (fn, okMsg) => {
    setBusy(true);
    setError("");
    setMsg("");
    try {
      setLoan(await fn());
      setPending({});
      setMsg(okMsg);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const confirmSelected = () => {
    const items = Object.entries(pending)
      .filter(([, v]) => v.action)
      .map(([itemId, v]) => ({ itemId, action: v.action, compensation: v.compensation, note: v.note }));
    if (items.length === 0) return setError("Hãy chọn thao tác (trả / mất / hư hỏng) cho ít nhất một cuốn");
    if (!confirm(`Xác nhận xử lý ${items.length} cuốn sách đã chọn?`)) return;
    run(() => resolveLoan(id, items), "Đã cập nhật phiếu mượn");
  };

  const returnAll = () => {
    if (!confirm(`Xác nhận khách trả đủ ${open.length} dòng sách còn lại?`)) return;
    run(() => resolveLoan(id, open.map((i) => ({ itemId: i._id, action: "return" }))), "Đã xác nhận trả sách");
  };

  const renew = () => run(() => renewLoan(id, renewDays ? Number(renewDays) : undefined), "Đã gia hạn phiếu mượn");
  const cancel = () => {
    if (confirm("Hủy phiếu mượn này? Sách sẽ được nhập lại kho.")) run(() => cancelLoan(id), "Đã hủy phiếu mượn");
  };
  const toggleFine = () => run(() => setLoanFinePaid(id, !loan.finePaid), loan.finePaid ? "Đã bỏ đánh dấu thu phạt" : "Đã ghi nhận thu tiền phạt");

  return (
    <div>
      <Link to="/admin/loans" className="back">← Quay lại quản lý mượn trả</Link>
      <div className="page-head">
        <h1>Phiếu mượn {loan.code}</h1>
        <span className={`badge big-badge ${badge.cls}`}>{badge.text}</span>
      </div>
      {error && <div className="error">{error}</div>}
      {msg && <div className="success">{msg}</div>}

      <div className="layout loan-layout">
        <div className="card">
          <table className="info-table">
            <tbody>
              <tr><th>Người mượn</th><td><b>{loan.borrowerName}</b><div className="muted small">{loan.borrowerEmail}</div></td></tr>
              <tr><th>Ngày mượn</th><td>{fmtDate(loan.borrowDate)}</td></tr>
              <tr><th>Hạn trả</th><td>{fmtDate(loan.dueDate)}</td></tr>
              <tr><th>Lập bởi</th><td>{loan.createdByName || "—"}</td></tr>
              {loan.completedAt && <tr><th>Hoàn tất lúc</th><td>{new Date(loan.completedAt).toLocaleString("vi-VN")}</td></tr>}
              {loan.note && <tr><th>Ghi chú</th><td>{loan.note}</td></tr>}
            </tbody>
          </table>
          {loan.renewals.length > 0 && (
            <>
              <h3>Lịch sử gia hạn ({loan.renewals.length})</h3>
              <ul className="plain-list">
                {loan.renewals.map((r, i) => (
                  <li key={i} className="small">
                    {fmtDate(r.at)}: {fmtDate(r.previousDue)} → <b>{fmtDate(r.newDue)}</b> <span className="muted">· {r.byName}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="card form">
          <h2>Tiền phạt</h2>
          {loan.overdue && (
            <div className="error">
              Quá hạn <b>{loan.daysOverdue} ngày</b>. Phạt tạm tính nếu trả hôm nay: <b>{money(loan.estimatedLateFee)}</b>
            </div>
          )}
          <div className="total-line">
            <span>Đã phát sinh (phạt + bồi thường)</span>
            <b className="price">{money(loan.totalFine)}</b>
          </div>
          {loan.totalFine > 0 && (
            <button className={`btn ${loan.finePaid ? "" : "primary"}`} disabled={busy} onClick={toggleFine}>
              {loan.finePaid ? "✓ Đã thu (bấm để bỏ đánh dấu)" : "Đánh dấu đã thu tiền"}
            </button>
          )}
          {loan.totalFine === 0 && !loan.overdue && <p className="muted small">Chưa phát sinh khoản phạt nào.</p>}
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>Sách trong phiếu</h2>
        <table>
          <thead>
            <tr><th>Sách</th><th>SL</th><th>Tình trạng</th><th>Xử lý</th></tr>
          </thead>
          <tbody>
            {loan.items.map((it) => {
              const st = ITEM_STATUS[it.status];
              const p = pending[it._id] || {};
              return (
                <tr key={it._id}>
                  <td>
                    <div className="with-thumb">
                      <BookCover book={it} className="thumb" />
                      <div>{it.title}<div className="muted small">Giá: {money(it.price)}</div></div>
                    </div>
                  </td>
                  <td>{it.quantity}</td>
                  <td><span className={`badge ${st.cls}`}>{st.text}</span></td>
                  <td>
                    {it.status === "borrowed" ? (
                      active ? (
                        <div className="resolve-box">
                          <select value={p.action || ""} onChange={(e) => setPend(it._id, { action: e.target.value })}>
                            <option value="">— Chọn thao tác —</option>
                            <option value="return">Trả sách</option>
                            <option value="lost">Báo mất sách</option>
                            <option value="damaged">Báo hư hỏng</option>
                          </select>
                          {(p.action === "lost" || p.action === "damaged") && (
                            <input
                              type="number" min="0" step="1000" value={p.compensation ?? ""}
                              placeholder={`Bồi thường (gợi ý ${money(suggest(it, p.action))})`}
                              onChange={(e) => setPend(it._id, { compensation: e.target.value })}
                            />
                          )}
                          {p.action && (
                            <input placeholder="Ghi chú (ví dụ: rách bìa, ướt...)" value={p.note || ""} onChange={(e) => setPend(it._id, { note: e.target.value })} />
                          )}
                        </div>
                      ) : "—"
                    ) : (
                      <div className="small">
                        {fmtDate(it.resolvedAt)}
                        {it.lateFee > 0 && <div>Phạt trễ: {money(it.lateFee)}</div>}
                        {it.compensation > 0 && <div>Bồi thường: {money(it.compensation)}</div>}
                        {it.note && <div className="muted">{it.note}</div>}
                      </div>
                    )}
                    {it.status === "borrowed" && it.estimatedLateFee > 0 && (
                      <div className="small" style={{ color: "#c92a2a" }}>Phạt trễ tạm tính: {money(it.estimatedLateFee)}</div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {active && open.length > 0 && (
          <div className="row" style={{ marginTop: 14, flexWrap: "wrap" }}>
            <button className="btn primary" disabled={busy} onClick={confirmSelected}>Xác nhận các cuốn đã chọn</button>
            <button className="btn" disabled={busy} onClick={returnAll}>Trả tất cả sách còn lại</button>
          </div>
        )}
        {active && open.length > 0 && (
          <p className="hint" style={{ marginTop: 10 }}>
            Sách được trả sẽ nhập lại kho. Sách báo mất hoặc hư hỏng <b>không</b> nhập lại kho (nếu sách hỏng nhẹ vẫn dùng được, hãy tăng số lượng trong Quản lý sách).
          </p>
        )}
      </div>

      {active && open.length > 0 && (
        <div className="card form" style={{ marginTop: 16 }}>
          <h2>Gia hạn</h2>
          <div className="row">
            <input type="number" min="1" max="30" placeholder={`Số ngày (mặc định ${rules?.renewDays ?? 7})`} value={renewDays} onChange={(e) => setRenewDays(e.target.value)} />
            <button className="btn primary" disabled={busy} onClick={renew}>Gia hạn</button>
          </div>
          <p className="hint">
            Đã gia hạn {loan.renewals.length} lần. Quản trị viên được gia hạn không giới hạn lượt và cả phiếu đã quá hạn
            (khi đó tính từ hôm nay). Người mượn tự gia hạn tối đa {rules?.maxRenewals ?? 2} lần và chỉ khi chưa quá hạn.
          </p>
          {loan.items.every((i) => i.status === "borrowed") && (
            <button className="btn danger" disabled={busy} onClick={cancel}>Hủy phiếu (tạo nhầm)</button>
          )}
        </div>
      )}
    </div>
  );
}
