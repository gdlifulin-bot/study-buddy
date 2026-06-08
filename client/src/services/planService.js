/**
 * 学习计划 API 服务
 * 封装计划相关的所有 API 调用
 */

import api from './api';

export const planService = {
  // 获取月度计划
  getPlan: (userId, year, month) =>
    api.get(`/plans?userId=${userId}&year=${year}&month=${month}`),

  // 保存整个月度计划
  savePlan: (planData) =>
    api.post('/plans', planData),

  // 更新某一天的任务
  updateDayTasks: (planId, day, tasks) =>
    api.put(`/plans/${planId}/day/${day}`, { tasks }),

  // 删除月度计划
  deletePlan: (planId) =>
    api.delete(`/plans/${planId}`)
};
