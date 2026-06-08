/**
 * 自定义复选框
 * 极简圆形复选框 + 标签文字
 */

export default function Checkbox({ checked, onChange, label, disabled = false }) {
  return (
    <label className={`inline-flex items-center gap-3 ${disabled ? 'opacity-40' : 'cursor-pointer'}`}>
      <span className="relative flex h-5 w-5 items-center justify-center">
        {/* 隐藏原生 checkbox */}
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="sr-only"
        />
        {/* 自定义外观 */}
        <span
          className={`flex h-5 w-5 items-center justify-center rounded border-2 transition ${
            checked
              ? 'border-apple-black bg-apple-black'
              : 'border-gray-300 bg-white hover:border-gray-400'
          }`}
        >
          {checked && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
              <polyline points="20,6 9,17 4,12" />
            </svg>
          )}
        </span>
      </span>
      {label && <span className="text-sm text-apple-black">{label}</span>}
    </label>
  );
}
