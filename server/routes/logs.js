import { Router } from "express";
import ActivityLog from "../models/ActivityLog.js";
import { protect, adminOnly } from "../middleware/auth.js";

const router = Router();
router.use(protect, adminOnly);

router.get("/", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    res.json(await ActivityLog.find().sort({ createdAt: -1 }).limit(limit));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
