/**
 * 打卡记录 API 服务
 */

import api from './api';

export const checkinService = {
  // 查询打卡（支持 userId/date/subject 筛选）
  getCheckins: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/checkins?${query}`);
  },

  // 新建打卡
  createCheckin: (data) =>
    api.post('/checkins', data),

  // 删除打卡
  deleteCheckin: (id) =>
    api.delete(`/checkins/${id}`)
};
