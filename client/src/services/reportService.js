/**
 * 【新增】报表 AI 服务
 * 调用后端 /api/ai/report-suggestion 生成学习建议
 */

import api from './api';

export const reportService = {
  /**
   * 根据统计数据获取 AI 学习建议
   * @param {Object} stats — 汇总的学习数据
   * @returns {Promise<{suggestion: string}>}
   */
  getSuggestion: (stats) =>
    api.post('/ai/report-suggestion', { stats })
};
