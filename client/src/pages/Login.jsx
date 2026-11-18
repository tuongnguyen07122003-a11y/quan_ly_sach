import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import SocialLogin from "../components/SocialLogin.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const u = await login(form.email, form.password);
      navigate(u.role === "admin" ? "/admin" : "/"); // mỗi vai trò vào trang chủ riêng
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <form className="card auth-card" onSubmit={submit}>
        <h2>Đăng nhập</h2>
        {error && <div className="error">{error}</div>}
        <input name="email" type="email" placeholder="Email" value={form.email} onChange={change} required />
        <input name="password" type="password" placeholder="Mật khẩu" value={form.password} onChange={change} required />
        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>
        <SocialLogin />
        <p className="muted">Chưa có tài khoản? <Link to="/register">Đăng ký</Link></p>
        <p className="hint">
          Admin mặc định: <b>admin@example.com</b> / admin123 (đổi trong server/.env)
        </p>
      </form>
    </div>
  );
}
