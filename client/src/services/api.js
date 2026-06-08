/**
 * API 层 — 统一管理后端通信
 * 【扩展点】切换后端地址时只需修改 BASE_URL
 * 【扩展点】新增 API 方法时在此文件或对应 service 文件中添加
 */

const BASE_URL = '/api';

/**
 * 通用请求封装
 * 自动处理 JSON 序列化、错误处理
 */
async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const config = {
    headers: { 'Content-Type': 'application/json' },
    ...options
  };
  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }
  // FormData 不需要 Content-Type 头
  if (config.body instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  const response = await fetch(url, config);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: '请求失败' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  return response.json();
}

// 导出便捷方法
export const api = {
  get: (endpoint) => request(endpoint),
  post: (endpoint, data) => request(endpoint, { method: 'POST', body: data }),
  put: (endpoint, data) => request(endpoint, { method: 'PUT', body: data }),
  delete: (endpoint) => request(endpoint, { method: 'DELETE' }),
  upload: (endpoint, formData) => request(endpoint, { method: 'POST', body: formData })
};

export default api;
