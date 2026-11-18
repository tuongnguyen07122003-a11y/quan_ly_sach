import { formatVND } from "../utils/format.js";
import BookCover from "./BookCover.jsx";

export default function BookList({ books, onEdit, onDelete }) {
  if (books.length === 0) return <p className="empty">Chưa có sách nào.</p>;

  return (
    <div className="card">
      <table>
        <thead>
          <tr>
            <th>Tên sách</th>
            <th>Tác giả</th>
            <th>Thể loại</th>
            <th>Giá</th>
            <th>SL</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {books.map((b) => (
            <tr key={b._id}>
              <td><div className="with-thumb"><BookCover book={b} className="thumb" /><span>{b.title}</span></div></td>
              <td>{b.author}</td>
              <td>{b.category}</td>
              <td>{formatVND(b.price)}</td>
              <td>{b.quantity}</td>
              <td className="actions">
                <button className="btn" onClick={() => onEdit(b)}>Sửa</button>
                <button className="btn danger" onClick={() => onDelete(b._id)}>Xóa</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
