const jwt = require('jsonwebtoken');
const config = require('../config/env');

const generateAccessToken = (payload) => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
};

const generateRefreshToken = (payload) => {
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });
};

const verifyAccessToken = (token) => {
  return jwt.verify(token, config.jwt.secret);
};

const verifyRefreshToken = (token) => {
  return jwt.verify(token, config.jwt.refreshSecret);
};

/**
 * Ký QR code cho vé — ticketId + secret
 */
const generateTicketQR = (ticketId) => {
  return jwt.sign({ ticketId, type: 'ticket_qr' }, config.jwt.secret, {
    expiresIn: '365d',
  });
};

const verifyTicketQR = (token) => {
  return jwt.verify(token, config.jwt.secret);
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateTicketQR,
  verifyTicketQR,
};
