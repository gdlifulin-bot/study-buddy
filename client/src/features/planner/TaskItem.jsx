import React from 'react';
import Checkbox from '../../components/Checkbox';
import { SUBJECTS } from '../../config/constants';

function getSubjectInfo(subjectKey) {
  const found = SUBJECTS.find((s) => s.key === subjectKey);
  return found || { key: 'other', label: subjectKey || '其他', color: '#86868b' };
}

export default function TaskItem({ task, onToggle, onDelete, onEdit, isOverdue }) {
  const { title, subject, completed, time } = task;
  const subjectInfo = getSubjectInfo(subject);

  return (
    <div className={`flex items-center gap-3 py-3 group ${isOverdue ? 'bg-orange-50/30 -mx-2 px-2 rounded-apple' : ''}`}>
      <Checkbox checked={completed} onChange={() => onToggle(task.id)} />

      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onEdit && onEdit(task)}>
        <p
          className={`text-sm truncate ${
            completed
              ? 'line-through text-gray-400'
              : isOverdue
                ? 'text-orange-600/70'
                : 'text-[#1d1d1f]'
          }`}
        >
          {isOverdue && !completed && <span className="text-[10px] mr-1 text-orange-400/80">逾期</span>}
          {title}
        </p>
        {time && (
          <p
            className={`text-xs mt-0.5 ${
              completed ? 'text-gray-300' : isOverdue ? 'text-orange-400/60' : 'text-[#86868b]'
            }`}
          >
            {time}
          </p>
        )}
      </div>

      {/* Subject badge */}
      <div className="flex items-center gap-1 shrink-0">
        <span
          className="inline-block w-2 h-2 rounded-full"
          style={{ backgroundColor: subjectInfo.color }}
        />
        <span className="text-xs text-[#86868b]">{subjectInfo.label}</span>
      </div>

      {/* Delete button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(task.id);
        }}
        className="text-xs text-gray-400 hover:text-red-500 transition-colors shrink-0 opacity-0 group-hover:opacity-100 px-1"
      >
        删除
      </button>
    </div>
  );
}
