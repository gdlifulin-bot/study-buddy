import React, { useState } from 'react';
import Modal from '../../components/Modal';
import { SUBJECTS } from '../../config/constants';
import { parseTextPlan } from './parsers';

let idCounter = 0;
function genId() {
  idCounter += 1;
  return `txt_${Date.now()}_${idCounter}`;
}

export default function TextImport({ isOpen, onClose, onImport }) {
  const [text, setText] = useState('');
  const [parsedTasks, setParsedTasks] = useState(null);
  const [parseError, setParseError] = useState(null);

  const handleReset = () => {
    setText('');
    setParsedTasks(null);
    setParseError(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleParse = () => {
    if (!text.trim()) {
      setParseError('请输入计划文本');
      return;
    }

    try {
      const tasks = parseTextPlan(text);
      if (tasks.length === 0) {
        setParseError('未能识别到任务，请检查文本格式');
        setParsedTasks(null);
        return;
      }
      setParsedTasks(
        tasks.map((t) => ({ ...t, id: genId() }))
      );
      setParseError(null);
    } catch (err) {
      setParseError('解析失败，请检查文本格式');
      console.error('Parse error:', err);
    }
  };

  const handleTaskChange = (taskId, field, value) => {
    setParsedTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, [field]: value } : t))
    );
  };

  const handleDeleteTask = (taskId) => {
    setParsedTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const handleImport = () => {
    if (parsedTasks && parsedTasks.length > 0) {
      onImport(parsedTasks);
      handleClose();
    }
  };

  const handleBackToEdit = () => {
    setParsedTasks(null);
    setParseError(null);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="文字导入">
      <div className="space-y-6">
        {/* Text input step */}
        {!parsedTasks && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-2xl p-4">
              <p className="text-xs text-[#86868b] mb-2 font-medium">
                输入格式示例：
              </p>
              <pre className="text-xs text-[#1d1d1f] whitespace-pre-wrap leading-relaxed">
                {'08:00-10:00 数学 复习线性代数\n14:00-16:00 英语 背单词\n19:00-21:00 专业课 做习题'}
              </pre>
              <p className="text-xs text-[#86868b] mt-2">
                每行一个任务，时间 + 科目/标题，系统会自动识别科目
              </p>
            </div>

            <textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (parseError) setParseError(null);
              }}
              rows={10}
              className="w-full px-4 py-3 text-sm border border-[#e5e5e7] rounded-2xl bg-white text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/20 focus:border-[#0071e3] resize-y"
              placeholder="请在此粘贴您的学习计划文本，每行一个任务..."
              autoFocus
            />

            {parseError && (
              <p className="text-sm text-red-500 text-center">{parseError}</p>
            )}

            <div className="flex justify-end">
              <button
                onClick={handleParse}
                disabled={!text.trim()}
                className="px-6 py-2 text-sm font-medium text-white bg-[#0071e3] rounded-full hover:bg-blue-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                解析
              </button>
            </div>
          </div>
        )}

        {/* Preview parsed tasks */}
        {parsedTasks && parsedTasks.length > 0 && (
          <div className="space-y-4">
            <p className="text-sm text-[#86868b]">
              已解析 {parsedTasks.length} 个任务，确认后可导入：
            </p>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {parsedTasks.map((task, idx) => (
                <div
                  key={task.id}
                  className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl"
                >
                  <span className="text-xs text-[#86868b] w-5 shrink-0">
                    {idx + 1}.
                  </span>
                  <input
                    type="text"
                    value={task.title}
                    onChange={(e) =>
                      handleTaskChange(task.id, 'title', e.target.value)
                    }
                    className="flex-1 px-2 py-1 text-sm border border-[#e5e5e7] rounded-lg bg-white text-[#1d1d1f] focus:outline-none focus:ring-1 focus:ring-[#0071e3]/20"
                  />
                  <input
                    type="text"
                    value={task.time || ''}
                    onChange={(e) =>
                      handleTaskChange(task.id, 'time', e.target.value)
                    }
                    className="w-24 px-2 py-1 text-xs border border-[#e5e5e7] rounded-lg bg-white text-[#1d1d1f] focus:outline-none focus:ring-1 focus:ring-[#0071e3]/20"
                    placeholder="时间"
                  />
                  <select
                    value={task.subject}
                    onChange={(e) =>
                      handleTaskChange(task.id, 'subject', e.target.value)
                    }
                    className="px-2 py-1 text-xs border border-[#e5e5e7] rounded-lg bg-white text-[#1d1d1f] focus:outline-none focus:ring-1 focus:ring-[#0071e3]/20"
                  >
                    {SUBJECTS.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors shrink-0 px-1"
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={handleBackToEdit}
                className="px-4 py-2 text-sm text-[#86868b] hover:text-[#1d1d1f] transition-colors"
              >
                返回编辑
              </button>
              <button
                onClick={handleImport}
                className="px-6 py-2 text-sm font-medium text-white bg-[#0071e3] rounded-full hover:bg-blue-600 transition-colors"
              >
                导入
              </button>
            </div>
          </div>
        )}

        {parsedTasks && parsedTasks.length === 0 && (
          <div className="text-center py-8 space-y-4">
            <p className="text-sm text-[#86868b]">未能识别到任务</p>
            <button
              onClick={handleBackToEdit}
              className="px-4 py-2 text-sm text-[#0071e3] hover:text-blue-600 transition-colors"
            >
              返回编辑文本
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
