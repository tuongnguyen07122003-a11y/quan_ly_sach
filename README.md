# Quản lý sách (React + Node.js + MongoDB)

## Chạy dự án
Backend:  cd server && npm install && npm run dev     (http://localhost:5000)
Frontend: cd client && npm install && npm run dev     (http://localhost:5173)
Nạp sách mẫu: cd server && npm run seed

## Phân quyền
- Khách/Người dùng: xem, tìm sách, giỏ hàng, đặt hàng (cần đăng nhập)
- Admin: quản lý sách, đơn hàng, người dùng
Admin mặc định: xem ADMIN_EMAIL / ADMIN_PASSWORD trong server/.env

## Đăng nhập Google
1. https://console.cloud.google.com -> APIs & Services -> Credentials -> Create OAuth client ID (Web application)
2. Authorized JavaScript origins: http://localhost:5173
3. Dán Client ID vào server/.env (GOOGLE_CLIENT_ID) và client/.env (VITE_GOOGLE_CLIENT_ID)

## Đăng nhập Facebook
1. https://developers.facebook.com -> Create App -> thêm sản phẩm "Facebook Login"
2. Dán App ID vào client/.env (VITE_FACEBOOK_APP_ID), App ID + App Secret vào server/.env
3. App ở chế độ Development: chỉ admin/tester của app đăng nhập được

## Thanh toán VNPay (sandbox)
1. Đăng ký tài khoản sandbox: https://sandbox.vnpayment.vn/devreg/
2. Lấy TMN Code và Hash Secret từ email VNPay gửi -> dán vào server/.env (VNP_TMN_CODE, VNP_HASH_SECRET)
3. Thẻ test: xem tài liệu sandbox của VNPay

## Thanh toán MoMo (sandbox)
1. server/.env.example đã có sẵn khóa TEST công khai của MoMo; nếu báo lỗi xác thực, đăng ký tại https://business.momo.vn để lấy khóa test riêng
2. Cài app "MoMo Test" và dùng tài khoản test của MoMo (xem tài liệu) -> Quét QR trên trang thanh toán
3. Số tiền mỗi đơn: từ 1.000 ₫ đến 50.000.000 ₫

Sau khi sửa .env nhớ khởi động lại backend/frontend.

## Các collection trong MongoDB (database book_manager)
| Collection | Dùng cho | Liên kết với |
|---|---|---|
| users | Tài khoản, vai trò | orders, reviews, payments |
| books | Sách (có giá, tồn kho) | categories, reviews, orders |
| categories | Thể loại sách | books (tự đồng bộ từ sách; đổi tên thì sách tự cập nhật) |
| reviews | Đánh giá sao + bình luận | books, users (mỗi người 1 đánh giá/sách, có nhãn "Đã mua") |
| carts | Giỏ hàng của từng người dùng (khách chưa đăng nhập lưu tạm trong trình duyệt, đăng nhập thì tự gộp vào) | users, books |
| orders | Đơn hàng | users, books |
| payments | Từng lần thanh toán VNPay/MoMo để đối soát | orders, users |
| activitylogs | Nhật ký thao tác của admin | users |
Các collection được tạo tự động khi chạy backend, không cần nhập tay.

## Ảnh
- Ảnh tải lên được lưu trong server/uploads và phục vụ tại /uploads/...; database chỉ lưu đường dẫn.
- Ảnh bìa sách: admin chọn ảnh từ máy (JPG/PNG/WEBP/GIF, tối đa 3MB) hoặc dán link. Để trống thì hệ thống tự tạo bìa.
- Ảnh đại diện: người dùng vào "Tài khoản của tôi" (bấm vào tên ở góc phải thanh menu).
- Khi triển khai thật nên lưu ảnh trên dịch vụ lưu trữ (S3, Cloudinary...) thay vì ổ đĩa của server.

## Tạo / đặt lại tài khoản admin
cd server
npm run create-admin -- tuong12345@gmail.com tuong12345 Tường
(Email đã có thì đặt lại mật khẩu và nâng lên admin; chưa có thì tạo mới.)

## Mật khẩu lưu dạng chữ thường (tùy chọn)
Trong server/.env đặt HASH_PASSWORDS=false -> tài khoản tạo mới lưu mật khẩu nguyên văn trong collection users.
Đặt lại true (hoặc xóa dòng này) để mã hóa bcrypt. Tài khoản cũ đã mã hóa vẫn đăng nhập bình thường ở cả hai chế độ.
KHÔNG dùng chế độ chữ thường khi có người dùng thật.

## Mượn trả sách
- Admin: Quản trị -> Quản lý mượn trả. Tạo phiếu (chọn người mượn + sách + ngày mượn/hạn trả), xác nhận trả,
  gia hạn, báo mất/hư hỏng, theo dõi sách đang mượn, xem sách quá hạn, đánh dấu đã thu tiền phạt.
- Người dùng: "Sách tôi mượn" - xem phiếu của mình và tự gia hạn.
- Quy tắc cấu hình trong server/.env (LOAN_DAYS, RENEW_DAYS, MAX_RENEWALS, MAX_BOOKS_PER_BORROWER, LATE_FEE_PER_DAY, DAMAGED_COMPENSATION_PERCENT).
- Mượn sách trừ vào tồn kho (cùng số lượng với sách bán); trả sách thì cộng lại; mất/hỏng không cộng lại.
- Collection mới: loans.

## Hai trang chủ riêng
- Người dùng: trang chủ là `/` (tìm kiếm sách), giao diện thanh menu phía trên.
- Quản trị viên: trang chủ là `/admin` (bảng điều khiển tổng quan), giao diện riêng có thanh bên.
- Đăng nhập xong tự chuyển đúng trang chủ theo vai trò (admin -> /admin, người dùng -> /).
- Admin có nút "Trang quản trị" trên thanh menu người dùng và nút "Xem trang người dùng" ở thanh bên để qua lại.
- Người dùng thường vào /admin sẽ thấy trang "Không có quyền truy cập".
- API cho bảng điều khiển: GET /api/admin/summary (chỉ admin).
