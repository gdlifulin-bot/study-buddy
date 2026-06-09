/**
 * 【新增】学习周报 / 月报页面
 * 独立功能模块，与计划表、打卡平级
 * 展示：完成率、时长统计、科目分布、未完成任务、AI 建议
 *
 * 修改入口：底部导航、路由配置
 * 扩展预留：底栏「历史报表」入口
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useUser } from '../../contexts/UserContext';
import { planService } from '../../services/planService';
import { checkinService } from '../../services/checkinService';
import { reportService } from '../../services/reportService';
import { SUBJECTS } from '../../config/constants';
import PartnerSelector from '../checkin/PartnerSelector';
import CompletionRing from './CompletionRing';
import CompareView from './CompareView';
import CheerButton from '../checkin/CheerButton';

export default function ReportPage() {
  const { currentUser, partner } = useUser();
  const [view, setView] = useState('week'); // 'week' | 'month'
  const [viewUser, setViewUser] = useState(currentUser.id);
  const [mode, setMode] = useState('personal'); // 'personal' | 'compare'
  const [loading, setLoading] = useState(true);
  const [planData, setPlanData] = useState(null);
  const [checkinData, setCheckinData] = useState([]);
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // 计算周/月时间范围
  const dateRange = useMemo(() => {
    const now = new Date();
    if (view === 'week') {
      const dayOfWeek = now.getDay() || 7; // 周日=7
      const monday = new Date(now);
      monday.setDate(now.getDate() - dayOfWeek + 1);
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);
      return {
        start: monday,
        end: sunday,
        label: `${formatShort(monday)} - ${formatShort(sunday)}`,
        dates: getDatesBetween(monday, sunday)
      };
    } else {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return {
        start: firstDay,
        end: lastDay,
        label: `${now.getFullYear()}年${now.getMonth() + 1}月`,
        dates: getDatesBetween(firstDay, lastDay)
      };
    }
  }, [view]);

  // 加载数据
  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      setLoading(true);
      try {
        // 加载该周期的计划数据（可能需要跨月）
        const months = getMonthsInRange(dateRange.start, dateRange.end);
        const planPromises = months.map(m =>
          planService.getPlan(viewUser, m.year, m.month)
        );
        const plans = await Promise.all(planPromises);
        setPlanData(plans.filter(Boolean));

        // 加载打卡数据
        const checkins = await checkinService.getCheckins({
          userId: viewUser,
          date: dateRange.start.toISOString().split('T')[0]
        });
        // 获取所有期间的打卡（分批查询）
        const allCheckins = [];
        for (const d of dateRange.dates.slice(0, 31)) { // 最多31天
          const items = await checkinService.getCheckins({
            userId: viewUser,
            date: d
          });
          allCheckins.push(...items);
        }
        if (!cancelled) setCheckinData(allCheckins);
      } catch (e) {
        console.error('加载报表数据失败:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadData();
    return () => { cancelled = true; };
  }, [viewUser, dateRange]);

  // 统计数据
  const stats = useMemo(() => {
    // 计划统计
    let totalTasks = 0, completedTasks = 0, incompleteTasks = [];
    if (planData) {
      for (const plan of planData) {
        for (const [dayStr, dayData] of Object.entries(plan.days || {})) {
          const day = parseInt(dayStr);
          const dateStr = `${plan.year}-${String(plan.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          if (!dateRange.dates.includes(dateStr)) continue;
          const tasks = dayData.tasks || [];
          totalTasks += tasks.length;
          for (const t of tasks) {
            if (t.completed) completedTasks++;
            else incompleteTasks.push({ ...t, date: dateStr });
          }
        }
      }
    }
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // 打卡时长统计
    let totalDuration = 0;
    const subjectDurations = { math: 0, english: 0, professional: 0, politics: 0 };
    for (const c of checkinData) {
      const dur = c.duration || 0;
      totalDuration += dur;
      if (subjectDurations[c.subject] !== undefined) {
        subjectDurations[c.subject] += dur;
      }
    }

    return {
      totalTasks, completedTasks, completionRate, incompleteTasks,
      totalDuration, subjectDurations
    };
  }, [planData, checkinData, dateRange]);

  // AI 建议
  const fetchAISuggestion = useCallback(async () => {
    setAiLoading(true);
    try {
      const result = await reportService.getSuggestion({
        period: view === 'week' ? '本周' : '本月',
        completionRate: stats.completionRate,
        totalDuration: stats.totalDuration,
        subjectDurations: stats.subjectDurations,
        incompleteCount: stats.incompleteTasks.length
      });
      setAiSuggestion(result.suggestion || '');
    } catch (e) {
      console.error('AI 建议获取失败:', e);
    } finally {
      setAiLoading(false);
    }
  }, [view, stats]);

  // 自动获取 AI 建议
  useEffect(() => {
    if (!loading && (stats.totalTasks > 0 || stats.totalDuration > 0)) {
      fetchAISuggestion();
    }
  }, [loading, stats.totalTasks, stats.totalDuration]); // eslint-disable-line

  // 生成报表文本
  const reportText = useMemo(() => {
    const lines = [
      `学习${view === 'week' ? '周' : '月'}报 · ${dateRange.label}`,
      '',
      `计划完成率：${stats.completionRate}%（${stats.completedTasks}/${stats.totalTasks}）`,
      `总学习时长：${formatMinutes(stats.totalDuration)}`,
      '',
      '各科时长：',
    ];
    SUBJECTS.forEach(s => {
      lines.push(`  ${s.label}：${formatMinutes(stats.subjectDurations[s.key] || 0)}`);
    });
    if (stats.incompleteTasks.length > 0) {
      lines.push('');
      lines.push(`未完成任务（${stats.incompleteTasks.length}项）：`);
      stats.incompleteTasks.slice(0, 10).forEach(t => {
        lines.push(`  - ${t.title}`);
      });
    }
    if (aiSuggestion) {
      lines.push('');
      lines.push('AI 学习建议：');
      aiSuggestion.split('\n').filter(Boolean).forEach(line => {
        lines.push(`  ${line}`);
      });
    }
    return lines.join('\n');
  }, [stats, aiSuggestion, view, dateRange]);

  // 复制报表
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(reportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = reportText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-white">
        <p className="text-sm text-[#86868b]">加载中...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-white">
      {/* 顶部：视图切换 + 用户切换 */}
      <div className="shrink-0 border-b border-[#e5e5e7] px-5 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-medium text-[#1d1d1f]">学习报表</h1>
          <div className="flex items-center gap-2">
            {viewUser !== currentUser.id && partner && (
              <CheerButton fromUserId={currentUser.id} toUserId={viewUser} compact />
            )}
            <PartnerSelector
              viewUser={viewUser}
              onChange={setViewUser}
            />
          </div>
        </div>

        {/* 模式切换：个人 | 对比 */}
        {partner && (
          <div className="flex gap-0 rounded-apple bg-[#f5f5f7] p-0.5 mb-2">
            <button
              onClick={() => setMode('personal')}
              className={`flex-1 rounded-apple py-2 text-xs transition ${
                mode === 'personal' ? 'bg-white text-[#1d1d1f] shadow-sm' : 'text-[#86868b]'
              }`}
            >
              个人
            </button>
            <button
              onClick={() => setMode('compare')}
              className={`flex-1 rounded-apple py-2 text-xs transition ${
                mode === 'compare' ? 'bg-white text-[#1d1d1f] shadow-sm' : 'text-[#86868b]'
              }`}
            >
              对比
            </button>
          </div>
        )}

        {/* 周/月切换 */}
        <div className="flex gap-0 rounded-apple bg-[#f5f5f7] p-0.5">
          <button
            onClick={() => setView('week')}
            className={`flex-1 rounded-apple py-2 text-xs transition ${
              view === 'week' ? 'bg-white text-[#1d1d1f] shadow-sm' : 'text-[#86868b]'
            }`}
          >
            周报
          </button>
          <button
            onClick={() => setView('month')}
            className={`flex-1 rounded-apple py-2 text-xs transition ${
              view === 'month' ? 'bg-white text-[#1d1d1f] shadow-sm' : 'text-[#86868b]'
            }`}
          >
            月报
          </button>
        </div>
        <p className="mt-2 text-xs text-[#86868b]">{dateRange.label}</p>
      </div>

      {/* 对比视图 */}
      {mode === 'compare' && partner && (
        <CompareView
          user1={currentUser.id}
          user2={partner.id}
          user1Name={currentUser.name}
          user2Name={partner.name}
          period={view}
          onClose={() => setMode('personal')}
        />
      )}

      {/* 个人视图 */}
      {mode === 'personal' && (
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-8">
        {/* 1. 周期完成率 — 圆环图表 */}
        <StatSection title={`${view === 'week' ? '本周' : '本月'}计划完成率`}>
          <CompletionRing
            rate={stats.completionRate}
            size={100}
            color={stats.completionRate >= 80 ? '#34c759' : stats.completionRate >= 50 ? '#ff9500' : '#ff3b30'}
            label={`${stats.completedTasks}/${stats.totalTasks} 项`}
          />
        </StatSection>

        {/* 2. 累计学习时长 */}
        <StatSection title="累计学习时长">
          <p className="text-2xl font-light tracking-wider text-[#1d1d1f]">
            {formatMinutes(stats.totalDuration)}
          </p>
        </StatSection>

        {/* 3. 各科时长明细 — 带进度条 */}
        <StatSection title="各科学习时长">
          <div className="space-y-3">
            {SUBJECTS.map(s => {
              const dur = stats.subjectDurations[s.key] || 0;
              const maxDur = Math.max(...Object.values(stats.subjectDurations), 1);
              const pct = Math.round((dur / maxDur) * 100);
              return (
                <div key={s.key} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="text-sm text-[#1d1d1f]">{s.label}</span>
                    </div>
                    <span className="text-sm text-[#86868b]">{formatMinutes(dur)}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[#f5f5f7] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: s.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </StatSection>

        {/* 4. 未完成任务 */}
        {stats.incompleteTasks.length > 0 && (
          <StatSection title="未完成任务">
            <div className="space-y-1.5">
              {stats.incompleteTasks.slice(0, 15).map((t, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-[#86868b] shrink-0 mt-0.5">{t.date.slice(5)}</span>
                  <span className="text-[#1d1d1f]">{t.title}</span>
                </div>
              ))}
              {stats.incompleteTasks.length > 15 && (
                <p className="text-xs text-[#86868b]">...还有 {stats.incompleteTasks.length - 15} 项</p>
              )}
            </div>
          </StatSection>
        )}

        {/* 5. AI 建议 */}
        <StatSection title="AI 学习建议">
          {aiLoading ? (
            <p className="text-sm text-[#86868b]">生成中...</p>
          ) : aiSuggestion ? (
            <div className="text-sm text-[#1d1d1f] leading-relaxed space-y-1">
              {aiSuggestion.split('\n').filter(Boolean).map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          ) : (
            <button
              onClick={fetchAISuggestion}
              className="text-sm text-[#0071e3] hover:text-blue-600"
            >
              生成建议
            </button>
          )}
        </StatSection>

        {/* 一键复制 */}
        <button
          onClick={handleCopy}
          className="w-full rounded-apple border border-[#e5e5e7] py-3 text-sm text-[#1d1d1f] hover:bg-[#f5f5f7] transition"
        >
          {copied ? '已复制' : '一键复制报表'}
        </button>

        {/* 【扩展预留】历史报表入口 */}
        <div className="pb-8">
          <button
            disabled
            className="w-full rounded-apple border border-dashed border-[#e5e5e7] py-3 text-sm text-[#aeaeb2] disabled:cursor-not-allowed"
          >
            历史报表 · 即将上线
          </button>
        </div>
      </div>
      )}
    </div>
  );
}

/** 极简统计区块 */
function StatSection({ title, children }) {
  return (
    <div>
      <p className="text-xs font-medium text-[#86868b] uppercase tracking-wider mb-2">
        {title}
      </p>
      {children}
    </div>
  );
}

/** 格式化分钟为可读时长 */
function formatMinutes(minutes) {
  if (!minutes || minutes <= 0) return '0分钟';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}小时${m}分钟`;
  if (h > 0) return `${h}小时`;
  return `${m}分钟`;
}

/** 获取两个日期之间的所有日期字符串 */
function getDatesBetween(start, end) {
  const dates = [];
  const current = new Date(start);
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

/** 获取日期范围内涉及的月份 */
function getMonthsInRange(start, end) {
  const months = [];
  const current = new Date(start.getFullYear(), start.getMonth(), 1);
  const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
  while (current <= endMonth) {
    months.push({ year: current.getFullYear(), month: current.getMonth() + 1 });
    current.setMonth(current.getMonth() + 1);
  }
  return months;
}

/** 短日期格式 */
function formatShort(date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}
