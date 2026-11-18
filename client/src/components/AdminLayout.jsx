import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import Avatar from "./Avatar.jsx";

const LINKS = [
  { to: "/admin", label: "📊 Tổng quan", end: true },
  { to: "/admin/books", label: "📚 Quản lý sách" },
  { to: "/admin/categories", label: "🏷️ Thể loại" },
  { to: "/admin/loans", label: "🔖 Mượn trả sách" },
  { to: "/admin/orders", label: "🧾 Đơn hàng" },
  { to: "/admin/transactions", label: "💳 Giao dịch" },
  { to: "/admin/users", label: "👥 Người dùng" },
  { to: "/admin/logs", label: "📝 Nhật ký" },
];

// Khung giao diện dành riêng cho quản trị viên: thanh bên + nội dung
export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="admin-shell">
      <aside className="admin-side">
        <Link to="/admin" className="admin-brand">⚙️ Quản trị thư viện</Link>
        <nav>
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end}>{l.label}</NavLink>
          ))}
        </nav>
        <Link to="/" className="admin-back">← Xem trang người dùng</Link>
      </aside>

      <div className="admin-body">
        <header className="admin-top">
          <span className="muted small">Khu vực dành cho quản trị viên</span>
          <div className="nav-user">
            <Link to="/profile" className="hello" title="Tài khoản của tôi">
              <Avatar user={user} size={28} />
              <span>{user.name}</span>
              <span className="badge admin">Admin</span>
            </Link>
            <button className="btn" onClick={() => { logout(); navigate("/login"); }}>Đăng xuất</button>
          </div>
        </header>
        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
