/**
 * 打卡历史记录列表
 * 按日期分组展示，支持按日期回溯
 */

import { useMemo } from 'react';
import CheckinCard from './CheckinCard';
import EmptyState from '../../components/EmptyState';

export default function CheckinHistory({ checkins, onDelete }) {
  // 按日期分组
  const grouped = useMemo(() => {
    const map = {};
    checkins.forEach(c => {
      if (!map[c.date]) map[c.date] = [];
      map[c.date].push(c);
    });
    // 按日期倒序
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [checkins]);

  if (!checkins.length) {
    return (
      <EmptyState
        title="暂无打卡记录"
        description="开始记录你的学习进度吧"
      />
    );
  }

  return (
    <div className="pb-8">
      {grouped.map(([date, items]) => (
        <div key={date}>
          {/* 日期分隔 */}
          <div className="sticky top-0 z-10 bg-white py-3">
            <p className="text-xs font-medium text-apple-gray">
              {formatGroupDate(date)} · {items.length} 条打卡
            </p>
          </div>
          {/* 打卡卡片列表 */}
          <div>
            {items.map(checkin => (
              <CheckinCard
                key={checkin.id}
                checkin={checkin}
                onDelete={onDelete}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function formatGroupDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}
