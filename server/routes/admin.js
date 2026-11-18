import { Router } from "express";
import Book from "../models/Book.js";
import User from "../models/User.js";
import Order from "../models/Order.js";
import Loan from "../models/Loan.js";
import ActivityLog from "../models/ActivityLog.js";
import { protect, adminOnly } from "../middleware/auth.js";
import { present, startOfDayVN, DAY } from "../utils/loanRules.js";

const router = Router();
router.use(protect, adminOnly);

// Dữ liệu cho trang chủ quản trị (bảng điều khiển tổng quan)
router.get("/summary", async (req, res) => {
  try {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * DAY);
    const today = startOfDayVN(now);
    const hasFine = { $or: [{ "items.lateFee": { $gt: 0 } }, { "items.compensation": { $gt: 0 } }] };

    const [bookAgg, totalUsers, newUsers, orderAgg, todayAgg, recentOrders, lowStock, activity, loans] = await Promise.all([
      Book.aggregate([
        {
          $group: {
            _id: null,
            titles: { $sum: 1 },
            stock: { $sum: "$quantity" },
            outOfStock: { $sum: { $cond: [{ $lte: ["$quantity", 0] }, 1, 0] } },
          },
        },
      ]),
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: weekAgo } }),
      Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 }, total: { $sum: "$total" } } }]),
      Order.aggregate([
        { $match: { status: "paid", paidAt: { $gte: today } } },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),
      Order.find().sort({ createdAt: -1 }).limit(5).populate("user", "name"),
      Book.find({ quantity: { $lte: 3 } }).sort({ quantity: 1 }).limit(5).select("title author image quantity"),
      ActivityLog.find().sort({ createdAt: -1 }).limit(6),
      Loan.find({ $or: [{ status: "borrowing" }, { status: "completed", finePaid: false, ...hasFine }] }),
    ]);

    // Đơn hàng theo trạng thái
    const byStatus = Object.fromEntries(orderAgg.map((o) => [o._id, o]));
    const orders = {
      total: orderAgg.reduce((s, o) => s + o.count, 0),
      pending: byStatus.pending?.count || 0,
      paid: byStatus.paid?.count || 0,
      revenue: byStatus.paid?.total || 0, // doanh thu = các đơn đã thanh toán
      revenueToday: todayAgg[0]?.total || 0,
    };

    // Mượn trả: thống kê + danh sách quá hạn nặng nhất
    const loanStats = { borrowingSlips: 0, borrowedBooks: 0, overdueSlips: 0, overdueBooks: 0, unpaidFines: 0 };
    const overdueList = [];
    for (const l of loans) {
      const p = present(l, now);
      if (p.status === "borrowing") {
        loanStats.borrowingSlips++;
        loanStats.borrowedBooks += p.outstanding;
        if (p.overdue) {
          loanStats.overdueSlips++;
          loanStats.overdueBooks += p.outstanding;
          overdueList.push({
            loanId: p._id, code: p.code, borrowerName: p.borrowerName, daysOverdue: p.daysOverdue,
            estimatedLateFee: p.estimatedLateFee,
            titles: p.items.filter((i) => i.status === "borrowed").map((i) => i.title),
          });
        }
      }
      if (!p.finePaid) loanStats.unpaidFines += p.totalFine;
    }
    overdueList.sort((a, b) => b.daysOverdue - a.daysOverdue);

    res.json({
      books: { titles: bookAgg[0]?.titles || 0, stock: bookAgg[0]?.stock || 0, outOfStock: bookAgg[0]?.outOfStock || 0 },
      users: { total: totalUsers, newThisWeek: newUsers },
      orders,
      loans: loanStats,
      overdueList: overdueList.slice(0, 5),
      recentOrders: recentOrders.map((o) => ({
        _id: o._id, total: o.total, status: o.status, paymentMethod: o.paymentMethod, createdAt: o.createdAt, userName: o.user?.name || "—",
      })),
      lowStock: lowStock.map((b) => ({ _id: b._id, title: b.title, author: b.author, image: b.image, quantity: b.quantity })),
      activity: activity.map((a) => ({ _id: a._id, userName: a.userName, action: a.action, detail: a.detail, createdAt: a.createdAt })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
