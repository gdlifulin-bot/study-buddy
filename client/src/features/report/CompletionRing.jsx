/**
 * SVG 完成率圆环组件
 * 极简 Apple 风格环形进度条
 *
 * @param {number} rate - 完成率百分比 0-100
 * @param {number} size - 圆环大小，默认 80
 * @param {string} color - 进度条颜色，默认 #34c759
 * @param {string} label - 底部标签文字
 * @param {string} sublabel - 底部副标签（小字）
 */
export default function CompletionRing({ rate = 0, size = 80, color = '#34c759', label, sublabel }) {
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (rate / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="-rotate-90">
        {/* 背景圆环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e5e7"
          strokeWidth={strokeWidth}
        />
        {/* 进度圆环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
        {/* 中心文字 */}
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dy="0.35em"
          className="rotate-90"
          fill="#1d1d1f"
          fontSize={size * 0.22}
          fontWeight="500"
        >
          {rate}%
        </text>
      </svg>
      {label && <span className="text-xs text-[#1d1d1f]">{label}</span>}
      {sublabel && <span className="text-[10px] text-[#86868b]">{sublabel}</span>}
    </div>
  );
}
