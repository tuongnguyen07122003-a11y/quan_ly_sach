import { useEffect, useState } from "react";

// Ảnh đại diện tròn; chưa có ảnh thì hiện chữ cái đầu của tên
export default function Avatar({ user, size = 32 }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [user?.avatar]);

  if (user?.avatar && !failed) {
    return (
      <img
        className="avatar"
        style={{ width: size, height: size }}
        src={user.avatar}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.45 }}>
      {(user?.name || "?").charAt(0).toUpperCase()}
    </span>
  );
}
