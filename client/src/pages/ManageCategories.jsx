import { useEffect, useState } from "react";
import { getCategories, createCategory, updateCategory, deleteCategory } from "../api.js";

export default function ManageCategories() {
  const [cats, setCats] = useState([]);
  const [form, setForm] = useState({ name: "", description: "" });
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");

  const load = () =>
    getCategories().then((c) => { setCats(c); setError(""); }).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (editing) await updateCategory(editing._id, form);
      else await createCategory(form);
      setForm({ name: "", description: "" });
      setEditing(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const startEdit = (c) => {
    setEditing(c);
    setForm({ name: c.name, description: c.description || "" });
  };

  const remove = async (c) => {
    if (!confirm(`Xóa thể loại "${c.name}"?`)) return;
    try {
      await deleteCategory(c._id);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <h1>Quản lý thể loại</h1>
      {error && <div className="error">{error}</div>}
      <div className="layout">
        <form className="card form" onSubmit={submit}>
          <h2>{editing ? "Sửa thể loại" : "Thêm thể loại"}</h2>
          <input name="name" placeholder="Tên thể loại *" value={form.name} onChange={change} required />
          <textarea name="description" rows="3" placeholder="Mô tả" value={form.description} onChange={change} />
          <div className="row">
            <button className="btn primary" type="submit">{editing ? "Cập nhật" : "Thêm"}</button>
            {editing && (
              <button type="button" className="btn" onClick={() => { setEditing(null); setForm({ name: "", description: "" }); }}>
                Hủy
              </button>
            )}
          </div>
          {editing && <p className="hint">Đổi tên sẽ tự cập nhật tất cả sách thuộc thể loại này.</p>}
        </form>

        <div className="card">
          <table>
            <thead>
              <tr><th>Thể loại</th><th>Mô tả</th><th>Số sách</th><th></th></tr>
            </thead>
            <tbody>
              {cats.map((c) => (
                <tr key={c._id}>
                  <td>{c.name}</td>
                  <td className="muted">{c.description}</td>
                  <td>{c.bookCount}</td>
                  <td className="actions">
                    <button className="btn" onClick={() => startEdit(c)}>Sửa</button>
                    <button className="btn danger" onClick={() => remove(c)}>Xóa</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {cats.length === 0 && <p className="empty">Chưa có thể loại nào.</p>}
        </div>
      </div>
    </div>
  );
}
