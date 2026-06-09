/**
 * 打卡上下文
 * 管理打卡数据加载、筛选、新建
 */
import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { checkinService } from '../services/checkinService';

const CheckinContext = createContext(null);

export function CheckinProvider({ children }) {
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(false);
  const lastFetchRef = useRef(0);

  // 查询打卡记录（带防抖，避免竞态覆盖）
  const fetchCheckins = useCallback(async (params = {}) => {
    const fetchId = Date.now();
    lastFetchRef.current = fetchId;
    setLoading(true);
    try {
      const data = await checkinService.getCheckins(params);
      // 如果这不是最新发起的请求，忽略结果
      if (lastFetchRef.current === fetchId) {
        setCheckins(data);
      }
    } catch (e) {
      console.error('加载打卡失败:', e);
    } finally {
      if (lastFetchRef.current === fetchId) {
        setLoading(false);
      }
    }
  }, []);

  // 新建打卡 — 成功后重新拉取完整列表，确保数据一致
  const addCheckin = useCallback(async (data) => {
    try {
      await checkinService.createCheckin(data);
      // 重新拉取，用服务端数据替换本地乐观更新
      fetchCheckins({ userId: data.userId, subject: data.subject });
    } catch (e) {
      console.error('创建打卡失败:', e);
      throw e;
    }
  }, [fetchCheckins]);

  // 删除打卡
  const removeCheckin = useCallback(async (id, userId) => {
    try {
      await checkinService.deleteCheckin(id, userId);
      setCheckins(prev => prev.filter(c => c.id !== id));
    } catch (e) {
      console.error('删除打卡失败:', e);
    }
  }, []);

  return (
    <CheckinContext.Provider value={{
      checkins, loading,
      fetchCheckins, addCheckin, removeCheckin
    }}>
      {children}
    </CheckinContext.Provider>
  );
}

export function useCheckin() {
  const ctx = useContext(CheckinContext);
  if (!ctx) throw new Error('useCheckin 必须在 CheckinProvider 内使用');
  return ctx;
}

export default CheckinContext;
