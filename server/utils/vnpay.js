import crypto from "crypto";

export const vnpayConfigured = () =>
  Boolean(process.env.VNP_TMN_CODE && process.env.VNP_HASH_SECRET && process.env.VNP_URL && process.env.VNP_RETURN_URL);

// Nối thành chuỗi key=value&key=value (giá trị đã được mã hóa sẵn)
const toQuery = (obj) =>
  Object.keys(obj)
    .map((k) => `${k}=${obj[k]}`)
    .join("&");

// Sắp xếp tham số theo tên và mã hóa giá trị (theo mẫu của VNPay)
function sortObject(obj) {
  const sorted = {};
  for (const key of Object.keys(obj).sort()) {
    sorted[key] = encodeURIComponent(String(obj[key])).replace(/%20/g, "+");
  }
  return sorted;
}

function sign(params) {
  const signData = toQuery(sortObject(params));
  return crypto
    .createHmac("sha512", process.env.VNP_HASH_SECRET)
    .update(Buffer.from(signData, "utf-8"))
    .digest("hex");
}

// yyyyMMddHHmmss theo giờ Việt Nam (GMT+7)
function vnDate() {
  return new Date(Date.now() + 7 * 3600 * 1000).toISOString().replace(/[-:T]/g, "").slice(0, 14);
}

export function buildPaymentUrl({ order, ipAddr, txnRef }) {
  const params = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: process.env.VNP_TMN_CODE,
    vnp_Amount: order.total * 100,
    vnp_CreateDate: vnDate(),
    vnp_CurrCode: "VND",
    vnp_IpAddr: ipAddr,
    vnp_Locale: "vn",
    vnp_OrderInfo: `Thanh toan don hang ${order._id}`,
    vnp_OrderType: "other",
    vnp_ReturnUrl: process.env.VNP_RETURN_URL,
    // 24 ký tự đầu là id đơn hàng, phần sau là thời gian để mỗi lần thanh toán là duy nhất
    vnp_TxnRef: txnRef || `${order._id}${Date.now()}`,
  };
  const sorted = sortObject(params);
  sorted.vnp_SecureHash = sign(params);
  return `${process.env.VNP_URL}?${toQuery(sorted)}`;
}

// Kiểm tra chữ ký VNPay gửi về
export function verifyVnpay(query) {
  const { vnp_SecureHash, vnp_SecureHashType, ...rest } = query;
  if (!vnp_SecureHash) return false;
  return sign(rest) === String(vnp_SecureHash).toLowerCase();
}
