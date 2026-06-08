import React, { useState } from 'react';
import Modal from '../../components/Modal';
import OCRViewer from './OCRViewer';
import TextImport from './TextImport';
import FileImport from './FileImport';
import { useNavigate } from 'react-router-dom';

const IMPORT_OPTIONS = [
  {
    key: 'ocr',
    title: '图片导入',
    description: '上传计划表图片，OCR 自动识别文字并解析为任务',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    ),
  },
  {
    key: 'text',
    title: '文字导入',
    description: '直接粘贴计划文本，每行一个任务，自动识别科目',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4 7 4 4 20 4 20 7" />
        <line x1="9" y1="20" x2="15" y2="20" />
        <line x1="12" y1="4" x2="12" y2="20" />
      </svg>
    ),
  },
  {
    key: 'file',
    title: '文件导入',
    description: '上传 TXT 或 CSV 文件，批量导入计划任务',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
        <polyline points="13 2 13 9 20 9" />
      </svg>
    ),
  },
];

export default function ImportPanel({ isOpen, onClose, onImport }) {
  const [activeView, setActiveView] = useState(null); // 'ocr' | 'text' | 'file'
  const navigate = useNavigate();

  const handleBackToMain = () => {
    setActiveView(null);
  };

  const handleClose = () => {
    setActiveView(null);
    onClose();
  };

  const handleImport = (tasks) => {
    if (onImport) {
      onImport(tasks);
    }
    handleClose();
  };

  if (activeView === 'ocr') {
    return (
      <OCRViewer
        isOpen={true}
        onClose={handleBackToMain}
        onImport={handleImport}
      />
    );
  }

  if (activeView === 'text') {
    return (
      <TextImport
        isOpen={true}
        onClose={handleBackToMain}
        onImport={handleImport}
      />
    );
  }

  if (activeView === 'file') {
    return (
      <FileImport
        isOpen={true}
        onClose={handleBackToMain}
        onImport={handleImport}
      />
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="导入计划">
      <div className="space-y-4">
        {/* Import option cards */}
        <div className="space-y-3">
          {IMPORT_OPTIONS.map((option) => (
            <button
              key={option.key}
              onClick={() => setActiveView(option.key)}
              className="w-full flex items-center gap-4 p-4 rounded-2xl border border-[#e5e5e7] hover:bg-gray-50 transition-colors text-left group"
            >
              <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-gray-50 text-[#1d1d1f] group-hover:bg-white transition-colors shrink-0">
                {option.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#1d1d1f]">
                  {option.title}
                </p>
                <p className="text-xs text-[#86868b] mt-0.5">
                  {option.description}
                </p>
              </div>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-[#86868b] shrink-0"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-[#e5e5e7]" />
          <span className="text-xs text-[#86868b]">或</span>
          <div className="flex-1 h-px bg-[#e5e5e7]" />
        </div>

        {/* AI plan link */}
        <button
          onClick={() => {
            onClose();
            navigate('/planner/ai');
          }}
          className="w-full flex items-center gap-4 p-4 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors text-left group"
        >
          <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-white text-[#1d1d1f] shrink-0">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#1d1d1f]">
              使用 AI 生成计划
            </p>
            <p className="text-xs text-[#86868b] mt-0.5">
              根据您的目标和时间安排，智能生成学习计划
            </p>
          </div>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-[#86868b] shrink-0"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </Modal>
  );
}
