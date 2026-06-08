/**
 * 科目切换 Tab 栏
 * 数学/英语/专业课/政治 四个科目切换
 */

export default function SubjectTabs({ subjects, active, onChange }) {
  return (
    <div className="flex gap-0 -mb-px">
      {subjects.map(subject => (
        <button
          key={subject.key}
          onClick={() => onChange(subject.key)}
          className={`relative px-5 py-3 text-sm transition ${
            active === subject.key
              ? 'text-apple-black font-medium'
              : 'text-apple-gray hover:text-apple-black'
          }`}
        >
          {subject.label}
          {/* 激活下划线 */}
          {active === subject.key && (
            <span
              className="absolute bottom-0 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full"
              style={{ backgroundColor: subject.color }}
            />
          )}
        </button>
      ))}
    </div>
  );
}
