import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";
import Avatar from "./Avatar.jsx";

// Thanh menu của khu vực người dùng. Quản trị viên có thêm nút vào khu vực quản trị riêng.
export default function Navbar() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="navbar">
      <div className="nav-inner">
        <Link to="/" className="brand">📚 Thư viện sách</Link>
        <nav className="nav-links">
          <NavLink to="/" end>Tìm sách</NavLink>
          <NavLink to="/cart">🛒 Giỏ hàng{count > 0 && ` (${count})`}</NavLink>
          {user && <NavLink to="/my-loans">Sách tôi mượn</NavLink>}
          {user && <NavLink to="/orders">Đơn hàng của tôi</NavLink>}
        </nav>
        <div className="nav-user">
          {user ? (
            <>
              {user.role === "admin" && (
                <Link to="/admin" className="btn primary" style={{ textDecoration: "none" }}>⚙️ Trang quản trị</Link>
              )}
              <Link to="/profile" className="hello" title="Tài khoản của tôi">
                <Avatar user={user} size={28} />
                <span>{user.name}</span>
              </Link>
              <button className="btn" onClick={handleLogout}>Đăng xuất</button>
            </>
          ) : (
            <>
              <Link className="btn" to="/login">Đăng nhập</Link>
              <Link className="btn primary" to="/register">Đăng ký</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
