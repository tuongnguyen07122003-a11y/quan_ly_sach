// Quy tắc mượn trả, tính ngày, tính phạt. Không phụ thuộc database nên dễ kiểm tra.

export const DAY = 86400000;
const VN = 7 * 3600 * 1000; // Việt Nam UTC+7, không có giờ mùa hè

const num = (v, d) => {
  if (v === undefined || v === "") return d;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : d;
};

// Cấu hình trong .env (đọc mỗi lần gọi nên sửa .env + khởi động lại là có hiệu lực)
export function rules() {
  return {
    loanDays: num(process.env.LOAN_DAYS, 14), // số ngày mượn mặc định
    renewDays: num(process.env.RENEW_DAYS, 7), // mỗi lần gia hạn thêm
    maxRenewals: num(process.env.MAX_RENEWALS, 2), // số lần gia hạn tối đa (người mượn tự gia hạn)
    maxBooks: num(process.env.MAX_BOOKS_PER_BORROWER, 5), // số cuốn tối đa mỗi người mượn cùng lúc
    lateFeePerDay: num(process.env.LATE_FEE_PER_DAY, 2000), // phạt mỗi cuốn mỗi ngày trễ (₫)
    damagedPercent: Math.min(100, num(process.env.DAMAGED_COMPENSATION_PERCENT, 50)), // % giá sách khi làm hỏng
  };
}

// ---------- Ngày giờ theo múi giờ Việt Nam ----------
export const ymdVN = (d) => new Date(d.getTime() + VN).toISOString().slice(0, 10);
export const startOfDayVN = (d) => new Date(`${ymdVN(d)}T00:00:00.000+07:00`);
export const endOfDayVN = (d) => new Date(`${ymdVN(d)}T23:59:59.999+07:00`);

