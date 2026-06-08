/**
 * 学习计划 API
 * 处理月度计划的 CRUD、文字导入、文件导入
 *
 * 数据模型：
 * Plan { id, userId, year, month, days: { "1": { tasks: [] }, "2": ... } }
 * Task { id, title, subject, completed, time?, note? }
 *
 * 存储：SQLite plans 表，days 列为 JSON 文本
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

// ==================== 工具函数 ====================

/** DB 行 (snake_case) → API 响应 (camelCase)，并解析 days JSON */
function toPlan(row) {
  return {
    id: row.id,
    userId: row.user_id,
    year: row.year,
    month: row.month,
    days: JSON.parse(row.days || '{}')
  };
}

// ==================== 预编译语句 ====================

const findPlan = db.prepare(
  'SELECT * FROM plans WHERE user_id = ? AND year = ? AND month = ?'
);
const findPlanById = db.prepare('SELECT * FROM plans WHERE id = ?');
const insertPlan = db.prepare(
  'INSERT INTO plans (id, user_id, year, month, days) VALUES (?, ?, ?, ?, ?)'
);
const upsertPlan = db.prepare(`
  INSERT INTO plans (id, user_id, year, month, days)
  VALUES (?, ?, ?, ?, ?)
  ON CONFLICT(user_id, year, month) DO UPDATE SET days = excluded.days
`);
const updatePlanDays = db.prepare('UPDATE plans SET days = ? WHERE id = ?');
const deletePlan = db.prepare('DELETE FROM plans WHERE id = ?');

// ==================== 路由 ====================

// GET /api/plans?userId=&year=&month= — 获取指定用户指定月份的计划
router.get('/', (req, res) => {
  const { userId, year, month } = req.query;
  if (!userId || !year || !month) {
    return res.status(400).json({ error: '缺少 userId/year/month 参数' });
  }

  const row = findPlan.get(userId, parseInt(year), parseInt(month));
  if (!row) {
    // 自动创建空计划
    const id = uuidv4();
    insertPlan.run(id, userId, parseInt(year), parseInt(month), '{}');
    return res.json({ id, userId, year: parseInt(year), month: parseInt(month), days: {} });
  }

  res.json(toPlan(row));
});

// POST /api/plans — 创建或更新整个月度计划
router.post('/', (req, res) => {
  const { userId, year, month, days } = req.body;
  if (!userId || !year || !month) {
    return res.status(400).json({ error: '缺少必填字段' });
  }

  const id = uuidv4();
  const daysJson = JSON.stringify(days || {});

  upsertPlan.run(id, userId, year, month, daysJson);

  // 回查实际存储的行（确保拿到真实 id，冲突更新时 id 不变）
  const row = findPlan.get(userId, year, month);
  res.json(toPlan(row));
});

// PUT /api/plans/:planId/day/:day — 更新某一天的任务列表
router.put('/:planId/day/:day', (req, res) => {
  const { planId, day } = req.params;
  const { tasks } = req.body;

  const row = findPlanById.get(planId);
  if (!row) return res.status(404).json({ error: '计划不存在' });

  const days = JSON.parse(row.days || '{}');
  days[day] = { tasks: tasks || [] };

  updatePlanDays.run(JSON.stringify(days), planId);

  const updated = findPlanById.get(planId);
  res.json(toPlan(updated));
});

// DELETE /api/plans/:planId — 删除整个月度计划
router.delete('/:planId', (req, res) => {
  deletePlan.run(req.params.planId);
  res.json({ success: true });
});

module.exports = router;
