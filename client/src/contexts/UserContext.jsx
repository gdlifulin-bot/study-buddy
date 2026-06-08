/**
 * 用户上下文
 * 【改造】从 AuthContext 读取真实登录用户，替代原有的 user1/user2 硬编码切换
 * partner 由 AuthContext 的组队状态动态计算
 *
 * 【扩展点】组队逻辑变更时，修改此文件即可
 */

import { createContext, useContext, useMemo } from 'react';
import { useAuth } from './AuthContext';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const { sessionUser, partner: authPartner } = useAuth();

  // 当前用户对象 — 兼容原有 { id, name } 格式
  const currentUser = useMemo(() => ({
    id: sessionUser?.username || '',
    name: sessionUser?.username || ''
  }), [sessionUser]);

  // 搭子信息 — 组队成功才有值
  const partner = useMemo(() => authPartner ? {
    id: authPartner.username,
    name: authPartner.username
  } : null, [authPartner]);

  return (
    <UserContext.Provider value={{ currentUser, partner }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser 必须在 UserProvider 内使用');
  return ctx;
}

export default UserContext;
