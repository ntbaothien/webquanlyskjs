import crypto from 'crypto';

/**
 * Generate unique ticket code: EVH-XXXX-XXXX
 */
export const generateTicketCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const part = (len) => {
    let result = '';
    const bytes = crypto.randomBytes(len);
    for (let i = 0; i < len; i++) {
      result += chars[bytes[i] % chars.length];
    }
    return result;
  };
  return `EVH-${part(4)}-${part(4)}`;
};
