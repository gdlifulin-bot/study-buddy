/**
 * 连续打卡徽章
 * 显示连续打卡天数，带火焰动画
 *
 * @param {number} streak - 连续天数
 * @param {boolean} compact - 紧凑模式（仅显示数字）
 */
export default function StreakBadge({ streak = 0, compact = false }) {
  if (streak <= 0) return null;

  if (compact) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-orange-500">
        🔥{streak}
      </span>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 border border-orange-100">
      <span className="text-sm">🔥</span>
      <span className="text-xs font-medium text-orange-600">
        连续打卡 <span className="text-sm font-bold">{streak}</span> 天
      </span>
    </div>
  );
}
