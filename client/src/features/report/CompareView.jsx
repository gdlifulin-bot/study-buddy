/**
 * 学习对比视图
 * 并排展示两人的学习数据：完成率、学习时长、各科分布、打卡天数
 *
 * @param {string} user1 - 用户1 ID
 * @param {string} user2 - 用户2 ID
 * @param {string} user1Name - 用户1 名称
 * @param {string} user2Name - 用户2 名称
 * @param {string} period - 'week' | 'month'
 * @param {Function} onClose - 关闭对比视图
 */
import { useState, useEffect, useMemo } from 'react';
import { partnerService } from '../../services/partnerService';
import { SUBJECTS } from '../../config/constants';
import CompletionRing from './CompletionRing';

export default function CompareView({ user1, user2, user1Name, user2Name, period }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    partnerService.getCompare(user1, user2, period).then(res => {
      if (!cancelled) {
        setData(res);
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [user1, user2, period]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <p className="text-sm text-[#86868b]">加载中...</p>
      </div>
    );
  }

  if (!data || !data.users) {
    return (
      <div className="flex items-center justify-center py-10">
        <p className="text-sm text-[#86868b]">暂无对比数据</p>
      </div>
    );
  }

  const s1 = data.users[user1];
  const s2 = data.users[user2];
  if (!s1 || !s2) return null;

  const maxDuration = Math.max(s1.totalDuration, s2.totalDuration, 1);

  return (
    <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6">
      {/* 完成率对比 — 两个圆环 */}
      <CompareSection title={`${period === 'week' ? '本周' : '本月'}计划完成率`}>
        <div className="flex items-center justify-around">
          <div className="flex flex-col items-center gap-1">
            <CompletionRing
              rate={s1.completionRate}
              size={80}
              color={s1.completionRate >= s2.completionRate ? '#34c759' : '#ff9500'}
            />
            <span className="text-xs font-medium text-[#1d1d1f]">{user1Name}</span>
            <span className="text-[10px] text-[#86868b]">{s1.completedTasks}/{s1.totalTasks}项</span>
          </div>
          <span className="text-xl text-[#86868b] font-light">VS</span>
          <div className="flex flex-col items-center gap-1">
            <CompletionRing
              rate={s2.completionRate}
              size={80}
              color={s2.completionRate >= s1.completionRate ? '#34c759' : '#ff9500'}
            />
            <span className="text-xs font-medium text-[#1d1d1f]">{user2Name}</span>
            <span className="text-[10px] text-[#86868b]">{s2.completedTasks}/{s2.totalTasks}项</span>
          </div>
        </div>
      </CompareSection>

      {/* 学习时长对比 — 堆叠条 */}
      <CompareSection title="累计学习时长">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-[#86868b]">
            {user1Name}: {formatMinutes(s1.totalDuration)}
          </span>
          <span className="text-xs text-[#86868b]">
            {user2Name}: {formatMinutes(s2.totalDuration)}
          </span>
        </div>
        <div className="h-3 w-full rounded-full bg-[#f5f5f7] overflow-hidden flex">
          <div
            className="h-full bg-[#0071e3] transition-all duration-500"
            style={{ width: `${Math.round((s1.totalDuration / (s1.totalDuration + s2.totalDuration || 1)) * 100)}%` }}
          />
          <div
            className="h-full bg-[#ff9500] transition-all duration-500"
            style={{ width: `${Math.round((s2.totalDuration / (s1.totalDuration + s2.totalDuration || 1)) * 100)}%` }}
          />
        </div>
        <div className="flex items-center gap-3 mt-1">
          <span className="inline-flex items-center gap-1 text-[10px] text-[#86868b]">
            <span className="w-2 h-2 rounded-full bg-[#0071e3]" /> {user1Name}
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] text-[#86868b]">
            <span className="w-2 h-2 rounded-full bg-[#ff9500]" /> {user2Name}
          </span>
        </div>
      </CompareSection>

      {/* 各科时长对比 */}
      <CompareSection title="各科学习时长">
        <div className="space-y-3">
          {SUBJECTS.map(subj => {
            const d1 = s1.subjectDurations?.[subj.key] || 0;
            const d2 = s2.subjectDurations?.[subj.key] || 0;
            const pct1 = Math.round((d1 / maxDuration) * 100);
            const pct2 = Math.round((d2 / maxDuration) * 100);
            return (
              <div key={subj.key} className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: subj.color }} />
                  <span className="text-xs text-[#1d1d1f]">{subj.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#86868b] w-16 text-right">{formatMinutes(d1)}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-[#f5f5f7] overflow-hidden">
                    <div className="h-full rounded-full bg-[#0071e3]" style={{ width: `${pct1}%` }} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#86868b] w-16 text-right">{formatMinutes(d2)}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-[#f5f5f7] overflow-hidden">
                    <div className="h-full rounded-full bg-[#ff9500]" style={{ width: `${pct2}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CompareSection>

      {/* 打卡天数 + 连续打卡对比 */}
      <CompareSection title="打卡统计">
        <div className="grid grid-cols-2 gap-4">
          <StatCompareCard
            label="打卡天数"
            v1={s1.checkinDays}
            v2={s2.checkinDays}
            name1={user1Name}
            name2={user2Name}
          />
          <StatCompareCard
            label="连续打卡"
            v1={s1.streak}
            v2={s2.streak}
            name1={user1Name}
            name2={user2Name}
          />
        </div>
      </CompareSection>
    </div>
  );
}

function CompareSection({ title, children }) {
  return (
    <div>
      <p className="text-xs font-medium text-[#86868b] uppercase tracking-wider mb-3">{title}</p>
      {children}
    </div>
  );
}

function StatCompareCard({ label, v1, v2, name1, name2 }) {
  const diff = v1 - v2;
  return (
    <div className="rounded-apple-lg border border-[#e5e5e7] p-3 text-center">
      <p className="text-[10px] text-[#86868b] mb-2">{label}</p>
      <div className="flex items-center justify-around">
        <div className="flex flex-col items-center">
          <span className="text-lg font-medium text-[#1d1d1f]">{v1}</span>
          <span className="text-[10px] text-[#86868b]">{name1}</span>
        </div>
        <span className="text-xs text-[#86868b]">|</span>
        <div className="flex flex-col items-center">
          <span className="text-lg font-medium text-[#1d1d1f]">{v2}</span>
          <span className="text-[10px] text-[#86868b]">{name2}</span>
        </div>
      </div>
      {diff !== 0 && (
        <p className={`text-[10px] mt-1 ${diff > 0 ? 'text-green-500' : 'text-orange-500'}`}>
          {name1} {diff > 0 ? `领先 ${diff} 天` : `落后 ${-diff} 天`}
        </p>
      )}
    </div>
  );
}

function formatMinutes(minutes) {
  if (!minutes || minutes <= 0) return '0分钟';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h${m}m`;
  if (h > 0) return `${h}小时`;
  return `${m}分钟`;
}
