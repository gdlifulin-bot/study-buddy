/**
 * 提醒路由
 * 搭子间相互提醒学习功能
 * POST / - 创建提醒
 * GET /pending - 获取未读提醒并标记为已读
 */

const { v4: uuidv4 } = require('uuid');
const router = require('express').Router();
const db = require('../db');

// 预编译 SQL
const stmtInsert = db.prepare(
  'INSERT INTO reminders (id, from_user_id, to_user_id, created_at) VALUES (?, ?, ?, ?)'
);
const stmtSelectUnread = db.prepare(
  `SELECT id, from_user_id AS fromUserId, to_user_id AS toUserId, created_at AS createdAt, read
   FROM reminders WHERE to_user_id = ? AND read = 0`
);
const stmtMarkRead = db.prepare('UPDATE reminders SET read = 1 WHERE id = ?');

// 创建提醒
router.post('/', (req, res) => {
  try {
    const { fromUserId, toUserId } = req.body;

    if (!fromUserId || !toUserId) {
      return res.status(400).json({ error: '缺少 fromUserId 或 toUserId' });
    }

    const id = uuidv4();
    const createdAt = new Date().toISOString();

    stmtInsert.run(id, fromUserId, toUserId, createdAt);

    res.json({
      success: true,
      reminder: { id, fromUserId, toUserId, createdAt, read: false }
    });
  } catch (error) {
    res.status(500).json({ error: '创建提醒失败' });
  }
});

// 获取未读提醒（同时标记为已读）
router.get('/pending', (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: '缺少 userId 参数' });
    }

    const unread = stmtSelectUnread.all(userId);

    // 标记为已读
    if (unread.length > 0) {
      for (const r of unread) {
        stmtMarkRead.run(r.id);
      }
    }

    // read 字段转为布尔值，匹配原 API
    const result = unread.map(r => ({ ...r, read: !!r.read }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: '获取提醒失败' });
  }
});

module.exports = router;
