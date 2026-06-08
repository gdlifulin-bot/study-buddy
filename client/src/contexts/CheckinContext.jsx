/**
 * 打卡上下文
 * 管理打卡数据加载、筛选、新建
 */

import { createContext, useContext, useState, useCallback } from 'react';
import { checkinService } from '../services/checkinService';

const CheckinContext = createContext(null);

export function CheckinProvider({ children }) {
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(false);

  // 查询打卡记录
  const fetchCheckins = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const data = await checkinService.getCheckins(params);
      setCheckins(data);
    } catch (e) {
      console.error('加载打卡失败:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // 新建打卡
  const addCheckin = useCallback(async (data) => {
    try {
      const newCheckin = await checkinService.createCheckin(data);
      setCheckins(prev => [newCheckin, ...prev]);
      return newCheckin;
    } catch (e) {
      console.error('创建打卡失败:', e);
      throw e;
    }
  }, []);

  // 删除打卡
  const removeCheckin = useCallback(async (id) => {
    try {
      await checkinService.deleteCheckin(id);
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
