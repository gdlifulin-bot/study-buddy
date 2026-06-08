/**
 * 加油按钮组件
 * 在查看搭子的数据时，发送鼓励消息
 *
 * @param {string} fromUserId - 发送者
 * @param {string} toUserId - 接收者
 * @param {boolean} compact - 紧凑模式（仅图标）
 */
import { useState } from 'react';
import { partnerService } from '../../services/partnerService';

const CHEER_MESSAGES = ['加油！💪', '一起上岸！🎓', '今天也要努力！📚', '坚持就是胜利！✨', '冲冲冲！🚀'];

export default function CheerButton({ fromUserId, toUserId, compact = false }) {
  const [sent, setSent] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const handleCheer = async (message) => {
    try {
      await partnerService.sendCheer(fromUserId, toUserId, message);
      setSent(true);
      setShowPicker(false);
      setTimeout(() => setSent(false), 2000);
    } catch (e) {
      console.error('发送加油失败:', e);
    }
  };

  if (compact) {
    return (
      <button
        onClick={() => handleCheer('加油！💪')}
        className={`text-xs transition ${sent ? 'text-orange-500' : 'text-[#86868b] hover:text-orange-500'}`}
      >
        {sent ? '已发送 💪' : '加油 💪'}
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => sent ? null : setShowPicker(!showPicker)}
        className={`rounded-apple border px-3 py-1.5 text-xs transition ${
          sent
            ? 'border-orange-200 bg-orange-50 text-orange-600'
            : 'border-[#e5e5e7] text-[#86868b] hover:border-orange-200 hover:text-orange-500'
        }`}
      >
        {sent ? '已发送 💪' : '给搭子加油 💪'}
      </button>

      {/* 消息选择器 */}
      {showPicker && (
        <div className="absolute right-0 top-full mt-1 z-30 w-44 rounded-apple-lg border border-[#e5e5e7] bg-white shadow-lg py-1">
          {CHEER_MESSAGES.map((msg, i) => (
            <button
              key={i}
              onClick={() => handleCheer(msg)}
              className="w-full px-3 py-2 text-left text-sm text-[#1d1d1f] hover:bg-[#f5f5f7] transition"
            >
              {msg}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
