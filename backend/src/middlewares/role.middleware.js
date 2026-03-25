const { sendForbidden } = require('../utils/response');

/**
 * RBAC middleware — kiểm tra role của user
 * @param {...string} roles - Các roles được phép
 * @example roleMiddleware('Admin', 'Organizer')
 */
const roleMiddleware = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendForbidden(res, 'Chưa xác thực');
    }

    if (!roles.includes(req.user.role)) {
      return sendForbidden(
        res,
        `Chức năng này yêu cầu quyền: ${roles.join(' hoặc ')}`
      );
    }

    next();
  };
};

module.exports = roleMiddleware;
