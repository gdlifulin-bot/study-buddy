import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SUBJECTS } from '../../config/constants';
import { aiService } from '../../services/aiService';
import { usePlan } from '../../contexts/PlanContext';

const DEFAULT_TIME_SLOTS = ['08:00-10:00', '14:00-16:00', '19:00-21:00'];

export default function AIPlanGenerator() {
  const navigate = useNavigate();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [timeSlots, setTimeSlots] = useState([...DEFAULT_TIME_SLOTS]);
  const [goal, setGoal] = useState('');
  const [focusSubjects, setFocusSubjects] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);     // AI 生成的计划
  const [error, setError] = useState('');         // 错误信息
  const [importing, setImporting] = useState(false); // 导入中

  const handleAddTimeSlot = () => {
    setTimeSlots([...timeSlots, '']);
  };

  const handleRemoveTimeSlot = (index) => {
    setTimeSlots(timeSlots.filter((_, i) => i !== index));
  };

  const handleTimeSlotChange = (index, value) => {
    const updated = [...timeSlots];
    updated[index] = value;
    setTimeSlots(updated);
  };

  const handleToggleSubject = (key) => {
    setFocusSubjects((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const { importAIPlan } = usePlan();

  // 调用 DeepSeek AI 生成计划
  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    setResult(null);
    try {
      const response = await aiService.generatePlan({
        startDate,
        endDate,
        timeSlots: timeSlots.filter(s => s.trim()),
        goal: goal.trim(),
        subjects: focusSubjects
      });
      if (response.plan && response.plan.length > 0) {
        setResult(response.plan);
      } else {
        setError('AI 未能生成有效计划，请调整输入后重试');
      }
    } catch (err) {
      setError(err.message || 'AI 生成失败，请检查网络后重试');
    } finally {
      setSubmitting(false);
    }
  };

  // 导入 AI 计划到计划表
  const handleImport = async () => {
    if (!result) return;
    setImporting(true);
    try {
      await importAIPlan(result);
      navigate('/planner');
    } catch (err) {
      setError('导入失败: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  const isValid =
    startDate &&
    endDate &&
    timeSlots.some((s) => s.trim()) &&
    goal.trim();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-[#e5e5e7]">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate('/planner')}
            className="w-8 h-8 flex items-center justify-center rounded-full border border-[#e5e5e7] text-[#86868b] hover:bg-gray-50 transition-colors shrink-0"
            aria-label="返回"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-[#1d1d1f]">
            AI 生成计划
          </h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-8">
        {/* 学习时期 */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-[#1d1d1f]">
            学习时期
          </label>
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-[#e5e5e7] rounded-xl bg-white text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/20 focus:border-[#0071e3]"
              placeholder="开始日期"
            />
            <span className="text-sm text-[#86868b]">至</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-[#e5e5e7] rounded-xl bg-white text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/20 focus:border-[#0071e3]"
              placeholder="结束日期"
            />
          </div>
        </div>

        {/* 每日空闲时间段 */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-[#1d1d1f]">
            每日空闲时间段
          </label>
          <div className="space-y-2">
            {timeSlots.map((slot, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={slot}
                  onChange={(e) => handleTimeSlotChange(index, e.target.value)}
                  placeholder="08:00-10:00"
                  className="flex-1 px-3 py-2 text-sm border border-[#e5e5e7] rounded-xl bg-white text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/20 focus:border-[#0071e3]"
                />
                <button
                  onClick={() => handleRemoveTimeSlot(index)}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-[#86868b] hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                  aria-label="移除此时间段"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={handleAddTimeSlot}
            className="text-sm text-[#0071e3] hover:text-blue-600 transition-colors"
          >
            + 添加时间段
          </button>
        </div>

        {/* 学习目标 */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-[#1d1d1f]">
            学习目标
          </label>
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            rows={4}
            className="w-full px-4 py-3 text-sm border border-[#e5e5e7] rounded-2xl bg-white text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/20 focus:border-[#0071e3] resize-y"
            placeholder="例如：完成数学一轮复习，英语词汇量达到8000，专业课过一遍..."
          />
        </div>

        {/* 重点科目 */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-[#1d1d1f]">
            重点科目
          </label>
          <div className="flex flex-wrap gap-2">
            {SUBJECTS.map((subject) => {
              const isSelected = focusSubjects.includes(subject.key);
              return (
                <button
                  key={subject.key}
                  onClick={() => handleToggleSubject(subject.key)}
                  className={`px-4 py-2 text-sm rounded-full border transition-colors ${
                    isSelected
                      ? 'text-white border-transparent'
                      : 'text-[#1d1d1f] border-[#e5e5e7] hover:bg-gray-50'
                  }`}
                  style={
                    isSelected
                      ? { backgroundColor: subject.color, borderColor: subject.color }
                      : {}
                  }
                >
                  <span className="flex items-center gap-1.5">
                    <span
                      className="inline-block w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: isSelected ? 'white' : subject.color,
                      }}
                    />
                    {subject.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 生成按钮 / 导入按钮 */}
        {!result ? (
          <button
            onClick={handleSubmit}
            disabled={!isValid || submitting}
            className="w-full py-3 text-sm font-medium text-white bg-[#1d1d1f] rounded-full hover:bg-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? 'AI 生成中...' : '生成计划'}
          </button>
        ) : (
          <button
            onClick={handleImport}
            disabled={importing}
            className="w-full py-3 text-sm font-medium text-white bg-[#0071e3] rounded-full hover:bg-blue-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {importing ? '导入中...' : `导入 ${result.length} 天计划到计划表`}
          </button>
        )}

        {/* 错误提示 */}
        {error && (
          <div className="rounded-2xl bg-red-50 border border-red-100 p-4 text-center">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* AI 生成结果预览 */}
        {result && (
          <div className="rounded-2xl bg-gray-50 border border-[#e5e5e7] p-6">
            <h3 className="text-sm font-medium text-[#1d1d1f] mb-4">
              生成结果预览（{result.length} 天）
            </h3>
            <div className="max-h-80 overflow-y-auto space-y-3">
              {result.slice(0, 7).map((dayPlan, i) => (
                <div key={i} className="bg-white rounded-xl p-3 border border-[#e5e5e7]">
                  <p className="text-xs font-medium text-[#86868b] mb-2">{dayPlan.date}</p>
                  {dayPlan.tasks.map((task, j) => (
                    <div key={j} className="flex items-center gap-2 py-1 text-sm text-[#1d1d1f]">
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: SUBJECTS.find(s => s.key === task.subject)?.color || '#86868b' }}
                      />
                      {task.time && <span className="text-xs text-[#86868b]">{task.time}</span>}
                      <span className="truncate">{task.title}</span>
                    </div>
                  ))}
                </div>
              ))}
              {result.length > 7 && (
                <p className="text-xs text-center text-[#86868b] py-2">
                  ... 还有 {result.length - 7} 天（导入后完整显示）
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
