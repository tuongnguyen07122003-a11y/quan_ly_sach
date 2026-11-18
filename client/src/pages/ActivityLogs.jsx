import { useEffect, useState } from "react";
import { getLogs } from "../api.js";

export default function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    getLogs().then(setLogs).catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <h1>Nhật ký hoạt động</h1>
      {error && <div className="error">{error}</div>}
      <div className="card">
        <table>
          <thead>
            <tr><th>Thời gian</th><th>Người thực hiện</th><th>Hành động</th><th>Chi tiết</th></tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l._id}>
                <td>{new Date(l.createdAt).toLocaleString("vi-VN")}</td>
                <td>{l.userName || "—"}</td>
                <td><span className="badge">{l.action}</span></td>
                <td className="muted">{l.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && <p className="empty">Chưa có hoạt động nào.</p>}
      </div>
    </div>
  );
}
