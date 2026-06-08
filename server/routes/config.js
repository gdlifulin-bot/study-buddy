/**
 * 全局配置 API
 * 管理背景图、用户偏好等全局设置
 *
 * 数据模型：config 表 (key-value)
 */

const express = require('express');
const router = express.Router();
const db = require('../db');

// 默认配置
const DEFAULTS = {
  backgroundType: 'default',
  customBackgroundUrl: null,
  examDate: '2026-12-26'
};

// 预编译 SQL
const stmtSelectAll = db.prepare('SELECT key, value FROM config');
const stmtUpsert = db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)');

// 从数据库构建配置对象
function buildConfig() {
  const rows = stmtSelectAll.all();
  const config = { ...DEFAULTS };

  for (const row of rows) {
    let val = row.value;

    // 将空字符串转回 null（数据库不支持 null 存储）
    if (val === '') val = null;

    config[row.key] = val;
  }

  // examDate 和 backgroundType 需要确保类型正确
  if (config.examDate && typeof config.examDate === 'string') {
    // 保持字符串格式，和原来的 JSON 文件一致
  }

  return config;
}

// GET /api/config — 获取配置
router.get('/', (req, res) => {
  const config = buildConfig();
  res.json(config);
});

// PUT /api/config — 更新配置
router.put('/', (req, res) => {
  for (const [key, value] of Object.entries(req.body)) {
    stmtUpsert.run(key, String(value ?? ''));
  }
  const config = buildConfig();
  res.json(config);
});

// POST /api/config/background — 单独更新背景设置
router.post('/background', (req, res) => {
  const { backgroundType, customBackgroundUrl } = req.body;
  if (backgroundType !== undefined) {
    stmtUpsert.run('backgroundType', backgroundType);
  }
  if (customBackgroundUrl !== undefined) {
    stmtUpsert.run('customBackgroundUrl', String(customBackgroundUrl ?? ''));
  }
  const config = buildConfig();
  res.json(config);
});

module.exports = router;
