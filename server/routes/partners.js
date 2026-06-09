/**
 * 搭子互动路由
 * 对比数据、动态、加油功能
 *
 * GET  /compare?user1=&user2=&period=week|month — 两人学习对比
 * GET  /activity?userId=                         — 搭子最近动态
 * POST /cheer                                     — 发送加油
 * GET  /notifications?userId=                     — 获取未读通知
 * POST /notifications/read/:id                    — 标记通知已读
 */

const { v4: uuidv4 } = require('uuid');
const router = require('express').Router();
const db = require('../db');

// ==================== 工具函数 ====================

function getDateRange(period) {
  const now = new Date();
  if (period === 'week') {
    const dayOfWeek = now.getDay() || 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - dayOfWeek + 1);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return { start: monday, end: sunday, label: `${monday.getMonth() + 1}/${monday.getDate()} - ${sunday.getMonth() + 1}/${sunday.getDate()}` };
  } else {
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start: firstDay, end: lastDay, label: `${now.getFullYear()}年${now.getMonth() + 1}月` };
  }
}

function datesBetween(start, end) {
  const dates = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    dates.push(cursor.toISOString().split('T')[0]);
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function monthsInRange(start, end) {
  const months = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cursor <= endMonth) {
    months.push({ year: cursor.getFullYear(), month: cursor.getMonth() + 1 });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
}

function calcUserStats(userId, dates) {
  // 计划统计
  let totalTasks = 0, completedTasks = 0;
  const incompleteTasks = [];
  const months = monthsInRange(new Date(dates[0]), new Date(dates[dates.length - 1]));

  for (const m of months) {
    const plan = db.prepare('SELECT * FROM plans WHERE user_id = ? AND year = ? AND month = ?')
      .get(userId, m.year, m.month);
    if (!plan) continue;
    const days = JSON.parse(plan.days || '{}');
    for (const [dayStr, dayData] of Object.entries(days)) {
      const day = parseInt(dayStr);
      const dateStr = `${plan.year}-${String(plan.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (!dates.includes(dateStr)) continue;
      const tasks = dayData.tasks || [];
      totalTasks += tasks.length;
      for (const t of tasks) {
        if (t.completed) completedTasks++;
        else incompleteTasks.push({ ...t, date: dateStr });
      }
    }
  }

  // 打卡统计
  let totalDuration = 0;
  const subjectDurations = { math: 0, english: 0, professional: 0, politics: 0 };
  const checkinDates = new Set();

  const checkins = db.prepare(
    `SELECT * FROM checkins WHERE user_id = ? AND date >= ? AND date <= ?`
  ).all(userId, dates[0], dates[dates.length - 1]);

  for (const c of checkins) {
    checkinDates.add(c.date);
    const dur = c.duration || 0;
    totalDuration += dur;
    if (subjectDurations[c.subject] !== undefined) {
      subjectDurations[c.subject] += dur;
    }
  }

  // 计算连续打卡
  let streak = 0;
  const sortedDates = [...checkinDates].sort().reverse();
  const today = new Date().toISOString().split('T')[0];
  const cursor = new Date(today);
  while (true) {
    const ds = cursor.toISOString().split('T')[0];
    if (sortedDates.includes(ds)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else if (ds === today) {
      cursor.setDate(cursor.getDate() - 1);
      continue;
    } else {
      break;
    }
  }

  return {
    completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    completedTasks,
    totalTasks,
    totalDuration,
    subjectDurations,
    checkinDays: checkinDates.size,
    streak,
    incompleteTasks: incompleteTasks.slice(0, 20)
  };
}

// ==================== 路由 ====================

// GET /compare — 学习数据对比（需验证配对关系）
router.get('/compare', (req, res) => {
  try {
    const { user1, user2, period = 'week' } = req.query;
    if (!user1 || !user2) return res.status(400).json({ error: '缺少 user1/user2' });

    // 验证两人已配对
    const pair = db.prepare(
      'SELECT * FROM pairs WHERE (user1_username = ? AND user2_username = ?) OR (user1_username = ? AND user2_username = ?)'
    ).get(user1, user2, user2, user1);
    if (!pair) return res.status(403).json({ error: '两人未组队，无法对比' });

    const range = getDateRange(period);
    const dates = datesBetween(range.start, range.end);

    const stats1 = calcUserStats(user1, dates);
    const stats2 = calcUserStats(user2, dates);

    res.json({
      period,
      label: range.label,
      dates,
      users: {
        [user1]: stats1,
        [user2]: stats2
      }
    });
  } catch (e) {
    console.error('对比数据查询失败:', e);
    res.status(500).json({ error: '查询失败' });
  }
});

// GET /activity — 搭子最近动态
router.get('/activity', (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: '缺少 userId' });

    // 查搭子
    const pair = db.prepare(
      'SELECT * FROM pairs WHERE user1_username = ? OR user2_username = ?'
    ).get(userId, userId);
    if (!pair) return res.json([]);

    const partner = pair.user1_username === userId ? pair.user2_username : pair.user1_username;

    const activities = [];

    // 查最近3天的打卡
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];

    const recentCheckins = db.prepare(
      `SELECT * FROM checkins WHERE user_id = ? AND date >= ? ORDER BY date DESC, created_at DESC LIMIT 5`
    ).all(partner, threeDaysAgo);

    for (const c of recentCheckins) {
      activities.push({
        type: 'checkin',
        subject: c.subject,
        date: c.date,
        duration: c.duration || 0,
        content: (c.content || '').slice(0, 30),
        createdAt: c.created_at
      });
    }

    // 查最近完成计划情况
    const currentMonth = today.slice(0, 7);
    const plan = db.prepare(
      `SELECT * FROM plans WHERE user_id = ? AND year = ? AND month = ?`
    ).get(partner, parseInt(currentMonth.slice(0, 4)), parseInt(currentMonth.slice(5, 7)));

    if (plan) {
      const days = JSON.parse(plan.days || '{}');
      const todayTasks = days[parseInt(today.slice(8, 10))]?.tasks || [];
      const completedToday = todayTasks.filter(t => t.completed).length;
      if (completedToday > 0 && todayTasks.length > 0) {
        activities.unshift({
          type: 'plan_complete',
          completed: completedToday,
          total: todayTasks.length,
          date: today,
          createdAt: new Date().toISOString()
        });
      }

      // 连续打卡
      const allCheckins = db.prepare(
        'SELECT DISTINCT date FROM checkins WHERE user_id = ? ORDER BY date DESC'
      ).all(partner);
      const dates = allCheckins.map(r => r.date);
      let streak = 0;
      const cursor = new Date(today);
      while (true) {
        const ds = cursor.toISOString().split('T')[0];
        if (dates.includes(ds)) { streak++; cursor.setDate(cursor.getDate() - 1); }
        else if (ds === today) { cursor.setDate(cursor.getDate() - 1); continue; }
        else break;
      }
      if (streak >= 3) {
        activities.unshift({
          type: 'streak',
          streak,
          createdAt: new Date().toISOString()
        });
      }
    }

    res.json(activities.slice(0, 5));
  } catch (e) {
    console.error('动态查询失败:', e);
    res.status(500).json({ error: '查询失败' });
  }
});

// POST /cheer — 发送加油
router.post('/cheer', (req, res) => {
  try {
    const { fromUserId, toUserId, message } = req.body;
    if (!fromUserId || !toUserId) return res.status(400).json({ error: '缺少 fromUserId/toUserId' });

    const id = uuidv4();
    const msg = message || '加油！';
    const createdAt = new Date().toISOString();

    db.prepare(
      'INSERT INTO cheers (id, from_user_id, to_user_id, message, created_at) VALUES (?, ?, ?, ?, ?)'
    ).run(id, fromUserId, toUserId, msg, createdAt);

    // 同时写入通知表
    const notifId = uuidv4();
    db.prepare(
      'INSERT INTO notifications (id, user_id, type, title, body, ref_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(notifId, toUserId, 'cheer', '加油鼓励', `${fromUserId} 给你加油：${msg}`, id, createdAt);

    res.json({ success: true, cheer: { id, fromUserId, toUserId, message: msg, createdAt } });
  } catch (e) {
    console.error('发送加油失败:', e);
    res.status(500).json({ error: '发送失败' });
  }
});

// GET /notifications — 获取未读通知
router.get('/notifications', (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: '缺少 userId' });

    const unread = db.prepare(
      'SELECT * FROM notifications WHERE user_id = ? AND read = 0 ORDER BY created_at DESC LIMIT 20'
    ).all(userId);

    res.json(unread.map(n => ({
      id: n.id,
      userId: n.user_id,
      type: n.type,
      title: n.title,
      body: n.body,
      refId: n.ref_id,
      read: !!n.read,
      createdAt: n.created_at
    })));
  } catch (e) {
    console.error('获取通知失败:', e);
    res.status(500).json({ error: '获取失败' });
  }
});

// POST /notifications/read/:id — 标记已读（验证归属）
router.post('/notifications/read/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT user_id FROM notifications WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: '通知不存在' });
    if (row.user_id !== req.body.userId) return res.status(403).json({ error: '无权操作' });
    db.prepare('UPDATE notifications SET read = 1 WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: '操作失败' });
  }
});

// POST /notifications/read-all — 全部标记已读
router.post('/notifications/read-all', (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: '缺少 userId' });
    db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(userId);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: '操作失败' });
  }
});

module.exports = router;
