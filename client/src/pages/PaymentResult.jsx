import { Link, useSearchParams } from "react-router-dom";

export default function PaymentResult() {
  const [params] = useSearchParams();
  const ok = params.get("status") === "success";

  return (
    <div className="card auth-card" style={{ margin: "40px auto", textAlign: "center" }}>
      <h2>{ok ? "✅ Thanh toán thành công" : "❌ Thanh toán chưa thành công"}</h2>
      <p className="muted">
        {ok
          ? "Cảm ơn bạn! Đơn hàng đã được xác nhận."
          : "Giao dịch bị hủy hoặc thất bại. Bạn có thể thanh toán lại trong mục Đơn hàng của tôi."}
      </p>
      <Link className="btn primary" to="/orders" style={{ textDecoration: "none" }}>Xem đơn hàng</Link>
    </div>
  );
}
