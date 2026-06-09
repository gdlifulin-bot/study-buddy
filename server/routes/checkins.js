/**
 * 打卡记录 API
 * 处理打卡的 CRUD，支持按用户/日期/科目筛选
 *
 * 数据模型：
 * Checkin { id, userId, date, subject, content, images[], files[], duration, createdAt }
 *
 * 存储：SQLite checkins 表，images / files 列以 JSON 数组文本存储
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

// ==================== 工具函数 ====================

/** DB 行 (snake_case) → API 响应 (camelCase)，并解析 images/files JSON */
function toCheckin(row) {
  return {
    id: row.id,
    userId: row.user_id,
    date: row.date,
    subject: row.subject,
    content: row.content || '',
    images: JSON.parse(row.images || '[]'),
    files: JSON.parse(row.files || '[]'),
    duration: row.duration || 0,
    createdAt: row.created_at
  };
}

// ==================== 预编译语句（固定查询） ====================

const insertCheckin = db.prepare(`
  INSERT INTO checkins (id, user_id, date, subject, content, images, files, duration, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const deleteCheckin = db.prepare('DELETE FROM checkins WHERE id = ?');

// ==================== 路由 ====================

// GET /api/checkins?userId=&date=&subject= — 查询打卡记录（userId 必填）
router.get('/', (req, res) => {
  const { userId, date, subject } = req.query;

  if (!userId) return res.status(400).json({ error: '缺少 userId 参数' });

  const conditions = ['user_id = ?'];
  const params = [userId];
  if (date) {
    conditions.push('date = ?');
    params.push(date);
  }
  if (subject) {
    conditions.push('subject = ?');
    params.push(subject);
  }

  let sql = 'SELECT * FROM checkins';
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  sql += ' ORDER BY created_at DESC';

  const rows = db.prepare(sql).all(...params);
  res.json(rows.map(toCheckin));
});

// POST /api/checkins — 新建打卡
router.post('/', (req, res) => {
  const { userId, date, subject, content, images, files, duration } = req.body;
  if (!userId || !date || !subject) {
    return res.status(400).json({ error: '缺少必填字段：userId, date, subject' });
  }

  const id = uuidv4();
  const createdAt = new Date().toISOString();

  insertCheckin.run(
    id, userId, date, subject,
    content || '',
    JSON.stringify(images || []),
    JSON.stringify(files || []),
    duration || 0,
    createdAt
  );

  res.status(201).json({
    id,
    userId,
    date,
    subject,
    content: content || '',
    images: images || [],
    files: files || [],
    duration: duration || 0,
    createdAt
  });
});

// GET /api/checkins/streak?userId= — 计算连续打卡天数
router.get('/streak', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: '缺少 userId' });

  // 获取该用户所有打卡日期（去重排序）
  const rows = db.prepare(
    'SELECT DISTINCT date FROM checkins WHERE user_id = ? ORDER BY date DESC'
  ).all(userId);

  const dates = rows.map(r => r.date);
  const today = new Date().toISOString().split('T')[0];

  // 计算当前连续天数（从今天往前数）
  let streak = 0;
  const cursor = new Date(today);
  while (true) {
    const ds = cursor.toISOString().split('T')[0];
    if (dates.includes(ds)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else if (ds === today) {
      // 今天还没打卡，从昨天开始算
      cursor.setDate(cursor.getDate() - 1);
      continue;
    } else {
      break;
    }
  }

  // 计算历史最长连续天数
  let longestStreak = 0;
  let currentRun = 0;
  const allDates = dates.slice().sort(); // 升序
  for (let i = 0; i < allDates.length; i++) {
    if (i === 0) {
      currentRun = 1;
    } else {
      const prev = new Date(allDates[i - 1]);
      const curr = new Date(allDates[i]);
      const diff = (curr - prev) / (1000 * 60 * 60 * 24);
      if (diff === 1) {
        currentRun++;
      } else {
        currentRun = 1;
      }
    }
    if (currentRun > longestStreak) longestStreak = currentRun;
  }

  res.json({ streak, longestStreak });
});

// DELETE /api/checkins/:id — 删除打卡（需验证归属）
router.delete('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM checkins WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: '打卡不存在' });
  if (row.user_id !== req.query.userId) return res.status(403).json({ error: '无权删除他人打卡' });
  deleteCheckin.run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
