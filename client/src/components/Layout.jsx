/**
 * 全局布局壳
 * 所有页面通过 <Outlet /> 渲染，底部统一放置导航栏
 * 首页 (/路径) 不显示底部导航栏
 */

import { useEffect, useState, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { useAuth } from '../contexts/AuthContext';  // 【新增】
import api from '../services/api';
import { partnerService } from '../services/partnerService';
import BottomNav from './BottomNav';
import NotificationBadge from './NotificationBadge';

export default function Layout() {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const { currentUser } = useUser();
  const { sessionUser, refreshPartner } = useAuth();  // 【新增】
  const [reminder, setReminder] = useState(null);
  const [inviteNotify, setInviteNotify] = useState(null); // 【新增】邀请通知
  const [cheerNotify, setCheerNotify] = useState(null);   // 【新增】加油通知
  const [unreadCount, setUnreadCount] = useState(0);      // 【新增】未读通知数

  useEffect(() => {
    let timeout;
    const interval = setInterval(async () => {
      try {
        const data = await api.get(`/reminders/pending?userId=${currentUser.id}`);
        if (data && data.length > 0) {
          setReminder(data[0]);
          if (timeout) clearTimeout(timeout);
          timeout = setTimeout(() => setReminder(null), 3000);
        }
      } catch (e) { /* ignore */ }
    }, 8000);
    return () => {
      clearInterval(interval);
      if (timeout) clearTimeout(timeout);
    };
  }, [currentUser.id]);

  // 【新增】轮询搭子邀请通知
  useEffect(() => {
    if (!sessionUser) return;
    const interval = setInterval(async () => {
      try {
        const invites = await api.get(`/auth/invites?username=${sessionUser.username}`);
        if (invites && invites.length > 0) {
          setInviteNotify(invites[0]); // 只显示第一个
        }
      } catch (e) { /* ignore */ }
    }, 8000);
    // 首次立即检查
    api.get(`/auth/invites?username=${sessionUser.username}`).then(invites => {
      if (invites && invites.length > 0) setInviteNotify(invites[0]);
    }).catch(() => {});
    return () => clearInterval(interval);
  }, [sessionUser]);

  // 【新增】轮询加油 + 通知
  useEffect(() => {
    if (!currentUser.id) return;
    let cheerTimeout;
    const interval = setInterval(async () => {
      try {
        const notifs = await partnerService.getNotifications(currentUser.id);
        if (notifs && notifs.length > 0) {
          setUnreadCount(notifs.length);
          // 显示第一条加油通知
          const cheerNotif = notifs.find(n => n.type === 'cheer');
          if (cheerNotif) {
            setCheerNotify(cheerNotif);
            if (cheerTimeout) clearTimeout(cheerTimeout);
            cheerTimeout = setTimeout(() => setCheerNotify(null), 5000);
            await partnerService.markRead(cheerNotif.id);
          }
          // 其余标记已读
          for (const n of notifs) {
            if (n.type !== 'cheer') await partnerService.markRead(n.id);
          }
        } else {
          setUnreadCount(0);
        }
      } catch (e) { /* ignore */ }
    }, 10000);
    return () => {
      clearInterval(interval);
      if (cheerTimeout) clearTimeout(cheerTimeout);
    };
  }, [currentUser.id]);

  // 【新增】处理邀请响应
  const handleInviteResponse = async (inviteId, action) => {
    try {
      await api.post(`/auth/invite/${inviteId}/${action}`);
      setInviteNotify(null);
      if (action === 'accept') await refreshPartner();
    } catch (e) { /* ignore */ }
  };

  return (
    <div className="relative h-full w-full flex flex-col overflow-hidden">
      {/* 搭子提醒通知 */}
      {reminder && (
        <div className="absolute top-4 right-6 z-50 text-xs text-[#86868b] bg-white/90 backdrop-blur px-4 py-2 rounded-apple border border-[#e5e5e7] animate-slide-in-right">
          你的搭子提醒你开始学习啦
        </div>
      )}

      {/* 加油通知 */}
      {cheerNotify && (
        <div className="absolute top-14 right-6 z-50 text-xs text-orange-600 bg-orange-50/90 backdrop-blur px-4 py-2 rounded-apple border border-orange-100 animate-slide-in-right">
          💪 {cheerNotify.body || '你的搭子给你加油啦'}
        </div>
      )}

      {/* 【新增】搭子邀请通知 — 带同意/拒绝按钮 */}
      {inviteNotify && (
        <div className="absolute top-4 right-6 z-50 text-xs text-[#1d1d1f] bg-white/95 backdrop-blur px-4 py-3 rounded-apple-lg border border-[#e5e5e7] shadow-sm space-y-2">
          <p>收到来自 <span className="font-medium">{inviteNotify.fromUsername}</span> 的搭子邀请，是否同意组队？</p>
          <div className="flex gap-2">
            <button onClick={() => handleInviteResponse(inviteNotify.id, 'accept')}
              className="rounded-apple bg-[#1d1d1f] px-3 py-1 text-xs text-white hover:bg-black"
            >同意</button>
            <button onClick={() => handleInviteResponse(inviteNotify.id, 'reject')}
              className="rounded-apple border border-[#e5e5e7] px-3 py-1 text-xs text-[#86868b] hover:bg-gray-50"
            >拒绝</button>
          </div>
        </div>
      )}
      {/* 页面内容区 — 可滚动 */}
      <main className={`flex-1 overflow-y-auto ${isHome ? 'h-full' : ''}`}>
        <Outlet />
      </main>
      {/* 底部导航 — 首页不显示 */}
      {!isHome && <BottomNav unreadCount={unreadCount} />}
    </div>
  );
}
