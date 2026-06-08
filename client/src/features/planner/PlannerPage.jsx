import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { usePlan } from '../../contexts/PlanContext';
import { useUser } from '../../contexts/UserContext';
import api from '../../services/api';
import { planService } from '../../services/planService';
import MonthSelector from './MonthSelector';
import DayTaskList from './DayTaskList';
import ImportPanel from './ImportPanel';

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

export default function PlannerPage() {
  const { plan, loading, year, month, loadPlan, updateDayTasks, goToMonth } = usePlan();
  const { currentUser, partner } = useUser();
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const [importOpen, setImportOpen] = useState(false);
  const [reminderSent, setReminderSent] = useState(false);
  const dayStripRef = useRef(null);
  const todayButtonRef = useRef(null);

  // On mount and when month changes, reload plan
  useEffect(() => {
    loadPlan(year, month);
  }, [year, month]); // eslint-disable-line react-hooks/exhaustive-deps

  // Get number of days in current month
  const daysInMonth = new Date(year, month, 0).getDate();

  // Tasks for the selected day
  const tasks = plan?.days?.[selectedDay]?.tasks || [];

  // Today info
  const today = new Date();
  const todayDay = today.getDate();
  const isCurrentMonth =
    year === today.getFullYear() && month === today.getMonth() + 1;

  // 【新增】今日计划统计 — 实时计算完成率
  const todayStats = useMemo(() => {
    if (!isCurrentMonth || !plan?.days?.[todayDay]?.tasks) {
      return { total: 0, completed: 0, rate: 0 };
    }
    const todayTasks = plan.days[todayDay].tasks || [];
    const completed = todayTasks.filter(t => t.completed).length;
    const total = todayTasks.length;
    return {
      total,
      completed,
      rate: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  }, [plan, isCurrentMonth, todayDay]);

  // 【新增】判断选中日是否为过去日期（用于逾期标记）
  const selectedDateObj = new Date(year, month - 1, selectedDay);
  const todayObj = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const isPastDay = selectedDateObj < todayObj;

  // Month navigation
  const handlePrevMonth = () => {
    let newMonth = month - 1;
    let newYear = year;
    if (newMonth < 1) {
      newMonth = 12;
      newYear = year - 1;
    }
    goToMonth(newYear, newMonth);
    setSelectedDay(1);
  };

  const handleNextMonth = () => {
    let newMonth = month + 1;
    let newYear = year;
    if (newMonth > 12) {
      newMonth = 1;
      newYear = year + 1;
    }
    goToMonth(newYear, newMonth);
    setSelectedDay(1);
  };

  // Task operations
  const handleToggle = useCallback(
    (taskId) => {
      const updated = tasks.map((t) =>
        t.id === taskId ? { ...t, completed: !t.completed } : t
      );
      updateDayTasks(selectedDay, updated);
    },
    [tasks, selectedDay, updateDayTasks]
  );

  const handleDelete = useCallback(
    (taskId) => {
      const updated = tasks.filter((t) => t.id !== taskId);
      updateDayTasks(selectedDay, updated);
    },
    [tasks, selectedDay, updateDayTasks]
  );

  const handleEdit = useCallback(
    (task) => {
      // For now, editing can be triggered inline via DayTaskList
      // Placeholder for future task detail/edit modal
    },
    []
  );

  const handleAdd = useCallback(
    (taskData) => {
      const newTask = {
        id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        title: taskData.title,
        subject: taskData.subject || 'other',
        completed: false,
        ...(taskData.time ? { time: taskData.time } : {}),
        ...(taskData.note ? { note: taskData.note } : {}),
      };
      // 合并后立即排序，再传给 updateDayTasks
      const combined = [...tasks, newTask];
      combined.sort((a, b) => {
        const getT = (t) => t.time ? (t.time.match(/(\d{1,2}:\d{2})/)?.[1]?.padStart(5,'0') || '99:99') : '99:99';
        return getT(a).localeCompare(getT(b));
      });
      updateDayTasks(selectedDay, combined);
    },
    [tasks, selectedDay, updateDayTasks]
  );

  const handleImport = useCallback(
    async (importedTasks) => {
      if (!importedTasks || importedTasks.length === 0) return;

      // 【新增】按年月分组构建完整计划，一次性保存避免闭包覆盖
      const todayStr = new Date().toISOString().split('T')[0];
      const byMonth = {}; // { "2026-6": { year, month, days: { 10: { tasks: [] }, ... } } }

      for (const t of importedTasks) {
        const date = t.date || todayStr;
        const [y, m, d] = date.split('-').map(Number);
        const key = `${y}-${m}`;
        if (!byMonth[key]) byMonth[key] = { year: y, month: m, days: {} };
        if (!byMonth[key].days[d]) byMonth[key].days[d] = { tasks: [] };
        byMonth[key].days[d].tasks.push({
          id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          title: t.title,
          subject: t.subject || 'other',
          completed: false,
          ...(t.time ? { time: t.time } : {}),
        });
      }

      // 每个月一次性保存（先获取已有数据 → 合并 → 保存）
      for (const [, monthData] of Object.entries(byMonth)) {
        try {
          const existingPlan = await planService.getPlan(currentUser.id, monthData.year, monthData.month);
          const mergedDays = { ...existingPlan.days };
          for (const [d, dayData] of Object.entries(monthData.days)) {
            const exist = existingPlan.days?.[d]?.tasks || [];
            const incoming = dayData.tasks || [];
            // 去重合并
            const merged = [...exist];
            for (const task of incoming) {
              if (!merged.find(t => t.title === task.title)) {
                merged.push(task);
              }
            }
            mergedDays[d] = { tasks: merged };
          }
          await planService.savePlan({
            ...existingPlan,
            userId: currentUser.id,
            year: monthData.year,
            month: monthData.month,
            days: mergedDays
          });
        } catch (e) { console.error('导入保存失败:', e); }
      }

      // 重新加载当前月份以刷新视图
      loadPlan(year, month);
      setImportOpen(false);
    },
    [year, month, currentUser.id, loadPlan]
  );

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Month selector header */}
      <div className="shrink-0 border-b border-[#e5e5e7] px-5 pt-4 pb-3 flex items-center justify-between">
        <MonthSelector
          year={year}
          month={month}
          onPrev={handlePrevMonth}
          onNext={handleNextMonth}
        />
        {/* 【改造】仅组队后显示提醒搭子按钮 */}
        {partner && (
          <button
            onClick={async () => {
              await api.post('/reminders', { fromUserId: currentUser.id, toUserId: partner.id });
              setReminderSent(true);
              setTimeout(() => setReminderSent(false), 2000);
            }}
            className="text-xs text-[#86868b] hover:text-[#1d1d1f]"
          >
            {reminderSent ? '已发送' : '提醒搭子'}
          </button>
        )}
      </div>

      {/* Day strip - horizontal scrollable */}
      <div className="shrink-0 border-b border-[#e5e5e7] py-3" ref={dayStripRef}>
        <div className="flex gap-1 overflow-x-auto px-4 scrollbar-hide">
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const isToday = isCurrentMonth && day === todayDay;
            const isSelected = day === selectedDay;
            const dayTasks = plan?.days?.[day]?.tasks || [];
            const hasTasks = dayTasks.length > 0;

            // 计算今日任务状态颜色
            const getStatusColor = () => {
              if (!hasTasks) return null;
              const allDone = dayTasks.every(t => t.completed);
              if (!allDone && isPastDay) return '#ff3b30'; // 红色：逾期未完成
              if (allDone) return '#34c759'; // 绿色：全部完成
              return '#ff9500'; // 黄色：有未完成任务
            };
            const statusColor = getStatusColor();

            return (
              <button
                key={day}
                data-day={day}
                onClick={() => setSelectedDay(day)}
                className={`relative flex shrink-0 flex-col items-center justify-center gap-0.5 w-10 h-12 rounded-xl text-xs transition-colors ${
                  isSelected
                    ? 'bg-[#1d1d1f] text-white'
                    : isToday
                    ? 'bg-gray-100 text-[#1d1d1f]'
                    : 'text-[#86868b] hover:bg-gray-50'
                }`}
              >
                <span className="text-[10px] opacity-70">
                  {WEEKDAY_LABELS[new Date(year, month - 1, day).getDay()]}
                </span>
                <span className="font-medium">{day}</span>
                {/* 状态指示条 */}
                {statusColor && (
                  <span
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 rounded-full transition-all"
                    style={{
                      width: '60%',
                      backgroundColor: isSelected ? 'white' : statusColor
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 【新增】今日计划统计栏 — 极简文字，仅当前月份显示 */}
      {isCurrentMonth && todayStats.total > 0 && (
        <div className="shrink-0 px-5 py-2 border-b border-[#e5e5e7] bg-gray-50/50">
          <p className="text-xs text-[#86868b]">
            今日计划：已完成{todayStats.completed}项 / 总计{todayStats.total}项，完成率{todayStats.rate}%
          </p>
        </div>
      )}

      {/* Task list area */}
      <div className="flex-1 overflow-y-auto px-5 py-2">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-[#86868b]">加载中...</p>
          </div>
        ) : (
          <DayTaskList
            day={selectedDay}
            tasks={tasks}
            isPastDay={isPastDay}
            onToggle={handleToggle}
            onDelete={handleDelete}
            onEdit={handleEdit}
            onAdd={handleAdd}
          />
        )}
      </div>

      {/* "回到今天" 浮动按钮 — 当期月份且选中日不是今天时显示 */}
      {isCurrentMonth && selectedDay !== todayDay && (
        <button
          onClick={() => {
            setSelectedDay(todayDay);
            const btn = document.querySelector(`[data-day="${todayDay}"]`);
            if (btn) btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
          }}
          className="fixed right-5 bottom-36 z-20 flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur border border-[#e5e5e7] px-3 py-2 text-xs text-[#0071e3] shadow-md hover:bg-white transition-all"
          aria-label="回到今天"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12,6 12,12 16,14" />
          </svg>
          回到今天
        </button>
      )}

      {/* Floating + button */}
      <button
        onClick={() => setImportOpen(true)}
        className="fixed right-5 bottom-20 z-20 flex w-12 h-12 items-center justify-center rounded-full bg-[#1d1d1f] text-white shadow-lg hover:bg-black transition-colors"
        aria-label="导入计划"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {/* Import panel modal */}
      <ImportPanel
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={handleImport}
      />
    </div>
  );
}
