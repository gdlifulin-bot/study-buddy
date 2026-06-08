/**
 * 认证上下文
 * 管理登录状态，启动时后端校验凭证有效性
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

/** 清空本站全部 localStorage */
export function clearAllCache() {
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const k = localStorage.key(i);
    if (k) localStorage.removeItem(k);
  }
}

export function AuthProvider({ children }) {
  const [sessionUser, setSessionUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [partner, setPartner] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const saved = localStorage.getItem('studybuddy_session');

    if (!saved) {
      setLoading(false);
      return;
    }

    // 有旧凭证 → 向后端验证
    let user;
    try { user = JSON.parse(saved); } catch { clearAllCache(); setLoading(false); return; }
    if (!user?.username) { clearAllCache(); setLoading(false); return; }

    // 用搜索接口验证账号是否真实存在（比 partner 接口更可靠）
    api.get(`/auth/search?q=${encodeURIComponent(user.username)}&exclude=`).then(res => {
      if (cancelled) return;
      const found = Array.isArray(res) && res.some(u => u.username === user.username);
      if (found) {
        setSessionUser(user);
        setIsLoggedIn(true);
        // 异步查搭子
        api.get(`/auth/partner?username=${user.username}`).then(r => {
          if (!cancelled) setPartner(r.partner ? { username: r.partner } : null);
        }).catch(() => {});
      } else {
        clearAllCache();
      }
      setLoading(false);
    }).catch(() => {
      // 网络不通 → 不删凭证，直接放行（离线也能用）
      if (!cancelled) {
        setSessionUser(user);
        setIsLoggedIn(true);
        setLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, []);

  const register = useCallback(async (username, password) => {
    const res = await api.post('/auth/register', { username, password });
    const user = res.user;
    localStorage.setItem('studybuddy_session', JSON.stringify(user));
    setSessionUser(user);
    setIsLoggedIn(true);
    return user;
  }, []);

  const login = useCallback(async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    const user = res.user;
    localStorage.setItem('studybuddy_session', JSON.stringify(user));
    setSessionUser(user);
    setIsLoggedIn(true);
    try {
      const r = await api.get(`/auth/partner?username=${username}`);
      setPartner(r.partner ? { username: r.partner } : null);
    } catch { setPartner(null); }
    return user;
  }, []);

  const logout = useCallback(() => {
    clearAllCache();
    setSessionUser(null);
    setIsLoggedIn(false);
    setPartner(null);
  }, []);

  const refreshPartner = useCallback(async () => {
    if (!sessionUser) return;
    try {
      const res = await api.get(`/auth/partner?username=${sessionUser.username}`);
      setPartner(res.partner ? { username: res.partner } : null);
    } catch { setPartner(null); }
  }, [sessionUser]);

  return (
    <AuthContext.Provider value={{
      sessionUser, isLoggedIn, loading, partner,
      login, register, logout, refreshPartner
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth 必须在 AuthProvider 内使用');
  return ctx;
}

export default AuthContext;
