/**
 * Role-based access control middleware
 * Usage: role('ADMIN'), role('ORGANIZER', 'ADMIN')
 */
export const role = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Chưa đăng nhập' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Không có quyền truy cập' });
    }
    next();
  };
};
