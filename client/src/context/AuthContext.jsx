import { createContext, useContext, useEffect, useState } from "react";
import {
  loginApi, registerApi, googleLoginApi, facebookLoginApi,
  getMe, getToken, setToken, updateProfileApi,
} from "../api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!getToken());

  useEffect(() => {
    if (!getToken()) return;
    getMe()
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  const accept = ({ token, user }) => {
    setToken(token);
    setUser(user);
    return user; // để nơi gọi biết vai trò mà chuyển trang cho đúng
  };

  const login = async (email, password) => accept(await loginApi(email, password));
  const register = async (data) => accept(await registerApi(data));
  const loginWithGoogle = async (credential) => accept(await googleLoginApi(credential));
  const loginWithFacebook = async (accessToken) => accept(await facebookLoginApi(accessToken));
  const logout = () => {
    setToken(null);
    setUser(null);
  };
  const saveProfile = async (data) => setUser(await updateProfileApi(data));

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, loginWithGoogle, loginWithFacebook, logout, saveProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
