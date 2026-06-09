/**
 * 首页
 * 全屏背景图 + 浮动功能入口
 * 设计参考「不背单词APP」首页极简布局
 *
 * 修改入口：替换背景图、调整浮动按钮位置
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';
import api from '../../services/api';
import { EXAM_DATE } from '../../config/constants';  // 默认值兜底
import FocusTimer from './FocusTimer';  // 【新增】专注计时器
import ActivityFeed from './ActivityFeed';  // 【新增】搭子动态

export default function HomePage() {
  const navigate = useNavigate();
  const { currentUser, partner } = useUser();
  const [bgUrl, setBgUrl] = useState(null);
  const [bgType, setBgType] = useState('default');
  const [examDate, setExamDate] = useState(EXAM_DATE);  // 【新增】考研日期，从后端读取

  // 加载背景配置 + 考研日期（per-user）
  useEffect(() => {
    api.get(`/config?userId=${currentUser.id}`).then(config => {
      setBgType(config.backgroundType || 'default');
      if (config.backgroundType === 'custom' && config.customBackgroundUrl) {
        setBgUrl(config.customBackgroundUrl);
      }
      if (config.examDate) setExamDate(config.examDate);
    }).catch(() => {});
  }, [currentUser.id]);

  // 计算考研倒计时天数
  const examDateObj = new Date(examDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysLeft = Math.ceil((examDateObj - today) / (1000 * 60 * 60 * 24));
  const countdownText = daysLeft > 0
    ? `距离考研还有 ${daysLeft} 天`
    : daysLeft === 0 ? '今天就是考研日' : '考研已结束';

  const bgStyle = bgType === 'custom' && bgUrl
    ? { backgroundImage: `url(${bgUrl})` }
    : {};

  return (
    <div
      className="relative h-full w-full bg-cover bg-center bg-no-repeat"
      style={{
        backgroundColor: bgType === 'default' ? '#1a1a2e' : undefined,
        ...bgStyle
      }}
    >
      {/* 默认背景 - CSS 渐变模拟极简艺术背景 */}
      {bgType === 'default' && (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-zinc-900" />
      )}

      {/* 半透明渐变遮罩 — 保证文字可读性 */}
      <div className="absolute inset-0 bg-black/10" />

      {/* 内容区 */}
      <div className="relative z-10 flex h-full flex-col justify-between p-6">
        {/* 【修改 2026-06-08】左上角：日期 + 【新增】考研倒计时 */}
        <div className="absolute top-8 left-6">
          <p className="text-[5vh] font-extralight leading-none tracking-[0.12em] text-white/85 uppercase">
            {new Date().toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              weekday: 'long'
            })}
          </p>
          {/* 【新增】考研倒计时 — 字号略小于日期，风格统一 */}
          <p className="mt-2 text-[3vh] font-light tracking-[0.1em] text-white/55">
            {countdownText}
          </p>
        </div>

        {/* 【改造】右上角显示当前用户名 + 搭子状态 */}
        <div className="absolute top-4 right-6 rounded-full bg-white/15 px-4 py-1.5 text-xs text-white/80 backdrop-blur">
          {currentUser.name}{partner ? ` · 搭子: ${partner.name}` : ''}
        </div>

        {/* 【新增】专注计时器 — 居中放置，位于日期下方 */}
        <FocusTimer />

        {/* 中间：大标题 */}
        <div className="absolute top-1/2 left-6 -translate-y-1/2">
          <h1 className="text-[28px] font-light tracking-[0.3em] text-white/90">
            考研搭子
          </h1>
          <p className="mt-2 text-sm font-light tracking-[0.2em] text-white/50">
            今日学习 · {currentUser.name}
          </p>
        </div>

        {/* 【新增】搭子动态通知 — 底部左下角 */}
        <div className="absolute bottom-24 left-6 z-20">
          <ActivityFeed />
        </div>

        {/* 【修改】底部右下角：功能入口按钮组 — 计划/报表/打卡/设置 自上而下 */}
        <div className="absolute bottom-6 right-6 flex flex-col items-end gap-4">
          <HomeButton
            label="计划表"
            onClick={() => navigate('/planner')}
          />
          <HomeButton
            label="报表"
            onClick={() => navigate('/report')}
          />
          <HomeButton
            label="打卡"
            onClick={() => navigate('/checkin')}
          />
          <HomeButton
            label="设置"
            onClick={() => navigate('/settings')}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * 【修改 2026-06-08】首页浮动功能按钮
 * 圆角长方形，毛玻璃效果，三按钮统一尺寸（w-36 固定宽度）
 */
function HomeButton({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex w-36 items-center justify-center rounded-apple-lg bg-white/15 py-3 text-base font-light tracking-[0.1em] text-white/80 backdrop-blur transition hover:bg-white/25 hover:text-white"
    >
      {label}
    </button>
  );
}
