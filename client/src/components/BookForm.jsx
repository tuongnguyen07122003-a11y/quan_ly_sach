import { useEffect, useState } from "react";
import { getCategories } from "../api.js";
import ImageUpload from "./ImageUpload.jsx";

const empty = { image: "", title: "", author: "", category: "", year: "", price: "", quantity: 1, description: "" };

export default function BookForm({ editing, onSubmit, onCancel }) {
  const [form, setForm] = useState(empty);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
  }, [editing]);

  useEffect(() => {
    setForm(editing ? { ...empty, ...editing } : empty);
  }, [editing]);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      year: form.year ? Number(form.year) : undefined,
      price: Number(form.price) || 0,
      quantity: Number(form.quantity) || 0,
    });
    if (!editing) setForm(empty);
  };

  return (
    <form className="card form" onSubmit={submit}>
      <h2>{editing ? "Sửa sách" : "Thêm sách mới"}</h2>
      <ImageUpload
        value={form.image}
        onChange={(image) => setForm((f) => ({ ...f, image }))}
        type="book"
        hint="Để trống: hệ thống tự tạo ảnh bìa theo tên sách."
      />
      <input name="title" placeholder="Tên sách *" value={form.title} onChange={change} required />
      <input name="author" placeholder="Tác giả *" value={form.author} onChange={change} required />
      <input name="category" list="category-list" placeholder="Thể loại (chọn hoặc gõ mới)" value={form.category} onChange={change} />
      <datalist id="category-list">
        {categories.map((c) => <option key={c._id} value={c.name} />)}
      </datalist>
      <div className="row">
        <input name="year" type="number" placeholder="Năm XB" value={form.year} onChange={change} />
        <input name="quantity" type="number" min="0" placeholder="Số lượng" value={form.quantity} onChange={change} />
      </div>
      <input name="price" type="number" min="0" step="1000" placeholder="Giá bán (₫)" value={form.price} onChange={change} />
      <textarea name="description" placeholder="Mô tả" rows="3" value={form.description} onChange={change} />
      <div className="row">
        <button type="submit" className="btn primary">{editing ? "Cập nhật" : "Thêm"}</button>
        {editing && <button type="button" className="btn" onClick={onCancel}>Hủy</button>}
      </div>
    </form>
  );
}
