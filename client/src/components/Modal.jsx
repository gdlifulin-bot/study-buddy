/**
 * 通用弹窗组件
 * 全屏遮罩 + 居中白色卡片
 */

import { useEffect } from 'react';

export default function Modal({ isOpen, onClose, title, children }) {
  // 禁止背景滚动
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* 遮罩 */}
      <div
        className="absolute inset-0 bg-black/40 transition-opacity"
        onClick={onClose}
      />

      {/* 卡片 */}
      <div className="relative z-10 w-full max-w-md max-h-[85vh] overflow-y-auto rounded-t-apple-lg bg-white p-6 sm:rounded-apple-lg sm:shadow-lg">
        {/* 标题栏 */}
        <div className="mb-4 flex items-center justify-between">
          {title && <h3 className="text-lg font-medium text-apple-black">{title}</h3>}
          <button
            onClick={onClose}
            className="ml-auto flex h-7 w-7 items-center justify-center rounded-full text-apple-gray hover:bg-apple-light hover:text-apple-black"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* 内容 */}
        {children}
      </div>
    </div>
  );
}