// "2026-10-22" hợp lệ -> trả lại chuỗi, sai -> null
export function parseYmd(s) {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T12:00:00+07:00`);
  return !isNaN(d) && ymdVN(d) === s ? s : null;
}

// Số ngày trễ (làm tròn lên): quá hạn 1 giây vẫn tính 1 ngày
export const daysLate = (due, at) => Math.max(0, Math.ceil((new Date(at) - new Date(due)) / DAY));

// Phạt trả muộn = số ngày trễ × mức phạt × số cuốn, tối đa bằng giá sách
export function calcLateFee(item, days, r = rules()) {
  if (days <= 0) return 0;
  const raw = days * r.lateFeePerDay * item.quantity;
  const cap = item.price > 0 ? item.price * item.quantity : r.lateFeePerDay * item.quantity * 30;
  return Math.round(Math.min(raw, cap));
}

// Gợi ý tiền bồi thường: mất = 100% giá, hư hỏng = % theo cấu hình
export function defaultCompensation(item, action, r = rules()) {
  const total = (item.price || 0) * item.quantity;
  return Math.round(action === "lost" ? total : (total * r.damagedPercent) / 100);
}

// ---------- Tạo phiếu: tính ngày mượn + hạn trả ----------
export function computeLoanDates({ borrowDate, dueDate }, now = new Date(), r = rules()) {
  let bd = now;
  if (borrowDate) {
    const ymd = parseYmd(borrowDate);
    if (!ymd) return { error: "Ngày mượn không hợp lệ" };
    bd = ymd === ymdVN(now) ? now : new Date(`${ymd}T08:00:00+07:00`);
    if (bd > now) return { error: "Ngày mượn không được ở tương lai" };
  }
  let due;
  if (dueDate) {
    const ymd = parseYmd(dueDate);
    if (!ymd) return { error: "Hạn trả không hợp lệ" };
    due = new Date(`${ymd}T23:59:59.999+07:00`);
  } else {
    due = endOfDayVN(new Date(bd.getTime() + r.loanDays * DAY));
  }
  if (due <= bd) return { error: "Hạn trả phải sau ngày mượn" };
  if (due - bd > 90 * DAY) return { error: "Thời hạn mượn tối đa 90 ngày" };
  return { borrowDate: bd, dueDate: due };
}

// ---------- Gia hạn ----------
// Người mượn: chỉ khi chưa quá hạn và chưa hết lượt. Admin: không bị giới hạn lượt, gia hạn được cả phiếu quá hạn.
export function computeRenewal(loan, { isAdmin, days }, now = new Date(), r = rules()) {
  if (loan.status !== "borrowing" || !loan.items.some((i) => i.status === "borrowed")) {
    return { error: "Phiếu này không còn sách đang mượn" };
  }
  const due = new Date(loan.dueDate);
  const overdue = due < now;
  if (!isAdmin) {
    if (overdue) return { error: "Phiếu đã quá hạn, vui lòng mang sách đến thư viện để được xử lý" };
    if (loan.renewals.length >= r.maxRenewals) {
      return { error: `Mỗi phiếu chỉ được gia hạn tối đa ${r.maxRenewals} lần` };
    }
  }
  let d = r.renewDays;
  if (isAdmin && days !== undefined && days !== "") d = Math.floor(Number(days));
  if (!Number.isInteger(d) || d < 1 || d > 30) return { error: "Số ngày gia hạn phải từ 1 đến 30" };
  // Phiếu quá hạn: tính từ hôm nay; chưa quá hạn: cộng thêm vào hạn cũ
  const base = overdue ? now : due;
  return { days: d, previousDue: due, newDue: endOfDayVN(new Date(base.getTime() + d * DAY)) };
}

// ---------- Xác nhận trả / báo mất / báo hỏng ----------
// list: [{ itemId, action: "return" | "lost" | "damaged", compensation?, note? }]
// Chỉ sửa trong bộ nhớ; nơi gọi có trách nhiệm lưu. Trả về { error } hoặc { restock, resolved }.
export function applyResolutions(loan, list, now = new Date(), r = rules()) {
  const find = (id) =>
    loan.items.id ? loan.items.id(id) : loan.items.find((i) => String(i._id) === String(id));
  const days = daysLate(loan.dueDate, now);
  const out = { restock: [], resolved: [] };

  for (const it of list) {
    const item = find(it.itemId);
    if (!item) return { error: "Không tìm thấy sách trong phiếu" };
    if (item.status !== "borrowed") return { error: `"${item.title}" đã được xử lý trước đó` };
    if (!["return", "lost", "damaged"].includes(it.action)) return { error: "Thao tác không hợp lệ" };

    item.lateFee = calcLateFee(item, days, r);
    item.resolvedAt = now;
    item.note = String(it.note || "").trim().slice(0, 300);

    if (it.action === "return") {
      item.status = "returned";
      out.restock.push({ book: item.book, quantity: item.quantity }); // sách trả về kho
    } else {
      let c = defaultCompensation(item, it.action, r);
      if (it.compensation !== undefined && it.compensation !== null && it.compensation !== "") {
        c = Number(it.compensation);
        if (!Number.isFinite(c) || c < 0) return { error: "Tiền bồi thường không hợp lệ" };
      }
      item.status = it.action === "lost" ? "lost" : "damaged"; // mất / hỏng: không nhập lại kho
      item.compensation = Math.round(c);
    }
    out.resolved.push({ item, action: it.action });
  }
  return out;
}

// ---------- Thêm các trường tính toán trước khi gửi ra giao diện ----------
export function present(loan, now = new Date(), r = rules()) {
  const o = loan.toObject ? loan.toObject() : JSON.parse(JSON.stringify(loan));
  const open = o.items.filter((i) => i.status === "borrowed");
  const overdue = o.status === "borrowing" && open.length > 0 && new Date(o.dueDate) < now;
  const days = overdue ? daysLate(o.dueDate, now) : 0;

  o.items = o.items.map((i) => ({
    ...i,
    estimatedLateFee: i.status === "borrowed" && overdue ? calcLateFee(i, days, r) : 0,
  }));
  o.outstanding = open.reduce((s, i) => s + i.quantity, 0); // số cuốn chưa trả
  o.overdue = overdue;
  o.daysOverdue = days;
  o.estimatedLateFee = o.items.reduce((s, i) => s + i.estimatedLateFee, 0); // phạt tạm tính nếu trả hôm nay
  o.totalFine = o.items.reduce((s, i) => s + (i.lateFee || 0) + (i.compensation || 0), 0); // đã phát sinh
  o.renewalsLeft = Math.max(0, r.maxRenewals - (o.renewals || []).length);
  return o;
}
