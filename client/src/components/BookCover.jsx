import { useEffect, useState } from "react";

// Ảnh bìa sách; nếu chưa có hoặc lỗi tải thì hiện chữ cái đầu của tên sách
export default function BookCover({ book, className = "" }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [book?.image]);
  const showImg = Boolean(book?.image) && !failed;

  return (
    <div className={`cover ${className} ${showImg ? "has-img" : ""}`}>
      {showImg ? (
        <img src={book.image} alt={book.title} loading="lazy" onError={() => setFailed(true)} />
      ) : (
        (book?.title || "?").charAt(0).toUpperCase()
      )}
    </div>
  );
}
