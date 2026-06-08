/**
 * 空状态占位组件
 * 无数据时显示，含图标 + 标题 + 描述 + 可选操作按钮
 */

import Button from './Button';

export default function EmptyState({ title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {/* 极简圆形图标 */}
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-apple-border">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-apple-gray">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>

      {title && <p className="text-sm font-medium text-apple-black">{title}</p>}
      {description && <p className="mt-1 text-xs text-apple-gray">{description}</p>}

      {action && (
        <div className="mt-5">
          <Button variant="secondary" onClick={action.onClick}>
            {action.label}
          </Button>
        </div>
      )}
    </div>
  );
}
