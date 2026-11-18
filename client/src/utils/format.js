export const formatVND = (n) => (n > 0 ? `${Number(n).toLocaleString("vi-VN")} ₫` : "Chưa có giá");

export const METHOD_LABEL = { vnpay: "VNPay", momo: "Ví MoMo", cod: "Thanh toán khi nhận hàng" };

export function statusInfo(order) {
  switch (order.status) {
    case "paid": return { text: "Đã thanh toán", cls: "ok" };
    case "failed": return { text: "Thanh toán thất bại", cls: "off" };
    case "cancelled": return { text: "Đã hủy", cls: "off" };
    default:
      return order.paymentMethod === "cod"
        ? { text: "Chờ giao hàng", cls: "" }
        : { text: "Chờ thanh toán", cls: "" };
  }
}

export const stars = (n) => {
  const r = Math.round(n) || 0;
  return "★".repeat(r) + "☆".repeat(5 - r);
};

export const PAYMENT_STATUS = {
  initiated: { text: "Đã tạo", cls: "" },
  success: { text: "Thành công", cls: "ok" },
  failed: { text: "Thất bại", cls: "off" },
};

// ===== Mượn trả sách =====
export const money = (n) => `${Number(n || 0).toLocaleString("vi-VN")} ₫`;
export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("vi-VN") : "—");

export const ITEM_STATUS = {
  borrowed: { text: "Đang mượn", cls: "" },
  returned: { text: "Đã trả", cls: "ok" },
  lost: { text: "Mất sách", cls: "off" },
  damaged: { text: "Hư hỏng", cls: "warn" },
};

export function loanBadge(loan) {
  if (loan.status === "cancelled") return { text: "Đã hủy", cls: "off" };
  if (loan.status === "completed") return { text: "Hoàn tất", cls: "ok" };
  if (loan.overdue) return { text: `Quá hạn ${loan.daysOverdue} ngày`, cls: "off" };
  return { text: "Đang mượn", cls: "" };
}

export function dueBadge(dueDate, overdue, daysOverdue) {
  if (overdue) return { text: `Quá hạn ${daysOverdue} ngày`, cls: "off" };
  const left = Math.ceil((new Date(dueDate) - Date.now()) / 86400000);
  if (left <= 1) return { text: "Hết hạn hôm nay", cls: "warn" };
  return { text: `Còn ${left} ngày`, cls: left <= 3 ? "warn" : "ok" };
}
