import React, { useState } from 'react';
import Modal from '../../components/Modal';
import FileUpload from '../../components/FileUpload';
import { SUBJECTS } from '../../config/constants';
import { parseTextPlan } from './parsers';

let idCounter = 0;
function genId() {
  idCounter += 1;
  return `ocr_${Date.now()}_${idCounter}`;
}

export default function OCRViewer({ isOpen, onClose, onImport }) {
  const [step, setStep] = useState(1); // 1=upload, 2=ocr, 3=edit result, 4=parsed tasks, 5=review
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [ocrText, setOcrText] = useState('');
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState(null);
  const [parsedTasks, setParsedTasks] = useState([]);

  const handleReset = () => {
    setStep(1);
    setImageFile(null);
    setImagePreview(null);
    setOcrText('');
    setOcrProgress(0);
    setOcrLoading(false);
    setOcrError(null);
    setParsedTasks([]);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleFileSelected = (file) => {
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
      setStep(2);
    };
    reader.readAsDataURL(file);
  };

  const handleStartOCR = async () => {
    if (!imageFile) return;

    setOcrLoading(true);
    setOcrError(null);
    setOcrProgress(0);

    try {
      const Tesseract = await import('tesseract.js');
      const result = await Tesseract.recognize(imageFile, 'chi_sim+eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.round(m.progress * 100));
          }
        },
      });
      setOcrText(result.data.text);
      setOcrProgress(100);
      setStep(3);
    } catch (err) {
      setOcrError('OCR 识别失败，请重试');
      console.error('OCR error:', err);
    } finally {
      setOcrLoading(false);
    }
  };

  const handleParseToTasks = () => {
    if (!ocrText.trim()) return;
    const tasks = parseTextPlan(ocrText);
    setParsedTasks(
      tasks.map((t) => ({ ...t, id: genId() }))
    );
    setStep(4);
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
    onImport(parsedTasks);
    handleClose();
  };

  const renderProgressBar = () => (
    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
      <div
        className="h-full bg-[#0071e3] rounded-full transition-all duration-300"
        style={{ width: `${ocrProgress}%` }}
      />
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="图片导入">
      <div className="space-y-6">
        {/* Step indicator */}
        <div className="flex items-center gap-1 text-xs text-[#86868b]">
          {[1, 2, 3, 4].map((s) => (
            <React.Fragment key={s}>
              {s > 1 && <span className="mx-1">/</span>}
              <span className={s === step ? 'text-[#0071e3] font-medium' : ''}>
                步骤 {s}
              </span>
            </React.Fragment>
          ))}
        </div>

        {/* Step 1: Upload */}
        {step === 1 && (
          <FileUpload
            accept="image/*"
            onFileSelect={handleFileSelected}
            label="上传计划表图片"
            description="支持 JPG、PNG 格式"
          />
        )}

        {/* Step 2: Preview + Start OCR */}
        {step === 2 && (
          <div className="space-y-4">
            {imagePreview && (
              <div className="flex justify-center">
                <img
                  src={imagePreview}
                  alt="预览"
                  className="max-h-48 rounded-2xl border border-[#e5e5e7] object-contain"
                />
              </div>
            )}

            {ocrLoading ? (
              <div className="space-y-3">
                <p className="text-sm text-center text-[#86868b]">
                  正在识别中... {ocrProgress}%
                </p>
                {renderProgressBar()}
              </div>
            ) : (
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleStartOCR}
                  className="px-6 py-2 text-sm font-medium text-white bg-[#0071e3] rounded-full hover:bg-blue-600 transition-colors"
                >
                  开始识别
                </button>
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-2 text-sm text-[#86868b] hover:text-[#1d1d1f] transition-colors"
                >
                  重新选择
                </button>
              </div>
            )}

            {ocrError && (
              <p className="text-sm text-center text-red-500">{ocrError}</p>
            )}
          </div>
        )}

        {/* Step 3: Edit OCR result */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-[#86868b]">
              OCR 识别结果，可以编辑修改后继续：
            </p>
            <textarea
              value={ocrText}
              onChange={(e) => setOcrText(e.target.value)}
              rows={10}
              className="w-full px-4 py-3 text-sm border border-[#e5e5e7] rounded-2xl bg-white text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/20 focus:border-[#0071e3] resize-y"
              placeholder="识别出的文本内容..."
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2 text-sm text-[#86868b] hover:text-[#1d1d1f] transition-colors"
              >
                重新识别
              </button>
              <button
                onClick={handleParseToTasks}
                disabled={!ocrText.trim()}
                className="px-6 py-2 text-sm font-medium text-white bg-[#0071e3] rounded-full hover:bg-blue-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                解析为任务
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Review parsed tasks */}
        {step === 4 && (
          <div className="space-y-4">
            <p className="text-sm text-[#86868b]">
              已解析 {parsedTasks.length} 个任务，确认后可导入到计划表：
            </p>

            {parsedTasks.length === 0 ? (
              <p className="text-sm text-center text-[#86868b] py-8">
                未识别到任务，请返回上一步检查文本内容
              </p>
            ) : (
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
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setStep(3)}
                className="px-4 py-2 text-sm text-[#86868b] hover:text-[#1d1d1f] transition-colors"
              >
                返回编辑
              </button>
              <button
                onClick={handleImport}
                disabled={parsedTasks.length === 0}
                className="px-6 py-2 text-sm font-medium text-white bg-[#0071e3] rounded-full hover:bg-blue-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                导入到计划表
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
