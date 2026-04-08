import crypto from 'crypto';

// ── MoMo Sandbox Configuration ──────────────────────────────────────────────
const MOMO_CONFIG = {
  partnerCode: process.env.MOMO_PARTNER_CODE || 'MOMO',
  accessKey:   process.env.MOMO_ACCESS_KEY   || 'F8BBA842ECF85',
  secretKey:   process.env.MOMO_SECRET_KEY   || 'K951B6PE1waDMi640xX08PD3vg6EkVlz',
  apiEndpoint: process.env.MOMO_API_ENDPOINT || 'https://test-payment.momo.vn',
};

/**
 * Tạo chữ ký HMAC_SHA256 theo chuẩn MoMo
 * @param {string} rawData - Chuỗi dữ liệu đã format key=value&key=value
 * @returns {string} Chữ ký hex
 */
function createSignature(rawData) {
  return crypto
    .createHmac('sha256', MOMO_CONFIG.secretKey)
    .update(rawData)
    .digest('hex');
}

/**
 * Tạo yêu cầu thanh toán MoMo (captureWallet)
 * @param {Object} params
 * @param {string} params.orderId    - Mã đơn hàng duy nhất
 * @param {number} params.amount     - Số tiền (VND, integer)
 * @param {string} params.orderInfo  - Mô tả đơn hàng
 * @param {string} params.redirectUrl - URL redirect sau thanh toán
 * @param {string} params.ipnUrl     - URL nhận IPN callback từ MoMo
 * @returns {Promise<Object>} Response từ MoMo (payUrl, deeplink, qrCodeUrl, ...)
 */
export async function createMomoPayment({ orderId, amount, orderInfo, redirectUrl, ipnUrl }) {
  const requestId = `REQ_${orderId}`;
  const requestType = 'captureWallet';
  const extraData = ''; // base64 encode nếu cần

  // Tạo rawSignature theo thứ tự MoMo quy định
  const rawSignature = [
    `accessKey=${MOMO_CONFIG.accessKey}`,
    `amount=${amount}`,
    `extraData=${extraData}`,
    `ipnUrl=${ipnUrl}`,
    `orderId=${orderId}`,
    `orderInfo=${orderInfo}`,
    `partnerCode=${MOMO_CONFIG.partnerCode}`,
    `redirectUrl=${redirectUrl}`,
    `requestId=${requestId}`,
    `requestType=${requestType}`,
  ].join('&');

  const signature = createSignature(rawSignature);

  const requestBody = {
    partnerCode: MOMO_CONFIG.partnerCode,
    accessKey:   MOMO_CONFIG.accessKey,
    requestId,
    amount:      String(amount),
    orderId,
    orderInfo,
    redirectUrl,
    ipnUrl,
    extraData,
    requestType,
    signature,
    lang: 'vi',
  };

  console.log('🔵 MoMo Create Payment Request:', JSON.stringify(requestBody, null, 2));

  const response = await fetch(`${MOMO_CONFIG.apiEndpoint}/v2/gateway/api/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  const data = await response.json();
  console.log('🟢 MoMo Create Payment Response:', JSON.stringify(data, null, 2));

  return data;
}

/**
 * Kiểm tra trạng thái giao dịch MoMo
 * @param {string} orderId - Mã đơn hàng
 * @returns {Promise<Object>} Response từ MoMo
 */
export async function queryMomoTransaction(orderId) {
  const requestId = `QUERY_${orderId}_${Date.now()}`;

  const rawSignature = [
    `accessKey=${MOMO_CONFIG.accessKey}`,
    `orderId=${orderId}`,
    `partnerCode=${MOMO_CONFIG.partnerCode}`,
    `requestId=${requestId}`,
  ].join('&');

  const signature = createSignature(rawSignature);

  const requestBody = {
    partnerCode: MOMO_CONFIG.partnerCode,
    accessKey:   MOMO_CONFIG.accessKey,
    requestId,
    orderId,
    signature,
    lang: 'vi',
  };

  const response = await fetch(`${MOMO_CONFIG.apiEndpoint}/v2/gateway/api/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  const data = await response.json();
  console.log('🔍 MoMo Query Response:', JSON.stringify(data, null, 2));

  return data;
}

/**
 * Xác thực chữ ký IPN từ MoMo
 * @param {Object} ipnData - Body từ MoMo IPN callback
 * @returns {boolean} true nếu chữ ký hợp lệ
 */
export function verifyMomoSignature(ipnData) {
  const {
    accessKey, amount, extraData, message, orderId, orderInfo,
    orderType, partnerCode, payType, requestId, responseTime,
    resultCode, transId,
  } = ipnData;

  const rawSignature = [
    `accessKey=${MOMO_CONFIG.accessKey}`,
    `amount=${amount}`,
    `extraData=${extraData}`,
    `message=${message}`,
    `orderId=${orderId}`,
    `orderInfo=${orderInfo}`,
    `orderType=${orderType}`,
    `partnerCode=${partnerCode}`,
    `payType=${payType}`,
    `requestId=${requestId}`,
    `responseTime=${responseTime}`,
    `resultCode=${resultCode}`,
    `transId=${transId}`,
  ].join('&');

  const expectedSignature = createSignature(rawSignature);
  const isValid = expectedSignature === ipnData.signature;

  if (!isValid) {
    console.error('❌ MoMo Signature mismatch!');
    console.error('  Expected:', expectedSignature);
    console.error('  Received:', ipnData.signature);
  }

  return isValid;
}

export { MOMO_CONFIG };
