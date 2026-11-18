import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "../context/AuthContext.jsx";

const FB_VERSION = "v25.0";

function loadFacebookSdk(appId) {
  return new Promise((resolve) => {
    if (window.FB) return resolve(window.FB);
    window.fbAsyncInit = () => {
      window.FB.init({ appId, cookie: true, xfbml: false, version: FB_VERSION });
      resolve(window.FB);
    };
    const s = document.createElement("script");
    s.src = "https://connect.facebook.net/vi_VN/sdk.js";
    s.async = true;
    document.body.appendChild(s);
  });
}

export default function SocialLogin() {
  const { loginWithGoogle, loginWithFacebook } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const googleId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const fbId = import.meta.env.VITE_FACEBOOK_APP_ID;

  // Tải trước SDK Facebook để cửa sổ đăng nhập không bị trình duyệt chặn
  useEffect(() => {
    if (fbId) loadFacebookSdk(fbId);
  }, [fbId]);

  if (!googleId && !fbId) {
    return <p className="hint">Đăng nhập Google/Facebook chưa được cấu hình (xem README).</p>;
  }

  const onGoogle = async (res) => {
    try {
      const u = await loginWithGoogle(res.credential);
      navigate(u.role === "admin" ? "/admin" : "/");
    } catch (e) {
      setError(e.message);
    }
  };

  const onFacebook = () => {
    if (!window.FB) return setError("Facebook chưa tải xong, vui lòng thử lại sau giây lát");
    window.FB.login(
      async (resp) => {
        if (!resp.authResponse) return setError("Bạn đã hủy đăng nhập Facebook");
        try {
          const u = await loginWithFacebook(resp.authResponse.accessToken);
          navigate(u.role === "admin" ? "/admin" : "/");
        } catch (e) {
          setError(e.message);
        }
      },
      { scope: "public_profile,email" }
    );
  };

  return (
    <div className="social">
      <div className="divider"><span>hoặc</span></div>
      {error && <div className="error">{error}</div>}
      {googleId && (
        <div className="social-btn">
          <GoogleLogin onSuccess={onGoogle} onError={() => setError("Đăng nhập Google thất bại")} />
        </div>
      )}
      {fbId && (
        <button type="button" className="btn fb" onClick={onFacebook}>
          Tiếp tục với Facebook
        </button>
      )}
    </div>
  );
}
