import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { getUsers, updateUser, deleteUser } from "../api.js";
import Avatar from "../components/Avatar.jsx";

export default function ManageUsers() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  const load = async (q = query) => {
    try {
      setUsers(await getUsers(q));
      setError("");
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => load(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const act = async (fn) => {
    try {
      await fn();
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const changeRole = (u, role) => act(() => updateUser(u._id, { role }));
  const toggleActive = (u) => act(() => updateUser(u._id, { active: !u.active }));
  const remove = (u) => {
    if (!confirm(`Xóa người dùng "${u.name}"?`)) return;
    act(() => deleteUser(u._id));
  };

  return (
    <div>
      <h1>Quản lý người dùng</h1>
      {error && <div className="error">{error}</div>}
      <input
        className="search"
        placeholder="Tìm theo tên hoặc email..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Họ tên</th>
              <th>Email</th>
              <th>Vai trò</th>
              <th>Trạng thái</th>
              <th>Ngày tạo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isMe = u._id === me._id;
              return (
                <tr key={u._id}>
                  <td>
                    <div className="with-thumb">
                      <Avatar user={u} size={28} />
                      <span>{u.name} {isMe && <span className="muted">(bạn)</span>}</span>
                    </div>
                  </td>
                  <td>{u.email}</td>
                  <td>
                    <select value={u.role} disabled={isMe} onChange={(e) => changeRole(u, e.target.value)}>
                      <option value="user">Người dùng</option>
                      <option value="admin">Quản trị</option>
                    </select>
                  </td>
                  <td>
                    <span className={`badge ${u.active ? "ok" : "off"}`}>{u.active ? "Hoạt động" : "Đã khóa"}</span>
                  </td>
                  <td>{new Date(u.createdAt).toLocaleDateString("vi-VN")}</td>
                  <td className="actions">
                    <button className="btn" disabled={isMe} onClick={() => toggleActive(u)}>
                      {u.active ? "Khóa" : "Mở khóa"}
                    </button>
                    <button className="btn danger" disabled={isMe} onClick={() => remove(u)}>Xóa</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {users.length === 0 && <p className="empty">Không có người dùng phù hợp.</p>}
      </div>
    </div>
  );
}
