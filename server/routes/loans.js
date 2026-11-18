import { Router } from "express";
import Loan from "../models/Loan.js";
import Book from "../models/Book.js";
import User from "../models/User.js";
import { protect, adminOnly } from "../middleware/auth.js";
import { logActivity } from "../utils/activity.js";
import { rules, present, computeLoanDates, computeRenewal, applyResolutions } from "../utils/loanRules.js";

const router = Router();
router.use(protect);

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const money = (n) => `${Number(n).toLocaleString("vi-VN")} ₫`;
const findLoan = (id) => Loan.findById(id).catch(() => null);

// Quy tắc đang áp dụng (để giao diện hiển thị gợi ý)
router.get("/rules", (req, res) => res.json(rules()));

// Phiếu mượn của chính mình
router.get("/mine", async (req, res) => {
  try {
    const list = await Loan.find({ borrower: req.user._id }).sort({ createdAt: -1 });
    res.json(list.map((l) => present(l)));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ===== Admin: thống kê nhanh =====
router.get("/stats", adminOnly, async (req, res) => {
  try {
    const now = new Date();
    const hasFine = { $or: [{ "items.lateFee": { $gt: 0 } }, { "items.compensation": { $gt: 0 } }] };
    const loans = await Loan.find({
      $or: [{ status: "borrowing" }, { status: "completed", finePaid: false, ...hasFine }],
    });
    const s = { borrowingSlips: 0, borrowedBooks: 0, overdueSlips: 0, overdueBooks: 0, estimatedLateFees: 0, unpaidFines: 0 };
    for (const l of loans) {
      const p = present(l, now);
      if (p.status === "borrowing") {
        s.borrowingSlips++;
        s.borrowedBooks += p.outstanding;
        if (p.overdue) {
          s.overdueSlips++;
          s.overdueBooks += p.outstanding;
          s.estimatedLateFees += p.estimatedLateFee;
        }
      }
      if (!p.finePaid) s.unpaidFines += p.totalFine;
    }
    res.json(s);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ===== Admin: theo dõi từng cuốn sách đang được mượn / quá hạn =====
router.get("/items", adminOnly, async (req, res) => {
  try {
    const scope = req.query.scope === "overdue" ? "overdue" : "active";
    const q = String(req.query.q || "").trim().toLowerCase();
    const now = new Date();
    let rows = [];
    for (const loan of await Loan.find({ status: "borrowing" })) {
      const p = present(loan, now);
      for (const it of p.items) {
        if (it.status !== "borrowed") continue;
        rows.push({
          loanId: p._id, code: p.code, borrowerName: p.borrowerName, borrowerEmail: p.borrowerEmail,
          itemId: it._id, title: it.title, image: it.image, quantity: it.quantity,
          borrowDate: p.borrowDate, dueDate: p.dueDate, overdue: p.overdue, daysOverdue: p.daysOverdue,
          estimatedLateFee: it.estimatedLateFee, renewCount: p.renewals.length,
        });
      }
    }
    if (scope === "overdue") rows = rows.filter((r) => r.overdue);
    if (q) {
      rows = rows.filter((r) => [r.title, r.borrowerName, r.borrowerEmail, r.code].some((v) => String(v || "").toLowerCase().includes(q)));
    }
    rows.sort(scope === "overdue" ? (a, b) => b.daysOverdue - a.daysOverdue : (a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ===== Admin: danh sách phiếu =====
router.get("/", adminOnly, async (req, res) => {
  try {
    const { status = "all", q = "" } = req.query;
    const filter = {};
    if (["borrowing", "completed", "cancelled"].includes(status)) filter.status = status;
    if (q) {
      const rx = { $regex: escapeRegex(String(q)), $options: "i" };
      filter.$or = [{ code: rx }, { borrowerName: rx }, { borrowerEmail: rx }, { "items.title": rx }];
    }
    const list = await Loan.find(filter).sort({ createdAt: -1 }).limit(300);
    res.json(list.map((l) => present(l)));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ===== Admin: tạo phiếu mượn =====
router.post("/", adminOnly, async (req, res) => {
  const done = []; // các cuốn đã trừ kho (để hoàn lại nếu có lỗi)
  try {
    const { borrowerId, items, borrowDate, dueDate, note } = req.body;
    const r = rules();
    const now = new Date();

    const borrower = await User.findById(borrowerId).catch(() => null);
    if (!borrower) return res.status(400).json({ message: "Vui lòng chọn người mượn" });
    if (!borrower.active) return res.status(400).json({ message: "Tài khoản người mượn đang bị khóa" });

    // Gộp số lượng theo từng sách
    const wanted = new Map();
    for (const it of Array.isArray(items) ? items : []) {
      const qty = Math.floor(Number(it.quantity));
      if (!it.bookId || !(qty >= 1)) return res.status(400).json({ message: "Số lượng không hợp lệ" });
      wanted.set(String(it.bookId), (wanted.get(String(it.bookId)) || 0) + qty);
    }
    if (wanted.size === 0) return res.status(400).json({ message: "Vui lòng chọn ít nhất một cuốn sách" });
    const newQty = [...wanted.values()].reduce((a, b) => a + b, 0);

    // Quy tắc người mượn: không đang có sách quá hạn, không vượt số cuốn tối đa
    let held = 0;
    let hasOverdue = false;
    for (const l of await Loan.find({ borrower: borrower._id, status: "borrowing" })) {
      const open = l.items.filter((i) => i.status === "borrowed");
      held += open.reduce((s, i) => s + i.quantity, 0);
      if (open.length > 0 && l.dueDate < now) hasOverdue = true;
    }
    if (hasOverdue) {
      return res.status(400).json({ message: `${borrower.name} đang có sách quá hạn chưa trả, cần trả trước khi mượn thêm` });
    }
    if (held + newQty > r.maxBooks) {
      return res.status(400).json({ message: `Mỗi người chỉ được mượn tối đa ${r.maxBooks} cuốn cùng lúc (đang giữ ${held} cuốn)` });
    }

    const dates = computeLoanDates({ borrowDate, dueDate }, now, r);
    if (dates.error) return res.status(400).json({ message: dates.error });

    const loanItems = [];
    for (const [bookId, qty] of wanted) {
      const book = await Book.findById(bookId).catch(() => null);
      if (!book) return res.status(400).json({ message: "Có sách không còn tồn tại" });
      if (book.quantity < qty) return res.status(400).json({ message: `"${book.title}" chỉ còn ${book.quantity} cuốn trong kho` });
      loanItems.push({ book: book._id, title: book.title, image: book.image, price: book.price, quantity: qty });
    }

    // Trừ kho từng cuốn (có điều kiện đủ số lượng); lỗi thì hoàn lại
    for (const it of loanItems) {
      const rs = await Book.updateOne({ _id: it.book, quantity: { $gte: it.quantity } }, { $inc: { quantity: -it.quantity } });
      if (rs.modifiedCount !== 1) throw new Error(`"${it.title}" không đủ số lượng trong kho`);
      done.push(it);
    }

    const loan = await Loan.create({
      borrower: borrower._id, borrowerName: borrower.name, borrowerEmail: borrower.email,
      createdBy: req.user._id, createdByName: req.user.name,
      items: loanItems, borrowDate: dates.borrowDate, dueDate: dates.dueDate,
      note: String(note || "").trim().slice(0, 500),
    });
    logActivity(req, "Tạo phiếu mượn", "loan", loan._id, `${loan.code} · ${borrower.name} · ${newQty} cuốn`);
    res.status(201).json(present(loan));
  } catch (err) {
    for (const d of done) await Book.updateOne({ _id: d.book }, { $inc: { quantity: d.quantity } }).catch(() => {});
    res.status(400).json({ message: err.message });
  }
});

// ===== Xem chi tiết (admin hoặc chính người mượn) =====
router.get("/:id", async (req, res) => {
  try {
    const loan = await findLoan(req.params.id);
    if (!loan) return res.status(404).json({ message: "Không tìm thấy phiếu mượn" });
    if (req.user.role !== "admin" && String(loan.borrower) !== String(req.user._id)) {
      return res.status(403).json({ message: "Bạn không có quyền xem phiếu này" });
    }
    res.json(present(loan));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ===== Admin: xác nhận trả / báo mất / báo hư hỏng =====
router.post("/:id/resolve", adminOnly, async (req, res) => {
  try {
    const loan = await findLoan(req.params.id);
    if (!loan) return res.status(404).json({ message: "Không tìm thấy phiếu mượn" });
    if (loan.status !== "borrowing") return res.status(400).json({ message: "Phiếu này đã hoàn tất hoặc đã hủy" });
    const list = Array.isArray(req.body.items) ? req.body.items : [];
    if (list.length === 0) return res.status(400).json({ message: "Chưa chọn sách nào để xử lý" });

    const now = new Date();
    const result = applyResolutions(loan, list, now, rules());
    if (result.error) return res.status(400).json({ message: result.error });

    // Có phát sinh phạt mới -> đánh dấu chưa thu
    if (result.resolved.some(({ item }) => item.lateFee + item.compensation > 0)) loan.finePaid = false;
    if (loan.items.every((i) => i.status !== "borrowed")) {
      loan.status = "completed";
      loan.completedAt = now;
    }
    await loan.save();

    // Sách được trả thì nhập lại kho (mất / hỏng thì không)
    for (const s of result.restock) await Book.updateOne({ _id: s.book }, { $inc: { quantity: s.quantity } });

    const LABEL = { return: "Trả sách", lost: "Báo mất sách", damaged: "Báo hư hỏng sách" };
    for (const { item, action } of result.resolved) {
      const fee = item.lateFee + item.compensation;
      logActivity(req, LABEL[action], "loan", loan._id, `${loan.code} · ${item.title}${fee ? ` · phạt/bồi thường ${money(fee)}` : ""}`);
    }
    res.json(present(loan));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ===== Gia hạn (admin hoặc chính người mượn) =====
router.post("/:id/renew", async (req, res) => {
  try {
    const loan = await findLoan(req.params.id);
    if (!loan) return res.status(404).json({ message: "Không tìm thấy phiếu mượn" });
    const isAdmin = req.user.role === "admin";
    if (!isAdmin && String(loan.borrower) !== String(req.user._id)) {
      return res.status(403).json({ message: "Bạn không có quyền gia hạn phiếu này" });
    }
    const now = new Date();
    const plan = computeRenewal(loan, { isAdmin, days: req.body.days }, now, rules());
    if (plan.error) return res.status(400).json({ message: plan.error });

    loan.renewals.push({ at: now, previousDue: plan.previousDue, newDue: plan.newDue, by: req.user._id, byName: req.user.name });
    loan.dueDate = plan.newDue;
    await loan.save();
    logActivity(req, "Gia hạn phiếu mượn", "loan", loan._id, `${loan.code} · +${plan.days} ngày`);
    res.json(present(loan));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ===== Admin: hủy phiếu tạo nhầm (chỉ khi chưa xử lý cuốn nào) =====
router.post("/:id/cancel", adminOnly, async (req, res) => {
  try {
    const loan = await findLoan(req.params.id);
    if (!loan) return res.status(404).json({ message: "Không tìm thấy phiếu mượn" });
    if (loan.status !== "borrowing" || loan.items.some((i) => i.status !== "borrowed")) {
      return res.status(400).json({ message: "Chỉ hủy được phiếu chưa trả cuốn nào" });
    }
    loan.status = "cancelled";
    await loan.save();
    for (const it of loan.items) await Book.updateOne({ _id: it.book }, { $inc: { quantity: it.quantity } });
    logActivity(req, "Hủy phiếu mượn", "loan", loan._id, loan.code);
    res.json(present(loan));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ===== Admin: đánh dấu đã thu / chưa thu tiền phạt =====
router.post("/:id/fine", adminOnly, async (req, res) => {
  try {
    const loan = await findLoan(req.params.id);
    if (!loan) return res.status(404).json({ message: "Không tìm thấy phiếu mượn" });
    const p = present(loan);
    if (p.totalFine <= 0) return res.status(400).json({ message: "Phiếu này chưa có tiền phạt hay bồi thường" });
    loan.finePaid = Boolean(req.body.paid);
    await loan.save();
    logActivity(req, loan.finePaid ? "Thu tiền phạt" : "Bỏ đánh dấu thu phạt", "loan", loan._id, `${loan.code} · ${money(p.totalFine)}`);
    res.json(present(loan));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

export default router;
