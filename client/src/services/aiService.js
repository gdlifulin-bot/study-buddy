/**
 * AI 服务
 * 调用后端 AI 相关接口
 */

import api from './api';

export const aiService = {
  /**
   * 生成学习计划
   */
  generatePlan: (params) =>
    api.post('/ai/generate-plan', params),

  /**
   * 【新增】AI 智能解析文件内容为结构化任务
   * @param {string} text - 从 PDF/Word/Excel 提取的原始文本
   * @returns {Promise<{tasks: Array}>}
   */
  parsePlanText: (text) =>
    api.post('/ai/parse-plan', { text })
};
