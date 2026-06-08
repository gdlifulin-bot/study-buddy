/**
 * 背景切换/上传组件
 * 支持切换默认背景和自定义上传背景
 *
 * 【扩展点】可扩展更多背景源（如 Unsplash API）
 */

import { useState, useEffect } from 'react';
import api from '../../services/api';
import { uploadService } from '../../services/uploadService';

export default function BackgroundPicker({ onClose }) {
  const [bgType, setBgType] = useState('default');
  const [customUrl, setCustomUrl] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    api.get('/config').then(config => {
      setBgType(config.backgroundType || 'default');
      setCustomUrl(config.customBackgroundUrl || null);
    }).catch(() => {});
  }, []);

  // 切换为默认背景
  const setDefault = async () => {
    await api.post('/config/background', { backgroundType: 'default' });
    setBgType('default');
    onClose?.();
    window.location.reload();
  };

  // 上传自定义背景
  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadService.uploadFile(file);
      const url = result.url;
      await api.post('/config/background', {
        backgroundType: 'custom',
        customBackgroundUrl: url
      });
      setCustomUrl(url);
      setBgType('custom');
      onClose?.();
      window.location.reload();
    } catch (err) {
      console.error('上传背景失败:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 p-2">
      <h3 className="text-lg font-medium text-apple-black">背景设置</h3>

      {/* 当前背景预览 */}
      <div className="space-y-2">
        <p className="text-xs text-apple-gray">当前背景</p>
        <div className="flex gap-3">
          {/* 默认背景色块 */}
          <button
            onClick={setDefault}
            className={`h-20 w-32 rounded-apple bg-gradient-to-br from-slate-900 via-slate-800 to-zinc-900 transition ${
              bgType === 'default' ? 'ring-2 ring-apple-black' : 'ring-1 ring-apple-border'
            }`}
          >
            <span className="text-xs text-white/60">默认</span>
          </button>
          {/* 自定义背景 */}
          {customUrl && (
            <button
              onClick={() => {
                api.post('/config/background', { backgroundType: 'custom', customBackgroundUrl: customUrl });
                onClose?.();
                window.location.reload();
              }}
              className={`h-20 w-32 rounded-apple bg-cover bg-center transition ${
                bgType === 'custom' ? 'ring-2 ring-apple-black' : 'ring-1 ring-apple-border'
              }`}
              style={{ backgroundImage: `url(${customUrl})` }}
            >
              <span className="text-xs text-white/80">自定义</span>
            </button>
          )}
        </div>
      </div>

      {/* 上传新背景 */}
      <div className="space-y-2">
        <p className="text-xs text-apple-gray">上传自定义背景</p>
        <label className="block cursor-pointer">
          <div className="flex h-32 items-center justify-center rounded-apple border-2 border-dashed border-apple-border text-sm text-apple-gray transition hover:border-apple-black hover:text-apple-black">
            {uploading ? '上传中...' : '点击选择图片'}
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
          />
        </label>
        <p className="text-xs text-gray-400">支持 JPG/PNG/WebP，建议 1920x1080</p>
      </div>
    </div>
  );
}
