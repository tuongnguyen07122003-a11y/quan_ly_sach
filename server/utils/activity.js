import ActivityLog from "../models/ActivityLog.js";

// Ghi nhật ký (không chờ, không làm hỏng thao tác chính nếu ghi lỗi)
export function logActivity(req, action, targetType, targetId, detail = "") {
  ActivityLog.create({
    user: req.user?._id,
    userName: req.user?.name,
    action,
    targetType,
    targetId: targetId ? String(targetId) : undefined,
    detail,
  }).catch(() => {});
}
