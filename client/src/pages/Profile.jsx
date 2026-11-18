import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import ImageUpload from "../components/ImageUpload.jsx";

export default function Profile() {
  const { user, saveProfile } = useAuth();
  const [name, setName] = useState(user.name);
  const [avatar, setAvatar] = useState(user.avatar || "");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    setError("");
    try {
      await saveProfile({ name, avatar });
      setMsg("Đã lưu thay đổi");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <form className="card auth-card" style={{ maxWidth: 460 }} onSubmit={submit}>
        <h2>Tài khoản của tôi</h2>
        {error && <div className="error">{error}</div>}
        {msg && <div className="success">{msg}</div>}
        <label className="field-label">Ảnh đại diện</label>
        <ImageUpload value={avatar} onChange={setAvatar} type="avatar" shape="round" />
        <label className="field-label">Họ và tên</label>
        <input value={name} onChange={(e) => setName(e.target.value)} required />
        <label className="field-label">Email</label>
        <input value={user.email} disabled />
        <p className="muted small">
          Vai trò: <b>{user.role === "admin" ? "Quản trị viên" : "Người dùng"}</b>
        </p>
        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? "Đang lưu..." : "Lưu thay đổi"}
        </button>
      </form>
    </div>
  );
}
