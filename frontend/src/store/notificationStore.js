import { create } from 'zustand';

const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,

  setNotifications: (notifications, unreadCount) => set({ notifications, unreadCount }),

  addNotification: (notif) =>
    set((s) => ({ notifications: [notif, ...s.notifications], unreadCount: s.unreadCount + 1 })),

  markRead: (id) =>
    set((s) => ({
      notifications: s.notifications.map((n) => n._id === id ? { ...n, isRead: true } : n),
      unreadCount: Math.max(0, s.unreadCount - 1),
    })),

  markAllRead: () =>
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    })),
}));

export default useNotificationStore;
