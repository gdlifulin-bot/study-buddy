/**
 * 本月打卡热力图组件
 * 7列 × 6行方格矩阵，颜色深浅代表打卡密度
 *
 * @param {Object} heatmapData - { "2026-06-09": 3, ... } date -> subject count
 * @param {number} year - 年份
 * @param {number} month - 月份 (1-12)
 * @param {Function} onDayClick - 点击某天的回调 (dateStr)
 * @param {string} activeDate - 当前选中日期
 */
import { useMemo } from 'react';
import { SUBJECTS } from '../../config/constants';

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

export default function CheckinHeatmap({ heatmapData = {}, year, month, onDayClick, activeDate }) {
  const grid = useMemo(() => {
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDayOfWeek = new Date(year, month - 1, 1).getDay(); // 0=Sun

    const cells = [];
    // 前置空白格
    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push(null);
    }
    // 日期格
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const count = heatmapData[dateStr] || 0;
      cells.push({ day: d, dateStr, count });
    }

    // 分成行（每行7个）
    const rows = [];
    for (let i = 0; i < cells.length; i += 7) {
      rows.push(cells.slice(i, i + 7));
    }
    return rows;
  }, [heatmapData, year, month]);

  const maxCount = Math.max(...Object.values(heatmapData), 1);

  function getColor(count) {
    if (count === 0) return 'bg-gray-100';
    const ratio = count / maxCount;
    if (ratio <= 0.25) return 'bg-blue-100';
    if (ratio <= 0.5) return 'bg-blue-200';
    if (ratio <= 0.75) return 'bg-blue-400';
    return 'bg-blue-600';
  }

  return (
    <div className="space-y-1">
      {/* 列头：周几 */}
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAY_LABELS.map((label, i) => (
          <div key={i} className="text-center text-[10px] text-[#86868b] py-0.5">
            {label}
          </div>
        ))}
      </div>

      {/* 方格矩阵 */}
      <div className="space-y-1">
        {grid.map((row, ri) => (
          <div key={ri} className="grid grid-cols-7 gap-1">
            {row.map((cell, ci) => {
              if (!cell) {
                return <div key={`e-${ci}`} className="aspect-square" />;
              }
              const isActive = cell.dateStr === activeDate;
              return (
                <button
                  key={cell.dateStr}
                  onClick={() => onDayClick?.(cell.dateStr)}
                  className={`aspect-square rounded-[3px] ${getColor(cell.count)} transition hover:ring-2 hover:ring-blue-300 ${isActive ? 'ring-2 ring-[#1d1d1f]' : ''}`}
                  title={`${cell.dateStr}: ${cell.count} 科打卡`}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* 图例 */}
      <div className="flex items-center justify-end gap-1 pt-1">
        <span className="text-[10px] text-[#86868b] mr-1">少</span>
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} className={`w-3 h-3 rounded-[2px] ${getColor(i * (maxCount / 4))}`} />
        ))}
        <span className="text-[10px] text-[#86868b] ml-1">多</span>
      </div>
    </div>
  );
}
