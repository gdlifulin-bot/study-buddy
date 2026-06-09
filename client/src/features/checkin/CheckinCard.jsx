/**
 * 打卡记录卡片
 * 显示单条打卡的文字、图片、文件、时间
 */

import { SUBJECTS } from '../../config/constants';

export default function CheckinCard({ checkin, onDelete }) {
  const subject = SUBJECTS.find(s => s.key === checkin.subject);
  const dateLabel = formatDate(checkin.date);

  return (
    <div className="border-b border-apple-border py-2.5 last:border-b-0">
      {/* 顶部信息行 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: subject?.color || '#86868b' }}
          />
          <span className="text-xs font-medium text-apple-black">{subject?.label}</span>
          <span className="text-[11px] text-apple-gray">{dateLabel}</span>
          {checkin.duration > 0 && (
            <span className="text-[11px] text-[#86868b]">
              {formatDuration(checkin.duration)}
            </span>
          )}
        </div>
        {onDelete && (
          <button
            onClick={() => onDelete(checkin.id)}
            className="text-[11px] text-gray-400 hover:text-red-500"
          >
            删除
          </button>
        )}
      </div>

      {/* 文字内容 */}
      {checkin.content && (
        <p className="mt-1 text-sm leading-snug text-apple-black">
          {checkin.content}
        </p>
      )}

      {/* 图片 */}
      {checkin.images?.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {checkin.images.map(url => (
            <a key={url} href={url} target="_blank" rel="noopener noreferrer">
              <img
                src={url}
                alt="打卡图片"
                className="h-16 w-16 rounded-lg object-cover transition hover:opacity-80"
              />
            </a>
          ))}
        </div>
      )}

      {/* 附件 */}
      {checkin.files?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {checkin.files.map(f => (
            <a
              key={f.url || f}
              href={f.url || f}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-apple bg-apple-light px-3 py-1.5 text-xs text-apple-black hover:bg-gray-200"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14,2 14,8 20,8" />
              </svg>
              {typeof f === 'string' ? '附件' : f.name}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// 【新增】格式化时长
function formatDuration(minutes) {
  if (!minutes || minutes <= 0) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h${m}min`;
  if (h > 0) return `${h}h`;
  return `${m}min`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = (now - d) / (1000 * 60 * 60 * 24);
  if (diff < 1) return '今天';
  if (diff < 2) return '昨天';
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}
