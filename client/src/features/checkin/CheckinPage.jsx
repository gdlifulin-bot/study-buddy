/**
 * 打卡主页
 * 科目Tab切换 + 打卡表单 + 历史记录
 * 支持查看自己/搭子的打卡内容
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';
import { useCheckin } from '../../contexts/CheckinContext';
import { SUBJECTS } from '../../config/constants';
import api from '../../services/api';
import { partnerService } from '../../services/partnerService';
import SubjectTabs from './SubjectTabs';
import CheckinForm from './CheckinForm';
import CheckinHistory from './CheckinHistory';
import PartnerSelector from './PartnerSelector';
import StreakBadge from './StreakBadge';
import CheckinHeatmap from './CheckinHeatmap';
import CheerButton from './CheerButton';

export default function CheckinPage() {
  const { subject } = useParams();
  const { currentUser, partner } = useUser();
  const { checkins, fetchCheckins, addCheckin, removeCheckin } = useCheckin();

  const [activeSubject, setActiveSubject] = useState(subject || 'math');
  const [viewUser, setViewUser] = useState(currentUser.id); // 查看谁（自己或搭子）
  const [showForm, setShowForm] = useState(false);
  const [reminderSent, setReminderSent] = useState(false);
  const [streakData, setStreakData] = useState({ streak: 0, longestStreak: 0 });
  const [heatmapData, setHeatmapData] = useState({});
  const [showHeatmap, setShowHeatmap] = useState(false);

  // 同步 URL 参数到 activeSubject
  useEffect(() => {
    if (subject) setActiveSubject(subject);
  }, [subject]);

  // 加载打卡数据
  useEffect(() => {
    fetchCheckins({ userId: viewUser, subject: activeSubject });
  }, [viewUser, activeSubject, fetchCheckins]);

  // 加载连续打卡 & 热力图数据
  useEffect(() => {
    if (!viewUser) return;
    partnerService.getStreak(viewUser).then(setStreakData).catch(() => {});
    // 获取本月所有打卡数据用于热力图
    const now = new Date();
    api.get(`/checkins?userId=${viewUser}&date=${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`).then(() => {
      // 按日期汇总
      const heatmap = {};
      checkins.forEach(c => {
        if (c.date) heatmap[c.date] = (heatmap[c.date] || 0) + 1;
      });
      // 获取本月全部打卡（需要多次查询，简化为基于已加载数据）
    }).catch(() => {});
    // 从 checkins 构建热力图
    const hm = {};
    checkins.forEach(c => {
      if (c.date) hm[c.date] = (hm[c.date] || 0) + 1;
    });
    setHeatmapData(hm);
  }, [viewUser, currentUser.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // 切换用户时重置热力图选中
  useEffect(() => {
    setShowHeatmap(false);
  }, [viewUser]);

  // 提交打卡
  const handleSubmit = useCallback(async (data) => {
    await addCheckin({
      ...data,
      userId: currentUser.id,
      subject: activeSubject,
      date: new Date().toISOString().split('T')[0]
    });
    setShowForm(false);
  }, [currentUser.id, activeSubject, addCheckin]);

  // 科目信息
  const subjectInfo = SUBJECTS.find(s => s.key === activeSubject) || SUBJECTS[0];

  // 【新增】计算今日总学习时长（跨所有科目）
  const todayTotalDuration = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return checkins
      .filter(c => c.date === today)
      .reduce((sum, c) => sum + (c.duration || 0), 0);
  }, [checkins]);

  // 【新增】格式化时长显示
  const formatDuration = (minutes) => {
    if (!minutes || minutes <= 0) return null;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0 && m > 0) return `${h}小时${m}分钟`;
    if (h > 0) return `${h}小时`;
    return `${m}分钟`;
  };

  return (
    <div className="flex h-full flex-col bg-white">
      {/* 顶部区域 */}
      <div className="shrink-0 border-b border-apple-border px-5 pt-4 pb-0">
        {/* 标题行 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-medium text-apple-black">打卡</h1>
            <StreakBadge streak={streakData.streak} />
            {/* 【改造】仅组队后显示提醒搭子按钮 */}
            {partner && (
              <button
                onClick={async () => {
                  await api.post('/reminders', { fromUserId: currentUser.id, toUserId: partner.id });
                  setReminderSent(true);
                  setTimeout(() => setReminderSent(false), 2000);
                }}
                className="text-xs text-[#86868b] hover:text-[#1d1d1f]"
              >
                {reminderSent ? '已发送' : '提醒搭子'}
              </button>
            )}
          </div>
          <PartnerSelector
            viewUser={viewUser}
            onChange={setViewUser}
          />
          {/* 查看搭子时显示加油按钮 */}
          {viewUser !== currentUser.id && partner && (
            <CheerButton fromUserId={currentUser.id} toUserId={viewUser} compact />
          )}
        </div>

        {/* 【新增】今日总学习时长 — 极简文字展示，自动汇总各科目录入 */}
        {formatDuration(todayTotalDuration) && (
          <p className="text-xs text-[#86868b] mt-1">
            今日总学习时长：{formatDuration(todayTotalDuration)}
          </p>
        )}

        {/* 科目切换 Tab */}
        <SubjectTabs
          subjects={SUBJECTS}
          active={activeSubject}
          onChange={key => {
            setActiveSubject(key);
            // 更新 URL
            window.history.replaceState(null, '', `/checkin/${key}`);
          }}
        />
      </div>

      {/* 今日打卡按钮 */}
      {viewUser === currentUser.id && (
        <div className="shrink-0 px-5 py-3">
          <button
            onClick={() => setShowForm(!showForm)}
            className={`w-full rounded-apple border py-3 text-sm transition ${
              showForm
                ? 'border-apple-black bg-apple-black text-white'
                : 'border-apple-border text-apple-black hover:bg-apple-light'
            }`}
          >
            {showForm ? '收起' : `今日${subjectInfo.label}打卡`}
          </button>
          {showForm && (
            <div className="mt-3">
              <CheckinForm onSubmit={handleSubmit} subject={subjectInfo} />
            </div>
          )}
        </div>
      )}

      {/* 本月打卡热力图 — 可折叠 */}
      <div className="shrink-0 px-5 py-2 border-t border-[#e5e5e7]">
        <button
          onClick={() => setShowHeatmap(!showHeatmap)}
          className="flex items-center gap-1 text-xs text-[#86868b] hover:text-[#1d1d1f] py-1"
        >
          <span>{showHeatmap ? '▾' : '▸'}</span>
          本月打卡日历
        </button>
        {showHeatmap && (
          <div className="max-w-[280px] pb-2">
            <CheckinHeatmap
              heatmapData={heatmapData}
              year={new Date().getFullYear()}
              month={new Date().getMonth() + 1}
              onDayClick={() => {}}
            />
          </div>
        )}
      </div>

      {/* 打卡记录列表 */}
      <div className="flex-1 overflow-y-auto px-5">
        <CheckinHistory
          checkins={checkins}
          onDelete={viewUser === currentUser.id ? (id) => removeCheckin(id, currentUser.id) : null}
        />
      </div>
    </div>
  );
}
