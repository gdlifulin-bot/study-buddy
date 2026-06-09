/**
 * 学习计划上下文
 * 管理当前查看的月份、计划数据加载与缓存
 * 使用 ref 避免 updateDayTasks 闭包捕获旧 plan
 */

import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { planService } from '../services/planService';
import { useUser } from './UserContext';

const PlanContext = createContext(null);

/** 按时间排序 */
function sortByTime(tasks) {
  if (!tasks || tasks.length === 0) return [];
  return [...tasks].sort((a, b) => {
    const getStart = (t) => {
      if (!t.time) return '99:99';
      const m = t.time.match(/(\d{1,2}:\d{2})/);
      return m ? m[1].padStart(5, '0') : '99:99';
    };
    return getStart(a).localeCompare(getStart(b));
  });
}

export function PlanProvider({ children }) {
  const { currentUser } = useUser();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const planRef = useRef(null); // 始终指向最新 plan，解决闭包问题

  // 同步 ref
  useEffect(() => { planRef.current = plan; }, [plan]);

  // 加载计划（自动排序）
  const loadPlan = useCallback(async (y, m) => {
    setLoading(true);
    try {
      const data = await planService.getPlan(currentUser.id, y, m);
      if (data?.days) {
        for (const d of Object.keys(data.days)) {
          data.days[d] = { tasks: sortByTime(data.days[d].tasks || []) };
        }
      }
      setPlan(data);
    } catch (e) {
      console.error('加载计划失败:', e);
    } finally {
      setLoading(false);
    }
  }, [currentUser.id]);

  // 更新某一天 — 用 ref 读最新 plan.id，functional setPlan 读最新 plan
  const updateDayTasks = useCallback(async (day, tasks) => {
    const sorted = sortByTime(tasks);
    // functional setPlan 保证拿到最新 plan
    setPlan(prev => {
      if (!prev) return prev;
      return { ...prev, days: { ...prev.days, [day]: { tasks: sorted } } };
    });
    try {
      if (planRef.current?.id) {
        await planService.updateDayTasks(planRef.current.id, day, sorted, currentUser.id);
      }
    } catch (e) {
      console.error('保存任务失败:', e);
    }
  }, [currentUser.id]);

  // 切换月份
  const goToMonth = useCallback((y, m) => {
    setYear(y);
    setMonth(m);
    loadPlan(y, m);
  }, [loadPlan]);

  // AI 批量导入（同上用 ref）
  const importAIPlan = useCallback(async (aiPlan) => {
    const byMonth = {};
    for (const dayPlan of aiPlan) {
      const [y, m, d] = dayPlan.date.split('-').map(Number);
      const key = `${y}-${m}`;
      if (!byMonth[key]) byMonth[key] = { year: y, month: m, days: {} };
      const existing = byMonth[key].days[d]?.tasks || [];
      const merged = [...existing];
      for (const task of dayPlan.tasks) {
        if (!merged.find(t => t.title === task.title)) {
          merged.push({ ...task, completed: false, id: `ai_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` });
        }
      }
      byMonth[key].days[d] = { tasks: sortByTime(merged) };
    }
    for (const [, monthData] of Object.entries(byMonth)) {
      try {
        const existingPlan = await planService.getPlan(currentUser.id, monthData.year, monthData.month);
        const mergedDays = { ...existingPlan.days, ...monthData.days };
        for (const [d, dayData] of Object.entries(monthData.days)) {
          if (existingPlan.days?.[d]) {
            const exist = existingPlan.days[d].tasks || [];
            const incoming = dayData.tasks || [];
            const merged = [...exist];
            for (const task of incoming) {
              if (!merged.find(t => t.title === task.title)) merged.push(task);
            }
            mergedDays[d] = { tasks: sortByTime(merged) };
          }
        }
        await planService.savePlan({ ...existingPlan, userId: currentUser.id, year: monthData.year, month: monthData.month, days: mergedDays });
      } catch (e) { console.error('导入计划失败:', e); }
    }
    const firstKey = Object.keys(byMonth)[0];
    if (firstKey) { const { year: y, month: m } = byMonth[firstKey]; goToMonth(y, m); return { year: y, month: m }; }
  }, [currentUser.id, goToMonth]);

  return (
    <PlanContext.Provider value={{ plan, loading, year, month, loadPlan, updateDayTasks, goToMonth, importAIPlan }}>
      {children}
    </PlanContext.Provider>
  );
}

export function usePlan() {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error('usePlan 必须在 PlanProvider 内使用');
  return ctx;
}

export default PlanContext;
