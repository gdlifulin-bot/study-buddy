/**
 * 学习监督网站 - 后端入口
 * Express + SQLite + CORS + 无缓存策略
 *
 * 数据库：D:/study-buddy data/studybuddy.db
 * 启动：  node index.js  /  双击 start.bat
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

// 初始化数据库（含表结构安全检查）
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// ==================== 中间件 ====================

// CORS — 云端限制来源，本地允许所有
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-username']
}));

// 请求体解析
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 【白屏修复】禁止浏览器缓存 API 响应
app.use('/api', (req, res, next) => {
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  next();
});

// 静态文件
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));
}

// ==================== 路由 ====================
app.use('/api/plans', require('./routes/plans'));
app.use('/api/checkins', require('./routes/checkins'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/config', require('./routes/config'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/reminders', require('./routes/reminders'));
app.use('/api/partners', require('./routes/partners'));
app.use('/api/auth', require('./routes/auth'));

// SPA fallback
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
  });
}

// 【白屏修复】全局错误处理 — 防止未捕获异常导致服务崩溃
app.use((err, req, res, next) => {
  console.error('服务器错误:', err.message);
  res.status(500).json({ error: '服务器内部错误' });
});

// ==================== 启动 ====================
async function startServer() {
  // 等数据库初始化完成
  await db.initPromise;

  app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('  考研搭子 · 服务器已启动');
    console.log('  ────────────────────────');
    console.log(`  本地:     http://localhost:${PORT}`);
    console.log(`  局域网:   http://${getLocalIP()}:${PORT}`);
    console.log(`  数据库:   ${require('path').join(process.env.DB_DIR || 'D:/study-buddy data', 'studybuddy.db')}`);
    console.log('');

    // 启动自动提醒定时器
    startAutoReminder();
  });
}

startServer().catch(err => {
  console.error('服务器启动失败:', err);
  process.exit(1);
});

function getLocalIP() {
  const { networkInterfaces } = require('os');
  for (const name of Object.keys(networkInterfaces())) {
    for (const net of networkInterfaces()[name]) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return 'localhost';
}

/**
 * 自动提醒系统
 * 每天在配置的时间检查所有配对用户，未学习者向搭子发送提醒
 */
function startAutoReminder() {
  const db = require('./db');
  const { v4: uuidv4 } = require('uuid');

  // 检查间隔：每 30 分钟检查一次，但在目标时间 ±15 分钟内触发
  const CHECK_INTERVAL = 30 * 60 * 1000; // 30 分钟

  async function checkAndRemind() {
    try {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const currentHour = now.getHours();

      // 默认晚上 21:00 检查（允许 20:30-21:30 窗口内触发）
      const configRow = db.prepare("SELECT value FROM config WHERE key = 'autoReminderTime'").get();
      const reminderTime = configRow?.value || '21:00';
      const [targetHour] = reminderTime.split(':').map(Number);

      // 只在目标小时附近触发（±1 小时窗口）
      if (Math.abs(currentHour - targetHour) > 1) return;

      // 防止同一天重复发送
      const configRow2 = db.prepare("SELECT value FROM config WHERE key = 'lastAutoReminderDate'").get();
      if (configRow2?.value === today) return;

      // 获取所有配对
      const pairs = db.prepare('SELECT * FROM pairs').all();

      for (const pair of pairs) {
        for (const username of [pair.user1_username, pair.user2_username]) {
          const partner = username === pair.user1_username ? pair.user2_username : pair.user1_username;

          // 检查今天是否有打卡记录
          const todayCheckin = db.prepare(
            'SELECT COUNT(*) as cnt FROM checkins WHERE user_id = ? AND date = ?'
          ).get(username, today);

          // 检查今天是否有完成的任务
          const currentMonth = today.slice(0, 7);
          const plan = db.prepare(
            'SELECT * FROM plans WHERE user_id = ? AND year = ? AND month = ?'
          ).get(username, parseInt(currentMonth.slice(0, 4)), parseInt(currentMonth.slice(5, 7)));

          let hasCompletedTask = false;
          if (plan) {
            const days = JSON.parse(plan.days || '{}');
            const todayDay = parseInt(today.slice(8, 10));
            const todayTasks = days[todayDay]?.tasks || [];
            hasCompletedTask = todayTasks.some(t => t.completed);
          }

          const hasActivity = (todayCheckin?.cnt || 0) > 0 || hasCompletedTask;

          if (!hasActivity) {
            // 检查连续偷懒天数
            let lazyDays = 1;
            const cursor = new Date(now);
            for (let i = 1; i <= 7; i++) {
              cursor.setDate(cursor.getDate() - 1);
              const ds = cursor.toISOString().split('T')[0];
              const checkin = db.prepare(
                'SELECT COUNT(*) as cnt FROM checkins WHERE user_id = ? AND date = ?'
              ).get(username, ds);
              if ((checkin?.cnt || 0) === 0) {
                lazyDays++;
              } else {
                break;
              }
            }

            // 写入提醒
            const reminderId = uuidv4();
            const notifId = uuidv4();
            const createdAt = new Date().toISOString();
            const title = lazyDays >= 3
              ? `⚠️ ${username} 已连续 ${lazyDays} 天未学习`
              : `💡 ${username} 今天还没开始学习`;

            db.prepare(
              'INSERT INTO reminders (id, from_user_id, to_user_id, created_at) VALUES (?, ?, ?, ?)'
            ).run(reminderId, 'system', partner, createdAt);

            db.prepare(
              'INSERT INTO notifications (id, user_id, type, title, body, ref_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
            ).run(notifId, partner, 'auto_reminder', title,
              lazyDays >= 3 ? '快去提醒TA吧！' : '快去提醒TA开始学习吧！', reminderId, createdAt);
          }
        }
      }

      // 记录今天已检查
      db.prepare(
        'INSERT INTO config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
      ).run('lastAutoReminderDate', today);

      console.log(`[自动提醒] ${today} 检查完成`);
    } catch (e) {
      console.error('[自动提醒] 检查失败:', e.message);
    }
  }

  // 启动时立即检查一次，之后每 30 分钟检查
  checkAndRemind();
  const interval = setInterval(checkAndRemind, CHECK_INTERVAL);
  console.log(`  自动提醒:  已启动 (间隔 ${CHECK_INTERVAL / 60000} 分钟)`);

  // 防止进程挂起
  if (interval.unref) interval.unref();
}
