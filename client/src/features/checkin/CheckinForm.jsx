/**
 * 打卡表单
 * 上传图片/文件 + 文字描述 + 提交
 */

import { useState, useMemo } from 'react';
import { uploadService } from '../../services/uploadService';

// 预设快速打卡模板
const PRESET_TEMPLATES = [
  '刷题2小时',
  '背单词30分钟',
  '看视频课1小时',
  '复习笔记1小时',
  '做真题2小时',
];

export default function CheckinForm({ onSubmit, subject }) {
  const [content, setContent] = useState('');
  const [images, setImages] = useState([]);
  const [files, setFiles] = useState([]);
  const [duration, setDuration] = useState(''); // 【新增】学习时长（分钟）
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  // 合并预设 + 自定义模板
  const templates = useMemo(() => {
    try {
      const custom = JSON.parse(localStorage.getItem('checkin_templates') || '[]');
      return [...PRESET_TEMPLATES.map((t, i) => ({ text: t, id: `preset_${i}` })), ...custom];
    } catch { return PRESET_TEMPLATES.map((t, i) => ({ text: t, id: `preset_${i}` })); }
  }, [subject]);

  // 上传图片
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadService.uploadFile(file);
      setImages(prev => [...prev, result.url]);
    } catch (err) {
      console.error('上传图片失败:', err);
    } finally {
      setUploading(false);
    }
  };

  // 上传文件
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadService.uploadFile(file);
      setFiles(prev => [...prev, { url: result.url, name: result.filename }]);
    } catch (err) {
      console.error('上传文件失败:', err);
    } finally {
      setUploading(false);
    }
  };

  // 移除图片
  const removeImage = (url) => setImages(prev => prev.filter(u => u !== url));
  // 移除文件
  const removeFile = (url) => setFiles(prev => prev.filter(f => f.url !== url));

  // 提交
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && images.length === 0 && files.length === 0) return;
    setSubmitting(true);
    try {
      await onSubmit({ content: content.trim(), images, files, duration: parseInt(duration) || 0 });
      setContent('');
      setImages([]);
      setFiles([]);
      setDuration('');
    } catch (err) {
      console.error('提交打卡失败:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-apple-lg bg-apple-light p-4">
      {/* 快速模板 */}
      <div className="flex items-center gap-1 flex-wrap">
        <button
          type="button"
          onClick={() => setShowTemplates(!showTemplates)}
          className="text-[10px] text-[#86868b] hover:text-[#1d1d1f] px-1.5 py-0.5"
        >
          {showTemplates ? '收起模板' : '快速填充 ▼'}
        </button>
        {showTemplates && templates.map(tpl => (
          <button
            key={tpl.id}
            type="button"
            onClick={() => setContent(tpl.text)}
            className="rounded-full bg-white border border-[#e5e5e7] px-2 py-0.5 text-[10px] text-[#86868b] hover:text-[#1d1d1f] hover:border-[#1d1d1f] transition"
          >
            {tpl.text}
          </button>
        ))}
      </div>

      {/* 文字描述 */}
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder={`记录今天的${subject.label}学习内容...`}
        className="w-full resize-none rounded-apple border-0 bg-white px-4 py-3 text-sm outline-none placeholder:text-apple-gray"
        rows={3}
      />

      {/* 【新增】学习时长输入 — 极简数字输入框，单位分钟 */}
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={duration}
          onChange={e => setDuration(e.target.value)}
          placeholder="学习时长"
          min="0"
          className="w-28 rounded-apple border-0 bg-white px-3 py-2 text-sm outline-none placeholder:text-apple-gray"
        />
        <span className="text-xs text-apple-gray">分钟</span>
      </div>

      {/* 图片预览 + 上传 */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map(url => (
            <div key={url} className="relative h-20 w-20">
              <img src={url} alt="" className="h-full w-full rounded-apple object-cover" />
              <button
                type="button"
                onClick={() => removeImage(url)}
                className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-apple-black text-[10px] text-white"
              >
                x
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 文件列表 */}
      {files.length > 0 && (
        <div className="space-y-1">
          {files.map(f => (
            <div key={f.url} className="flex items-center justify-between rounded-apple bg-white px-3 py-1.5 text-xs">
              <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-apple-black hover:underline">
                {f.name}
              </a>
              <button type="button" onClick={() => removeFile(f.url)} className="text-apple-gray hover:text-red-500">
                删除
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 上传按钮 + 提交 */}
      <div className="flex items-center gap-3">
        {/* 上传图片 */}
        <label className="cursor-pointer text-xs text-apple-gray hover:text-apple-black">
          上传图片
          <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
        </label>
        {/* 上传文件 */}
        <label className="cursor-pointer text-xs text-apple-gray hover:text-apple-black">
          上传文件
          <input type="file" accept=".pdf,.txt,.doc,.docx" onChange={handleFileUpload} className="hidden" />
        </label>
        <span className="flex-1" />
        {/* 提交按钮 */}
        <button
          type="submit"
          disabled={submitting || uploading || (!content.trim() && images.length === 0 && files.length === 0)}
          className="rounded-apple bg-apple-black px-5 py-2 text-xs text-white transition hover:bg-gray-800 disabled:opacity-30"
        >
          {submitting ? '提交中...' : '打卡'}
        </button>
      </div>

      {uploading && <p className="text-xs text-apple-gray">上传中...</p>}
    </form>
  );
}
