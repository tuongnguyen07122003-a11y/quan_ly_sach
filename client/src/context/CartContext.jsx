import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthContext.jsx";
import { getCart, saveCart, mergeCart } from "../api.js";

const CartContext = createContext(null);
const KEY = "bm_cart"; // giỏ hàng tạm của khách chưa đăng nhập

function loadLocal() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
}

const toPayload = (items) => items.map((i) => ({ bookId: i._id, quantity: i.qty }));

export function CartProvider({ children }) {
  const { user } = useAuth();
  const userId = user?._id;
  const [items, setItems] = useState(loadLocal);
  const syncTimer = useRef(null);
  const ready = useRef(!userId); // đã đồng bộ xong với server chưa
  const fromServer = useRef(false); // lần cập nhật này đến từ server -> không gửi lại

  // Khi đăng nhập: gộp giỏ của khách vào giỏ trên server. Khi đăng xuất: quay về giỏ của khách.
  useEffect(() => {
    clearTimeout(syncTimer.current);
    if (!userId) {
      ready.current = true;
      setItems(loadLocal());
      return;
    }
    ready.current = false;
    let cancelled = false;
    const guest = loadLocal();
    const request = guest.length ? mergeCart(toPayload(guest)) : getCart();
    request
      .then((list) => {
        if (cancelled) return;
        localStorage.removeItem(KEY);
        fromServer.current = true;
        setItems(list);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) ready.current = true;
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Mỗi khi giỏ thay đổi: khách -> lưu trình duyệt, đã đăng nhập -> lưu lên MongoDB
  useEffect(() => {
    if (fromServer.current) {
      fromServer.current = false;
      return;
    }
    if (!userId) {
      localStorage.setItem(KEY, JSON.stringify(items));
      return;
    }
    if (!ready.current) return;
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      saveCart(toPayload(items)).catch(() => {});
    }, 400);
  }, [items]);

  const add = (book, qty = 1) =>
    setItems((prev) => {
      const found = prev.find((i) => i._id === book._id);
      if (found) {
        return prev.map((i) =>
          i._id === book._id ? { ...i, stock: book.quantity, qty: Math.min(i.qty + qty, book.quantity) } : i
        );
      }
      return [
        ...prev,
        { _id: book._id, title: book.title, author: book.author, image: book.image, price: book.price, stock: book.quantity, qty: Math.min(qty, book.quantity) },
      ];
    });

  const setQty = (id, qty) =>
    setItems((prev) =>
      prev.map((i) => (i._id === id ? { ...i, qty: Math.max(1, Math.min(qty, i.stock)) } : i))
    );
  const remove = (id) => setItems((prev) => prev.filter((i) => i._id !== id));
  const clear = () => setItems([]);

  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  const count = items.reduce((s, i) => s + i.qty, 0);

  return (
    <CartContext.Provider value={{ items, add, setQty, remove, clear, total, count }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
