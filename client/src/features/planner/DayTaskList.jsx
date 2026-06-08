import React, { useState, useMemo } from 'react';
import TaskItem from './TaskItem';
import { SUBJECTS } from '../../config/constants';

export default function DayTaskList({ day, tasks, isPastDay, onToggle, onDelete, onEdit, onAdd }) {
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('math');
  const [newTime, setNewTime] = useState('');
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  // 计划模板管理
  const templates = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('plan_templates') || '[]');
    } catch { return []; }
  }, [tasks]); // tasks 变化时刷新

  const saveAsTemplate = () => {
    if (!tasks || tasks.length === 0) return;
    const name = prompt('模板名称（例如：每日计划）：', '我的模板');
    if (!name || !name.trim()) return;
    const templateTasks = tasks.map(t => ({ title: t.title, subject: t.subject || 'other', time: t.time || '' }));
    const newTemplate = { name: name.trim(), id: Date.now().toString(), tasks: templateTasks };
    const all = [...templates, newTemplate];
    localStorage.setItem('plan_templates', JSON.stringify(all));
  };

  const loadTemplate = (template) => {
    if (!template?.tasks) return;
    for (const t of template.tasks) {
      onAdd({ title: t.title, subject: t.subject, time: t.time || undefined });
    }
    setShowTemplatePicker(false);
  };

  // 【新增】按时间排序显示
  const sortedTasks = useMemo(() => {
    if (!tasks || tasks.length === 0) return [];
    return [...tasks].sort((a, b) => {
      const getStart = (t) => {
        if (!t.time) return '99:99';
        const m = t.time.match(/(\d{1,2}:\d{2})/);
        return m ? m[1].padStart(5, '0') : '99:99';
      };
      return getStart(a).localeCompare(getStart(b));
    });
  }, [tasks]);

  const handleConfirmAdd = () => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;

    onAdd({
      title: trimmed,
      subject: newSubject,
      time: newTime || undefined,
    });

    setNewTitle('');
    setNewTime('');
    setNewSubject('math');
    setAdding(false);
  };

  const handleCancelAdd = () => {
    setNewTitle('');
    setNewTime('');
    setNewSubject('math');
    setAdding(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleConfirmAdd();
    } else if (e.key === 'Escape') {
      handleCancelAdd();
    }
  };

  if (!sortedTasks || sortedTasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-[#86868b] text-sm mb-4">今日暂无任务</p>
        {!adding ? (
          <button
            onClick={() => setAdding(true)}
            className="text-sm text-[#0071e3] hover:text-blue-600 transition-colors"
          >
            添加任务
          </button>
        ) : (
          <div className="w-full max-w-sm space-y-3">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入任务名称"
              className="w-full px-3 py-2 text-sm border border-[#e5e5e7] rounded-xl bg-white text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/20 focus:border-[#0071e3]"
              autoFocus
            />
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="时间，如 08:00-10:00"
                className="flex-1 px-3 py-1.5 text-xs border border-[#e5e5e7] rounded-xl bg-white text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/20 focus:border-[#0071e3]"
              />
              <select
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                className="px-3 py-1.5 text-xs border border-[#e5e5e7] rounded-xl bg-white text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/20 focus:border-[#0071e3]"
              >
                {SUBJECTS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleConfirmAdd}
                disabled={!newTitle.trim()}
                className="px-4 py-1.5 text-xs font-medium text-white bg-[#0071e3] rounded-full hover:bg-blue-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                确认
              </button>
              <button
                onClick={handleCancelAdd}
                className="px-4 py-1.5 text-xs text-[#86868b] hover:text-[#1d1d1f] transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="divide-y divide-[#e5e5e7]">
        {sortedTasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            isOverdue={isPastDay && !task.completed}
            onToggle={onToggle}
            onDelete={onDelete}
            onEdit={onEdit}
          />
        ))}
      </div>

      {adding ? (
        <div className="mt-4 p-4 bg-gray-50 rounded-2xl space-y-3">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入任务名称"
            className="w-full px-3 py-2 text-sm border border-[#e5e5e7] rounded-xl bg-white text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/20 focus:border-[#0071e3]"
            autoFocus
          />
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="时间，如 08:00-10:00"
              className="flex-1 px-3 py-1.5 text-xs border border-[#e5e5e7] rounded-xl bg-white text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/20 focus:border-[#0071e3]"
            />
            <select
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              className="px-3 py-1.5 text-xs border border-[#e5e5e7] rounded-xl bg-white text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/20 focus:border-[#0071e3]"
            >
              {SUBJECTS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleConfirmAdd}
              disabled={!newTitle.trim()}
              className="px-4 py-1.5 text-xs font-medium text-white bg-[#0071e3] rounded-full hover:bg-blue-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              确认
            </button>
            <button
              onClick={handleCancelAdd}
              className="px-4 py-1.5 text-xs text-[#86868b] hover:text-[#1d1d1f] transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setAdding(true)}
            className="text-sm text-[#0071e3] hover:text-blue-600 transition-colors"
          >
            添加任务
          </button>
          {/* 保存为模板 */}
          <button
            onClick={saveAsTemplate}
            className="text-sm text-[#86868b] hover:text-[#1d1d1f] transition-colors"
          >
            保存为模板
          </button>
          {/* 从模板加载 */}
          {templates.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowTemplatePicker(!showTemplatePicker)}
                className="text-sm text-[#86868b] hover:text-[#1d1d1f] transition-colors"
              >
                从模板加载
              </button>
              {showTemplatePicker && (
                <div className="absolute left-0 top-full mt-1 z-20 w-40 rounded-apple-lg border border-[#e5e5e7] bg-white shadow-lg py-1">
                  {templates.map((tpl, i) => (
                    <button
                      key={tpl.id || i}
                      onClick={() => loadTemplate(tpl)}
                      className="w-full px-3 py-1.5 text-left text-sm text-[#1d1d1f] hover:bg-[#f5f5f7] transition"
                    >
                      {tpl.name} ({tpl.tasks.length}项)
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
