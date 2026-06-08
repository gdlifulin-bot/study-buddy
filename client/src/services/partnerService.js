/**
 * 搭子互动 API 服务
 * 对比数据、动态、加油、通知
 */
import api from './api';

export const partnerService = {
  // 获取两人学习对比数据
  getCompare: (user1, user2, period = 'week') =>
    api.get(`/partners/compare?user1=${user1}&user2=${user2}&period=${period}`),

  // 获取搭子最近动态
  getActivity: (userId) =>
    api.get(`/partners/activity?userId=${userId}`),

  // 发送加油
  sendCheer: (fromUserId, toUserId, message) =>
    api.post('/partners/cheer', { fromUserId, toUserId, message }),

  // 获取未读通知
  getNotifications: (userId) =>
    api.get(`/partners/notifications?userId=${userId}`),

  // 标记通知已读
  markRead: (notifId) =>
    api.post(`/partners/notifications/read/${notifId}`),

  // 全部标记已读
  markAllRead: (userId) =>
    api.post('/partners/notifications/read-all', { userId }),

  // 获取连续打卡
  getStreak: (userId) =>
    api.get(`/checkins/streak?userId=${userId}`)
};
