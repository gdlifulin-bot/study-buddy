/**
 * 文件/图片上传区域
 * 支持拖拽 + 点击上传
 */

import { useState, useRef } from 'react';

export default function FileUpload({
  accept = 'image/*,.pdf,.txt,.csv,.doc,.docx',
  multiple = false,
  onUpload,
  onFileSelect,  // 别名兼容
  label = '点击或拖拽上传',
  description = ''
}) {
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState(null);
  const inputRef = useRef(null);

  const handleFile = (file) => {
    // 图片预览
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
    onUpload?.(file);
    onFileSelect?.(file);
  };

  const handleChange = (e) => {
    const files = e.target.files;
    if (!files?.length) return;
    if (multiple) {
      Array.from(files).forEach(handleFile);
    } else {
      handleFile(files[0]);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const files = e.dataTransfer.files;
    if (!files?.length) return;
    if (multiple) {
      Array.from(files).forEach(handleFile);
    } else {
      handleFile(files[0]);
    }
  };

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`relative flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-apple-lg border-2 border-dashed transition ${
        dragging
          ? 'border-apple-black bg-apple-light'
          : 'border-apple-border hover:border-gray-400'
      }`}
    >
      {/* 图片预览 */}
      {preview && (
        <img
          src={preview}
          alt="预览"
          className="absolute inset-0 h-full w-full rounded-apple-lg object-contain p-2"
        />
      )}

      {/* 上传提示 */}
      {!preview && (
        <div className="text-center">
          <svg
            className="mx-auto mb-2 text-apple-gray"
            width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
          >
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="17,8 12,3 7,8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <p className="text-sm text-apple-gray">{label}</p>
          {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
          <p className="mt-1 text-xs text-gray-400">
            {accept.replace(/,/g, ', ')}
          </p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
}
