import { Routes, Route, Navigate } from "react-router-dom";
import PublicLayout from "./components/PublicLayout.jsx";
import AdminLayout from "./components/AdminLayout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Home from "./pages/Home.jsx";
import BookDetail from "./pages/BookDetail.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Cart from "./pages/Cart.jsx";
import MyOrders from "./pages/MyOrders.jsx";
import PaymentResult from "./pages/PaymentResult.jsx";
import Profile from "./pages/Profile.jsx";
import MyLoans from "./pages/MyLoans.jsx";
import AdminHome from "./pages/AdminHome.jsx";
import ManageBooks from "./pages/ManageBooks.jsx";
import ManageCategories from "./pages/ManageCategories.jsx";
import ManageOrders from "./pages/ManageOrders.jsx";
import ManageTransactions from "./pages/ManageTransactions.jsx";
import ManageUsers from "./pages/ManageUsers.jsx";
import ActivityLogs from "./pages/ActivityLogs.jsx";
import ManageLoans from "./pages/ManageLoans.jsx";
import CreateLoan from "./pages/CreateLoan.jsx";
import LoanDetail from "./pages/LoanDetail.jsx";

export default function App() {
  return (
    <Routes>
      {/* ===== Khu vực QUẢN TRỊ: giao diện riêng (thanh bên), trang chủ là /admin ===== */}
      <Route path="/admin" element={<ProtectedRoute adminOnly><AdminLayout /></ProtectedRoute>}>
        <Route index element={<AdminHome />} />
        <Route path="books" element={<ManageBooks />} />
        <Route path="categories" element={<ManageCategories />} />
        <Route path="loans" element={<ManageLoans />} />
        <Route path="loans/new" element={<CreateLoan />} />
        <Route path="loans/:id" element={<LoanDetail />} />
        <Route path="orders" element={<ManageOrders />} />
        <Route path="transactions" element={<ManageTransactions />} />
        <Route path="users" element={<ManageUsers />} />
        <Route path="logs" element={<ActivityLogs />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>

      {/* ===== Khu vực NGƯỜI DÙNG: thanh menu phía trên, trang chủ là / ===== */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/books/:id" element={<BookDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/my-loans" element={<ProtectedRoute><MyLoans /></ProtectedRoute>} />
        <Route path="/orders" element={<ProtectedRoute><MyOrders /></ProtectedRoute>} />
        <Route path="/payment-result" element={<ProtectedRoute><PaymentResult /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
