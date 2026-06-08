import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',  // 暴露到局域网，方便搭子访问
    port: 5173,
    allowedHosts: true,  // 允许公网隧道域名访问（localtunnel）
    // 代理 API 请求到后端
    proxy: {
      '/api': 'http://localhost:3001',
      '/uploads': 'http://localhost:3001'
    }
  }
});
