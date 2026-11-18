import { Outlet } from "react-router-dom";
import Navbar from "./Navbar.jsx";

// Khung giao diện dành cho người dùng: thanh menu phía trên + nội dung
export default function PublicLayout() {
  return (
    <>
      <Navbar />
      <main className="container">
        <Outlet />
      </main>
    </>
  );
}
