import React from 'react';

const MONTH_NAMES = [
  '1月', '2月', '3月', '4月', '5月', '6月',
  '7月', '8月', '9月', '10月', '11月', '12月',
];

export default function MonthSelector({ year, month, onPrev, onNext }) {
  return (
    <div className="flex items-center justify-center gap-4 select-none">
      <button
        onClick={onPrev}
        className="w-8 h-8 flex items-center justify-center rounded-full border border-[#e5e5e7] text-[#86868b] hover:bg-gray-50 transition-colors text-lg leading-none"
        aria-label="上一个月"
      >
        &lt;
      </button>

      <span className="text-lg font-medium text-[#1d1d1f] min-w-[120px] text-center tracking-wide">
        {year}年 {MONTH_NAMES[month - 1]}
      </span>

      <button
        onClick={onNext}
        className="w-8 h-8 flex items-center justify-center rounded-full border border-[#e5e5e7] text-[#86868b] hover:bg-gray-50 transition-colors text-lg leading-none"
        aria-label="下一个月"
      >
        &gt;
      </button>
    </div>
  );
}
