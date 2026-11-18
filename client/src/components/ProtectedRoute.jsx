import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import Forbidden from "../pages/Forbidden.jsx";
import Navbar from "./Navbar.jsx";

// adminOnly: chỉ quản trị viên được vào; người dùng thường thấy trang 403 (kèm thanh menu người dùng)
export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="empty">Đang tải...</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== "admin") {
    return (
      <>
        <Navbar />
        <main className="container"><Forbidden /></main>
      </>
    );
  }
  return children;
}
