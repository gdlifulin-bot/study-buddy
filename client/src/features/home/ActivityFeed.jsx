/**
 * 首页动态通知组件
 * 显示搭子的最近学习动态，气泡动画展示
 *
 * @param {Object} partner - 搭子信息 { id, name }
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { partnerService } from '../../services/partnerService';
import { useUser } from '../../contexts/UserContext';

const SUBJECT_LABELS = { math: '数学', english: '英语', professional: '专业课', politics: '政治' };

export default function ActivityFeed() {
  const { currentUser, partner } = useUser();
  const [activities, setActivities] = useState([]);
  const [visible, setVisible] = useState(null);
  const queueRef = useRef([]);
  const timerRef = useRef(null);

  const fetchActivities = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const data = await partnerService.getActivity(currentUser.id);
      if (data && data.length > 0) {
        // 过滤出新动态（不在历史中的）
        const newItems = data.filter(d => !queueRef.current.some(q => q.type === d.type && q.createdAt === d.createdAt));
        if (newItems.length > 0) {
          queueRef.current = [...queueRef.current, ...newItems].slice(-20);
          // 如果当前没有显示的，立即显示第一个
          if (!visible) {
            const next = queueRef.current.shift();
            showActivity(next);
          }
        }
      }
    } catch (e) { /* ignore */ }
  }, [currentUser?.id]);

  useEffect(() => {
    if (!partner) return;
    fetchActivities();
    const interval = setInterval(fetchActivities, 30000);
    return () => clearInterval(interval);
  }, [partner, fetchActivities]);

  function showActivity(item) {
    setVisible(item);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setVisible(null);
      // 显示队列中的下一个
      if (queueRef.current.length > 0) {
        const next = queueRef.current.shift();
        setTimeout(() => showActivity(next), 500);
      }
    }, 4000);
  }

  if (!partner || !visible) return null;

  const message = formatActivity(visible, partner.name);

  return (
    <div className="animate-slide-in-right">
      <div className="rounded-full bg-white/15 backdrop-blur px-4 py-2 text-xs text-white/85">
        {message}
      </div>
    </div>
  );
}

function formatActivity(activity, partnerName) {
  switch (activity.type) {
    case 'checkin':
      return `${partnerName} 刚打卡了${SUBJECT_LABELS[activity.subject] || activity.subject} 📝`;
    case 'plan_complete':
      return `${partnerName} 完成了今日计划 ${activity.completed}/${activity.total} ✅`;
    case 'streak':
      return `${partnerName} 连续打卡 ${activity.streak} 天 🔥`;
    default:
      return `${partnerName} 正在努力学习中 📚`;
  }
}
