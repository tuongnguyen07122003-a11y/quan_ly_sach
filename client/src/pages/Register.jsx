import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import SocialLogin from "../components/SocialLogin.jsx";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) return setError("Mật khẩu phải có ít nhất 6 ký tự");
    if (form.password !== form.confirm) return setError("Mật khẩu nhập lại không khớp");
    setBusy(true);
    try {
      await register({ name: form.name, email: form.email, password: form.password });
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <form className="card auth-card" onSubmit={submit}>
        <h2>Đăng ký tài khoản</h2>
        {error && <div className="error">{error}</div>}
        <input name="name" placeholder="Họ và tên" value={form.name} onChange={change} required />
        <input name="email" type="email" placeholder="Email" value={form.email} onChange={change} required />
        <input name="password" type="password" placeholder="Mật khẩu (tối thiểu 6 ký tự)" value={form.password} onChange={change} required />
        <input name="confirm" type="password" placeholder="Nhập lại mật khẩu" value={form.confirm} onChange={change} required />
        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? "Đang đăng ký..." : "Đăng ký"}
        </button>
        <SocialLogin />
        <p className="muted">Đã có tài khoản? <Link to="/login">Đăng nhập</Link></p>
      </form>
    </div>
  );
}
