/**
 * 文件导入组件
 * 支持 TXT/CSV/PDF/Word/Excel 文件上传
 * PDF/Word/Excel 通过 AI 智能解析，TXT/CSV 本地解析
 * 支持多日计划：任务带 date 字段，按日期分发
 */

import React, { useState } from 'react';
import Modal from '../../components/Modal';
import FileUpload from '../../components/FileUpload';
import { SUBJECTS } from '../../config/constants';
import { parseCSVPlan, parseTextPlan } from './parsers';
import { aiService } from '../../services/aiService';

let idCounter = 0;
function genId() {
  idCounter += 1;
  return `file_${Date.now()}_${idCounter}`;
}

export default function FileImport({ isOpen, onClose, onImport }) {
  const [parsedTasks, setParsedTasks] = useState(null);
  const [loading, setLoading] = useState(false);
  const [importError, setImportError] = useState(null);
  const [fileName, setFileName] = useState('');

  const handleReset = () => {
    setParsedTasks(null);
    setLoading(false);
    setImportError(null);
    setFileName('');
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleFileSelect = async (file) => {
    setLoading(true);
    setImportError(null);
    setFileName(file.name);

    try {
      const extension = file.name.split('.').pop().toLowerCase();
      let tasks;

      if (['pdf', 'docx', 'doc', 'xlsx', 'xls'].includes(extension)) {
        // PDF/Word/Excel：先提取原始文本，再交给 AI 智能解析
        const rawText = await extractRawText(file, extension);
        if (!rawText || !rawText.trim()) {
          setImportError('未能从文件中提取到文字');
          setLoading(false);
          return;
        }
        const result = await aiService.parsePlanText(rawText);
        tasks = result.tasks || [];
      } else {
        // TXT / CSV — 本地文本解析（支持日期标记行）
        const content = await readFileAsText(file);
        if (!content || !content.trim()) {
          setImportError('文件内容为空');
          setLoading(false);
          return;
        }
        tasks = extension === 'csv' ? parseCSVPlan(content) : parseTextPlan(content);
      }

      if (!tasks || tasks.length === 0) {
        setImportError('未能从文件中识别到任务');
        setLoading(false);
        return;
      }

      setParsedTasks(tasks.map((t) => ({ ...t, id: genId() })));
      setLoading(false);
    } catch (err) {
      setImportError(err.message || '文件读取失败');
      setLoading(false);
    }
  };

  // 从 PDF/Word/Excel 提取原始文本
  async function extractRawText(file, extension) {
    if (extension === 'pdf') {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = '';
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        fullText += content.items.map(item => item.str).join(' ') + '\n';
      }
      return fullText;
    }
    if (extension === 'docx' || extension === 'doc') {
      const mammoth = await import('mammoth');
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    }
    if (extension === 'xlsx' || extension === 'xls') {
      const XLSX = await import('xlsx');
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
      return rows
        .filter(row => row && row.some(cell => cell))
        .map(row => row.map(cell => String(cell ?? '')).join(' | '))
        .join('\n');
    }
    throw new Error('不支持的文件格式');
  }

  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsText(file);
    });
  }

  const handleTaskChange = (taskId, field, value) => {
    setParsedTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, [field]: value } : t))
    );
  };

  const handleDeleteTask = (taskId) => {
    setParsedTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  // 按日期分组
  const groupedByDate = parsedTasks
    ? parsedTasks.reduce((acc, t) => {
        const d = t.date || new Date().toISOString().split('T')[0];
        if (!acc[d]) acc[d] = [];
        acc[d].push(t);
        return acc;
      }, {})
    : {};

  const handleImport = () => {
    if (parsedTasks && parsedTasks.length > 0) {
      onImport(parsedTasks);
      handleClose();
    }
  };

  const dateKeys = Object.keys(groupedByDate).sort();

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="文件导入">
      <div className="space-y-6">
        {!parsedTasks && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-2xl p-4">
              <p className="text-xs text-[#86868b] mb-2 font-medium">支持的文件格式：</p>
              <ul className="text-xs text-[#1d1d1f] space-y-1">
                <li>CSV 文件 (.csv) — 列格式：日期, 时间, 科目, 任务名</li>
                <li>文本文件 (.txt) — 每行一个任务，支持日期标记</li>
                <li>PDF 文件 (.pdf) — AI 智能识别日期和任务</li>
                <li>Word 文件 (.docx) — AI 智能识别日期和任务</li>
                <li>Excel 文件 (.xlsx/.xls) — AI 智能识别日期和任务</li>
              </ul>
            </div>

            <FileUpload
              accept=".txt,.csv,.pdf,.docx,.doc,.xlsx,.xls"
              onFileSelect={handleFileSelect}
              label="上传计划文件"
              description="支持 TXT / CSV / PDF / Word / Excel"
            />

            {loading && (
              <p className="text-sm text-center text-[#86868b]">正在解析文件（AI 智能识别中）...</p>
            )}

            {importError && (
              <div className="text-center space-y-3">
                <p className="text-sm text-red-500">{importError}</p>
                <button onClick={handleReset}
                  className="px-4 py-2 text-sm text-[#0071e3] hover:text-blue-600 transition-colors"
                >重新选择文件</button>
              </div>
            )}
          </div>
        )}

        {/* 解析结果预览 — 按日期分组 */}
        {parsedTasks && parsedTasks.length > 0 && (
          <div className="space-y-4">
            <p className="text-sm text-[#86868b]">
              从 <span className="text-[#1d1d1f] font-medium">{fileName}</span> 中解析到{' '}
              {parsedTasks.length} 个任务，分布在 {dateKeys.length} 天：
            </p>

            <div className="space-y-3 max-h-64 overflow-y-auto">
              {dateKeys.map(date => (
                <div key={date}>
                  <p className="text-[11px] font-medium text-[#86868b] mb-1">{date}</p>
                  {groupedByDate[date].map(task => (
                    <div key={task.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg mb-1">
                      <input type="text" value={task.title}
                        onChange={e => handleTaskChange(task.id, 'title', e.target.value)}
                        className="flex-1 px-2 py-1 text-xs border border-[#e5e5e7] rounded-lg bg-white text-[#1d1d1f] focus:outline-none focus:ring-1 focus:ring-[#0071e3]/20"
                      />
                      <input type="text" value={task.time || ''}
                        onChange={e => handleTaskChange(task.id, 'time', e.target.value)}
                        className="w-24 px-2 py-1 text-xs border border-[#e5e5e7] rounded-lg bg-white text-[#1d1d1f] focus:outline-none focus:ring-1 focus:ring-[#0071e3]/20"
                        placeholder="时间"
                      />
                      <select value={task.subject}
                        onChange={e => handleTaskChange(task.id, 'subject', e.target.value)}
                        className="px-2 py-1 text-xs border border-[#e5e5e7] rounded-lg bg-white text-[#1d1d1f] focus:outline-none focus:ring-1 focus:ring-[#0071e3]/20"
                      >
                        {SUBJECTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                      </select>
                      <button onClick={() => handleDeleteTask(task.id)}
                        className="text-xs text-gray-400 hover:text-red-500 shrink-0"
                      >删除</button>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div className="flex gap-3 justify-end">
              <button onClick={handleReset}
                className="px-4 py-2 text-sm text-[#86868b] hover:text-[#1d1d1f] transition-colors"
              >重新选择</button>
              <button onClick={handleImport}
                className="px-6 py-2 text-sm font-medium text-white bg-[#0071e3] rounded-full hover:bg-blue-600 transition-colors"
              >导入</button>
            </div>
          </div>
        )}

        {parsedTasks && parsedTasks.length === 0 && (
          <div className="text-center py-8 space-y-4">
            <p className="text-sm text-[#86868b]">未能解析到任务</p>
            <button onClick={handleReset}
              className="px-4 py-2 text-sm text-[#0071e3] hover:text-blue-600 transition-colors"
            >重新选择文件</button>
          </div>
        )}
      </div>
    </Modal>
  );
}
