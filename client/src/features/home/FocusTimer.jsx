/**
 * 【新增】首页专注计时器
 * 极简圆角设计，配色与全站统一
 * 状态机：idle → running → paused → stopped
 * 计时结束后自动写入当日对应科目打卡记录
 *
 * 修改位置：HomePage.jsx 中嵌入此组件
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { SUBJECTS } from '../../config/constants';
import { useUser } from '../../contexts/UserContext';
import { checkinService } from '../../services/checkinService';

// 计时器状态枚举
const STATUS = {
  IDLE: 'idle',       // 未开始
  RUNNING: 'running', // 计时中
  PAUSED: 'paused',   // 已暂停
  STOPPED: 'stopped'  // 已结束（过渡态，自动切 idle）
};

export default function FocusTimer() {
  const { currentUser } = useUser();
  const [status, setStatus] = useState(STATUS.IDLE);
  const [subject, setSubject] = useState('math');
  const [seconds, setSeconds] = useState(0);
  const [saving, setSaving] = useState(false);
  const intervalRef = useRef(null);

  // 计时器递增
  useEffect(() => {
    if (status === STATUS.RUNNING) {
      intervalRef.current = setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [status]);

  // 格式化时间为 HH:MM:SS
  const formatTime = (totalSec) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // 开始计时
  const handleStart = () => setStatus(STATUS.RUNNING);

  // 暂停
  const handlePause = () => setStatus(STATUS.PAUSED);

  // 继续
  const handleResume = () => setStatus(STATUS.RUNNING);

  // 结束计时 — 保存到打卡记录
  const handleStop = useCallback(async () => {
    clearInterval(intervalRef.current);
    setStatus(STATUS.STOPPED);
    if (seconds < 10) {
      // 不足10秒不保存
      setSeconds(0);
      setStatus(STATUS.IDLE);
      return;
    }
    setSaving(true);
    try {
      const durationMinutes = Math.round(seconds / 60);
      await checkinService.createCheckin({
        userId: currentUser.id,
        date: new Date().toISOString().split('T')[0],
        subject,
        content: '专注计时',
        duration: durationMinutes,
        images: [],
        files: []
      });
    } catch (e) {
      console.error('保存计时失败:', e);
    } finally {
      setSaving(false);
      setSeconds(0);
      setStatus(STATUS.IDLE);
    }
  }, [seconds, subject, currentUser.id]);

  // 重置
  const handleReset = () => {
    clearInterval(intervalRef.current);
    setSeconds(0);
    setStatus(STATUS.IDLE);
  };

  const subjectInfo = SUBJECTS.find(s => s.key === subject) || SUBJECTS[0];

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4">
      {/* 科目选择 — 仅在 idle 状态显示 */}
      {status === STATUS.IDLE && (
        <div className="flex gap-2">
          {SUBJECTS.map(s => (
            <button
              key={s.key}
              onClick={() => setSubject(s.key)}
              className={`rounded-apple-full px-4 py-1.5 text-xs transition ${
                subject === s.key
                  ? 'text-white'
                  : 'text-white/50 hover:text-white/80 bg-white/10'
              }`}
              style={subject === s.key ? { backgroundColor: s.color } : {}}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* 时间显示 */}
      <p className={`font-mono tracking-[0.15em] text-white/85 ${
        status === STATUS.IDLE ? 'text-[5vh]' : 'text-[6vh]'
      }`}>
        {formatTime(seconds)}
      </p>

      {/* 操作按钮 — 根据状态显示不同按钮 */}
      <div className="flex items-center gap-3">
        {status === STATUS.IDLE && (
          <TimerButton label="开始" onClick={handleStart} />
        )}
        {status === STATUS.RUNNING && (
          <>
            <TimerButton label="暂停" onClick={handlePause} />
            <TimerButton label="结束" onClick={handleStop} variant="secondary" />
          </>
        )}
        {status === STATUS.PAUSED && (
          <>
            <TimerButton label="继续" onClick={handleResume} />
            <TimerButton label="结束" onClick={handleStop} variant="secondary" />
          </>
        )}
        {status === STATUS.STOPPED && saving && (
          <span className="text-xs text-white/50">保存中...</span>
        )}
      </div>

      {/* 运行中科目提示 */}
      {status !== STATUS.IDLE && (
        <span
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: subjectInfo.color }}
        />
      )}
    </div>
  );
}

/**
 * 计时器操作按钮
 * 毛玻璃小按钮，与全站风格统一
 */
function TimerButton({ label, onClick, variant = 'primary' }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-apple-full px-6 py-2 text-xs font-light tracking-[0.1em] backdrop-blur transition ${
        variant === 'primary'
          ? 'bg-white/15 text-white/80 hover:bg-white/25 hover:text-white'
          : 'bg-white/5 text-white/50 hover:bg-white/15 hover:text-white/70'
      }`}
    >
      {label}
    </button>
  );
}
