/**
 * 【新增】登录/注册弹窗
 * 首次访问时自动弹出，极简圆角设计，与全站风格统一
 * 修改位置：App.jsx 中根据登录状态控制显示
 */

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function AuthModal() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password.trim()) {
      setError('请填写账号和密码');
      return;
    }
    setSubmitting(true);
    try {
      if (mode === 'register') {
        await register(username.trim(), password);
      } else {
        await login(username.trim(), password);
      }
    } catch (err) {
      setError(err.message || '操作失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white">
      <div className="w-full max-w-sm px-8">
        {/* 标题 */}
        <div className="mb-10 text-center">
          <h1 className="text-2xl font-light tracking-[0.15em] text-[#1d1d1f]">考研搭子</h1>
          <p className="mt-2 text-sm text-[#86868b]">
            {mode === 'login' ? '登录你的账户' : '创建新账户'}
          </p>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="账号"
            autoFocus
            className="w-full rounded-apple border border-[#e5e5e7] bg-[#f5f5f7] px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-[#1d1d1f] placeholder:text-[#86868b]"
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="密码"
            className="w-full rounded-apple border border-[#e5e5e7] bg-[#f5f5f7] px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-[#1d1d1f] placeholder:text-[#86868b]"
          />

          {error && <p className="text-xs text-red-500 text-center">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-apple bg-[#1d1d1f] py-3 text-sm text-white transition hover:bg-black disabled:opacity-40"
          >
            {submitting ? '请稍候...' : mode === 'login' ? '登录' : '注册'}
          </button>
        </form>

        {/* 切换模式 */}
        <p className="mt-6 text-center text-xs text-[#86868b]">
          {mode === 'login' ? '没有账户？' : '已有账户？'}
          <button
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
            className="ml-1 text-[#0071e3] hover:text-blue-600"
          >
            {mode === 'login' ? '注册' : '登录'}
          </button>
        </p>
      </div>
    </div>
  );
}
