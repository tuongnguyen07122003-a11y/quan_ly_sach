const BASE = "/api";
const TOKEN_KEY = "bm_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) =>
  t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY);

async function request(url, options = {}) {
  const token = getToken();
  const res = await fetch(BASE + url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Có lỗi xảy ra");
  return data;
}

const post = (url, body) => request(url, { method: "POST", body: JSON.stringify(body) });
const put = (url, body) => request(url, { method: "PUT", body: JSON.stringify(body) });

// Sách
export const getBooks = (q = "", category = "") =>
  request(`/books?q=${encodeURIComponent(q)}&category=${encodeURIComponent(category)}`);
export const getBook = (id) => request(`/books/${id}`);
export const createBook = (b) => post("/books", b);
export const updateBook = (id, b) => put(`/books/${id}`, b);
export const deleteBook = (id) => request(`/books/${id}`, { method: "DELETE" });

// Xác thực
export const loginApi = (email, password) => post("/auth/login", { email, password });
export const registerApi = (data) => post("/auth/register", data);
export const googleLoginApi = (credential) => post("/auth/google", { credential });
export const facebookLoginApi = (accessToken) => post("/auth/facebook", { accessToken });
export const getMe = () => request("/auth/me");

// Người dùng (admin)
export const getUsers = (q = "") => request(`/users?q=${encodeURIComponent(q)}`);
export const updateUser = (id, changes) => put(`/users/${id}`, changes);
export const deleteUser = (id) => request(`/users/${id}`, { method: "DELETE" });

// Đơn hàng & thanh toán
export const createOrder = (data) => post("/orders", data);
export const getMyOrders = () => request("/orders/mine");
export const getPayUrl = (orderId, provider) => post(`/orders/${orderId}/${provider}`, {});
export const getAllOrders = () => request("/orders");
export const updateOrderStatus = (id, status) => put(`/orders/${id}/status`, { status });

// Tải ảnh lên (type: "book" chỉ admin, "avatar" mọi người dùng đã đăng nhập)
export async function uploadImage(file, type = "book") {
  const form = new FormData();
  form.append("image", file);
  const token = getToken();
  const res = await fetch(`${BASE}/uploads?type=${type}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {}, // không tự đặt Content-Type để trình duyệt thêm boundary
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Tải ảnh lên thất bại");
  return data; // { url }
}
export const updateProfileApi = (data) => put("/auth/profile", data);

// Giỏ hàng (lưu trên MongoDB cho người đã đăng nhập)
export const getCart = () => request("/cart");
export const saveCart = (items) => put("/cart", { items });
export const mergeCart = (items) => post("/cart/merge", { items });

// Thể loại
export const getCategories = () => request("/categories");
export const createCategory = (c) => post("/categories", c);
export const updateCategory = (id, c) => put(`/categories/${id}`, c);
export const deleteCategory = (id) => request(`/categories/${id}`, { method: "DELETE" });

// Đánh giá
export const getReviews = (bookId) => request(`/reviews/book/${bookId}`);
export const saveReview = (bookId, data) => post(`/reviews/book/${bookId}`, data);
export const deleteReview = (id) => request(`/reviews/${id}`, { method: "DELETE" });

// Giao dịch thanh toán & nhật ký (admin)
export const getTransactions = () => request("/transactions");
export const getLogs = () => request("/logs");

// Mượn trả sách
export const getLoanRules = () => request("/loans/rules");
export const getLoanStats = () => request("/loans/stats");
export const getLoanItems = (scope, q = "") => request(`/loans/items?scope=${scope}&q=${encodeURIComponent(q)}`);
export const getLoans = (status = "all", q = "") => request(`/loans?status=${status}&q=${encodeURIComponent(q)}`);
export const getMyLoans = () => request("/loans/mine");
export const getLoan = (id) => request(`/loans/${id}`);
export const createLoan = (data) => post("/loans", data);
export const resolveLoan = (id, items) => post(`/loans/${id}/resolve`, { items });
export const renewLoan = (id, days) => post(`/loans/${id}/renew`, days ? { days } : {});
export const cancelLoan = (id) => post(`/loans/${id}/cancel`, {});
export const setLoanFinePaid = (id, paid) => post(`/loans/${id}/fine`, { paid });

// Trang chủ quản trị
export const getAdminSummary = () => request("/admin/summary");
