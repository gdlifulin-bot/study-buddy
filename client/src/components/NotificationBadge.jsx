/**
 * 通知红点组件
 * 显示在底部导航或按钮上，表示有未读通知
 *
 * @param {number} count - 未读数
 * @param {string} color - 颜色 'red' | 'blue' | 'orange'
 */
export default function NotificationBadge({ count = 0, color = 'red' }) {
  if (count <= 0) return null;

  const colorMap = {
    red: 'bg-red-500',
    blue: 'bg-blue-500',
    orange: 'bg-orange-500'
  };

  return (
    <span
      className={`absolute -top-1 -right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full ${colorMap[color] || colorMap.red} px-1 text-[10px] font-medium text-white`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}
