/**
 * 文件上传 API 服务
 */

import api from './api';

export const uploadService = {
  // 上传单个文件
  uploadFile: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.upload('/upload', formData);
  },

  // 批量上传
  uploadMultiple: async (files) => {
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    return api.upload('/upload/multiple', formData);
  }
};
