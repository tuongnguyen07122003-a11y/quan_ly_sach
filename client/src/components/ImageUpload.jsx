import { useRef, useState } from "react";
import { uploadImage } from "../api.js";

// Chèn ảnh: chọn từ máy (tải lên server) hoặc dán link ảnh
// type: "book" (admin) | "avatar" (mọi người dùng đã đăng nhập); shape: "cover" | "round"
export default function ImageUpload({ value, onChange, type = "book", shape = "cover", hint }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [broken, setBroken] = useState(false);

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // cho phép chọn lại cùng một file
    if (!file) return;
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) return setError("Chỉ chấp nhận ảnh JPG, PNG, WEBP hoặc GIF");
    if (file.size > 3 * 1024 * 1024) return setError("Ảnh tối đa 3MB");

    setBusy(true);
    setError("");
    try {
      const { url } = await uploadImage(file, type);
      setBroken(false);
      onChange(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const isLocal = (value || "").startsWith("/uploads/");

  return (
    <div className="img-upload">
      <div className={`img-preview ${shape}`}>
        {value && !broken ? (
          <img src={value} alt="Ảnh xem trước" onError={() => setBroken(true)} />
        ) : (
          <span className="muted small">{value ? "Không tải được ảnh" : "Chưa có ảnh"}</span>
        )}
      </div>
      <div className="img-actions">
        <input ref={inputRef} type="file" hidden accept="image/png,image/jpeg,image/webp,image/gif" onChange={pick} />
        <div className="row">
          <button type="button" className="btn" disabled={busy} onClick={() => inputRef.current.click()}>
            {busy ? "Đang tải lên..." : "Chọn ảnh từ máy"}
          </button>
          {value && (
            <button type="button" className="btn danger" onClick={() => { setBroken(false); onChange(""); }}>
              Xóa ảnh
            </button>
          )}
        </div>
        <input
          placeholder="hoặc dán link ảnh (https://...)"
          value={isLocal ? "" : value || ""}
          onChange={(e) => { setBroken(false); onChange(e.target.value.trim()); }}
        />
        {hint && <span className="muted small">{hint}</span>}
        {error && <span className="error-text">{error}</span>}
      </div>
    </div>
  );
}
