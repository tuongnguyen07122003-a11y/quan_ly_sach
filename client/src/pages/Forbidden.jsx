import { Link } from "react-router-dom";

export default function Forbidden() {
  return (
    <div className="card auth-card" style={{ margin: "40px auto", textAlign: "center" }}>
      <h2>🚫 Không có quyền truy cập</h2>
      <p className="muted">Trang này chỉ dành cho quản trị viên.</p>
      <Link className="btn primary" to="/" style={{ textDecoration: "none" }}>Về trang chủ</Link>
    </div>
  );
}
