/**
 * 用户配置 API（per-user 隔离）
 * GET  /api/config?userId=xxx — 获取用户配置（合并全局默认）
 * PUT  /api/config           — 更新用户配置 { userId, ...kv }
 * POST /api/config/background — 更新背景设置 { userId, backgroundType, customBackgroundUrl }
 */

const express = require('express');
const router = express.Router();
const db = require('../db');

const DEFAULTS = {
  backgroundType: 'default',
  customBackgroundUrl: null,
  examDate: '2026-12-26'
};

// 预编译 SQL
const stmtSelectUser = db.prepare('SELECT key, value FROM config WHERE user_id = ?');
const stmtSelectGlobal = db.prepare("SELECT key, value FROM config WHERE user_id = ''");
const stmtUpsert = db.prepare(
  'INSERT OR REPLACE INTO config (key, user_id, value) VALUES (?, ?, ?)'
);

function buildConfig(userId) {
  // 全局默认 + 数据库全局默认 + 用户覆盖
  const config = { ...DEFAULTS };

  // 1. 加载全局默认（user_id = ''）
  const globalRows = stmtSelectGlobal.all();
  for (const row of globalRows) {
    config[row.key] = row.value === '' ? null : row.value;
  }

  // 2. 加载用户配置（覆盖全局）
  if (userId) {
    const userRows = stmtSelectUser.all(userId);
    for (const row of userRows) {
      config[row.key] = row.value === '' ? null : row.value;
    }
  }

  return config;
}

// GET /api/config?userId=xxx
router.get('/', (req, res) => {
  const userId = req.query.userId || '';
  res.json(buildConfig(userId));
});

// PUT /api/config — body: { userId, key1: val1, key2: val2, ... }
router.put('/', (req, res) => {
  const { userId, ...entries } = req.body;
  if (!userId) return res.status(400).json({ error: '缺少 userId' });

  for (const [key, value] of Object.entries(entries)) {
    if (key === 'userId') continue;
    stmtUpsert.run(key, userId, String(value ?? ''));
  }
  res.json(buildConfig(userId));
});

// POST /api/config/background — body: { userId, backgroundType, customBackgroundUrl }
router.post('/background', (req, res) => {
  const { userId, backgroundType, customBackgroundUrl } = req.body;
  if (!userId) return res.status(400).json({ error: '缺少 userId' });

  if (backgroundType !== undefined) {
    stmtUpsert.run('backgroundType', userId, backgroundType);
  }
  if (customBackgroundUrl !== undefined) {
    stmtUpsert.run('customBackgroundUrl', userId, String(customBackgroundUrl ?? ''));
  }
  res.json(buildConfig(userId));
});

module.exports = router;
