import crypto from "crypto";

export const momoConfigured = () =>
  Boolean(
    process.env.MOMO_PARTNER_CODE &&
      process.env.MOMO_ACCESS_KEY &&
      process.env.MOMO_SECRET_KEY &&
      process.env.MOMO_ENDPOINT &&
      process.env.MOMO_REDIRECT_URL &&
      process.env.MOMO_IPN_URL
  );

const hmac = (raw) => crypto.createHmac("sha256", process.env.MOMO_SECRET_KEY).update(raw).digest("hex");

// Gọi API captureWallet của MoMo, trả về link thanh toán (payUrl)
export async function createMomoPayment(order, txnRef) {
  const {
    MOMO_PARTNER_CODE: partnerCode,
    MOMO_ACCESS_KEY: accessKey,
    MOMO_ENDPOINT: endpoint,
    MOMO_REDIRECT_URL: redirectUrl,
    MOMO_IPN_URL: ipnUrl,
  } = process.env;

  // 24 ký tự đầu là id đơn hàng; phần sau là thời gian để mỗi lần thanh toán là duy nhất
  const requestId = txnRef || `${order._id}${Date.now()}`;
  const orderId = requestId;
  const amount = order.total;
  const orderInfo = `Thanh toan don hang ${order._id}`;
  const extraData = "";
  const requestType = "captureWallet";

  // Các trường sắp xếp theo thứ tự a-z (đúng tài liệu MoMo)
  const rawSignature =
    `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}` +
    `&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}` +
    `&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;

  const res = await fetch(`${endpoint}/v2/gateway/api/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      partnerCode,
      storeName: "Thu vien sach",
      requestId,
      amount,
      orderId,
      orderInfo,
      redirectUrl,
      ipnUrl,
      lang: "vi",
      requestType,
      autoCapture: true,
      extraData,
      signature: hmac(rawSignature),
    }),
    signal: AbortSignal.timeout(30000), // MoMo yêu cầu timeout tối thiểu 30 giây
  });
  const data = await res.json();
  if (data.resultCode !== 0 || !data.payUrl) {
    throw new Error(`MoMo: ${data.message || "không tạo được giao dịch"}`);
  }
  return data.payUrl;
}

// Kiểm tra chữ ký MoMo gửi về (dùng cho cả redirect và IPN)
export function verifyMomo(d) {
  const f = (k) => (d[k] === undefined || d[k] === null ? "" : String(d[k]));
  const raw =
    `accessKey=${process.env.MOMO_ACCESS_KEY}&amount=${f("amount")}&extraData=${f("extraData")}` +
    `&message=${f("message")}&orderId=${f("orderId")}&orderInfo=${f("orderInfo")}` +
    `&orderType=${f("orderType")}&partnerCode=${f("partnerCode")}&payType=${f("payType")}` +
    `&requestId=${f("requestId")}&responseTime=${f("responseTime")}&resultCode=${f("resultCode")}` +
    `&transId=${f("transId")}`;
  return Boolean(d.signature) && hmac(raw) === String(d.signature).toLowerCase();
}
