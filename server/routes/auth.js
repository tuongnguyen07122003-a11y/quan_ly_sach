import { Router } from "express";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";
import { protect } from "../middleware/auth.js";
import { releaseImage } from "../utils/uploads.js";

const router = Router();
const GRAPH = "https://graph.facebook.com/v25.0";

const signToken = (user) =>
  jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES || "7d",
  });

// ---------- Đăng ký / đăng nhập thường ----------
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin" });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Mật khẩu phải có ít nhất 6 ký tự" });
    }
    if (await User.findOne({ email: email.toLowerCase().trim() })) {
      return res.status(400).json({ message: "Email đã được sử dụng" });
    }
    const user = await User.create({ name, email, password, role: "user" });
    res.status(201).json({ token: signToken(user), user });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: (email || "").toLowerCase().trim() });
    if (!user || !(await user.matchPassword(password || ""))) {
      return res.status(401).json({ message: "Email hoặc mật khẩu không đúng" });
    }
    if (!user.active) return res.status(403).json({ message: "Tài khoản đã bị khóa" });
    res.json({ token: signToken(user), user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/me", protect, (req, res) => res.json(req.user));

// Người dùng tự sửa tên và ảnh đại diện của mình
router.put("/profile", protect, async (req, res) => {
  try {
    const user = req.user;
    const { name, avatar } = req.body;
    const oldAvatar = user.avatar;

    if (name !== undefined) {
      const n = String(name).trim();
      if (!n) return res.status(400).json({ message: "Tên không được để trống" });
      user.name = n.slice(0, 60);
    }
    if (avatar !== undefined) {
      const a = String(avatar).trim();
      if (a && !/^(\/uploads\/[\w.-]+|https?:\/\/\S+)$/.test(a)) {
        return res.status(400).json({ message: "Đường dẫn ảnh không hợp lệ" });
      }
      user.avatar = a;
    }
    await user.save();
    if (oldAvatar && oldAvatar !== user.avatar) await releaseImage(oldAvatar);
    res.json(user);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ---------- Đăng nhập mạng xã hội ----------
// Tìm tài khoản theo id của Google/Facebook; nếu chưa có thì liên kết theo email
// hoặc tạo tài khoản mới (luôn là vai trò "user").
async function findOrCreateSocialUser({ provider, providerId, email, name, avatar, emailVerified }) {
  const field = provider === "google" ? "googleId" : "facebookId";
  let user = await User.findOne({ [field]: providerId });

  if (!user && emailVerified) {
    user = await User.findOne({ email });
    if (user) {
      user[field] = providerId;
      if (!user.avatar && avatar) user.avatar = avatar;
      await user.save();
    }
  }
  if (!user) {
    user = await User.create({
      name: name || email.split("@")[0],
      email,
      [field]: providerId,
      avatar,
      role: "user",
    });
  }
  return user;
}

async function finishSocialLogin(res, profile) {
  try {
    const user = await findOrCreateSocialUser(profile);
    if (!user.active) return res.status(403).json({ message: "Tài khoản đã bị khóa" });
    res.json({ token: signToken(user), user });
  } catch (err) {
    const msg = err.code === 11000 ? "Email này đã thuộc về một tài khoản khác" : err.message;
    res.status(400).json({ message: msg });
  }
}

router.post("/google", async (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return res.status(503).json({ message: "Chưa cấu hình đăng nhập Google" });

  let payload;
  try {
    const ticket = await new OAuth2Client(clientId).verifyIdToken({
      idToken: req.body.credential,
      audience: clientId,
    });
    payload = ticket.getPayload();
  } catch {
    return res.status(401).json({ message: "Đăng nhập Google thất bại" });
  }

  await finishSocialLogin(res, {
    provider: "google",
    providerId: payload.sub,
    email: payload.email.toLowerCase(),
    name: payload.name,
    avatar: payload.picture,
    emailVerified: payload.email_verified,
  });
});

router.post("/facebook", async (req, res) => {
  const { FACEBOOK_APP_ID: appId, FACEBOOK_APP_SECRET: secret } = process.env;
  if (!appId || !secret) return res.status(503).json({ message: "Chưa cấu hình đăng nhập Facebook" });

  let me;
  try {
    const token = encodeURIComponent(req.body.accessToken || "");
    // 1) Xác minh token thật sự được cấp cho ứng dụng của bạn
    const debug = await (
      await fetch(`${GRAPH}/debug_token?input_token=${token}&access_token=${appId}|${secret}`)
    ).json();
    if (!debug.data?.is_valid || String(debug.data.app_id) !== String(appId)) throw new Error("invalid");
    // 2) Lấy thông tin hồ sơ
    me = await (await fetch(`${GRAPH}/me?fields=id,name,email,picture.type(large)&access_token=${token}`)).json();
    if (!me.id) throw new Error("no id");
  } catch {
    return res.status(401).json({ message: "Đăng nhập Facebook thất bại" });
  }

  await finishSocialLogin(res, {
    provider: "facebook",
    providerId: me.id,
    // Facebook có thể không trả email -> dùng email tạm
    email: me.email ? me.email.toLowerCase() : `fb_${me.id}@facebook.local`,
    name: me.name,
    avatar: me.picture?.data?.url,
    emailVerified: Boolean(me.email),
  });
});

export default router;
