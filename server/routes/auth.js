/**
 * 学习监督网站 - 用户认证与配对路由
 * 提供注册、登录、搜索、邀请、配对等 API
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

// ==================== 工具函数 ====================

/**
 * 验证用户名：3-20个字符，支持字母、数字、中文
 */
function isValidUsername(username) {
  if (!username || typeof username !== 'string') return false;
  return /^[a-zA-Z0-9一-龥]{3,20}$/.test(username);
}

/**
 * 验证密码：4个字符以上
 */
function isValidPassword(password) {
  if (!password || typeof password !== 'string') return false;
  return password.length >= 4;
}

// ==================== 预编译 SQL ====================

const stmtUserByUsername = db.prepare('SELECT id, username FROM users WHERE username = ?');
const stmtUserByCredentials = db.prepare('SELECT id, username FROM users WHERE username = ? AND password = ?');
const stmtInsertUser = db.prepare('INSERT INTO users (id, username, password) VALUES (?, ?, ?)');
const stmtSearchUsers = db.prepare('SELECT id, username FROM users WHERE username LIKE ? AND username != ? LIMIT 20');
const stmtInviteDuplicate = db.prepare(
  `SELECT id FROM invites WHERE status = 'pending'
   AND ((from_username = ? AND to_username = ?) OR (from_username = ? AND to_username = ?))`
);
const stmtPairExists = db.prepare(
  'SELECT id FROM pairs WHERE (user1_username = ? OR user2_username = ?) AND (user1_username = ? OR user2_username = ?)'
);
const stmtInsertInvite = db.prepare('INSERT INTO invites (id, from_username, to_username, status) VALUES (?, ?, ?, ?)');
const stmtPendingInvites = db.prepare(
  `SELECT id, from_username AS fromUsername, to_username AS toUsername, status, created_at AS createdAt
   FROM invites WHERE to_username = ? AND status = 'pending'`
);
const stmtInviteById = db.prepare('SELECT * FROM invites WHERE id = ?');
const stmtUpdateInviteStatus = db.prepare('UPDATE invites SET status = ? WHERE id = ?');
const stmtInsertPair = db.prepare('INSERT INTO pairs (id, user1_username, user2_username) VALUES (?, ?, ?)');
const stmtRejectOtherInvites = db.prepare(
  `UPDATE invites SET status = 'rejected'
   WHERE status = 'pending' AND id != ?
   AND (from_username IN (?, ?) OR to_username IN (?, ?))`
);
const stmtFindPair = db.prepare('SELECT user1_username, user2_username FROM pairs WHERE user1_username = ? OR user2_username = ?');

// ==================== 1. 注册 ====================

router.post('/register', (req, res) => {
  const { username, password } = req.body;

  // 参数验证
  if (!username || !password) {
    return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
  }
  if (!isValidUsername(username)) {
    return res.status(400).json({ success: false, message: '用户名需为3-20个字符，支持字母、数字、中文' });
  }
  if (!isValidPassword(password)) {
    return res.status(400).json({ success: false, message: '密码至少需要4个字符' });
  }

  // 检查用户名唯一性
  const exists = stmtUserByUsername.get(username);
  if (exists) {
    return res.status(409).json({ success: false, message: '该用户名已被注册' });
  }

  const id = uuidv4();
  stmtInsertUser.run(id, username, password);

  return res.json({
    success: true,
    user: { id, username }
  });
});

// ==================== 2. 登录 ====================

router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
  }

  const user = stmtUserByCredentials.get(username, password);

  if (!user) {
    return res.status(401).json({ success: false, message: '用户名或密码错误' });
  }

  return res.json({
    success: true,
    user: { id: user.id, username: user.username }
  });
});

// ==================== 3. 搜索用户 ====================

router.get('/search', (req, res) => {
  const q = (req.query.q || '').trim();
  const exclude = req.query.exclude || req.headers['x-username'] || '';

  if (!q) {
    return res.json([]);
  }

  const results = stmtSearchUsers.all(`%${q}%`, exclude);

  return res.json(results);
});

// ==================== 4. 发送邀请 ====================

router.post('/invite', (req, res) => {
  const fromUsername = req.body.fromUsername || req.headers['x-username'] || '';
  const toUsername = req.body.toUsername || '';

  if (!fromUsername || !toUsername) {
    return res.status(400).json({ success: false, message: '发送方和接收方用户名不能为空' });
  }

  if (fromUsername === toUsername) {
    return res.status(400).json({ success: false, message: '不能邀请自己' });
  }

  // 验证双方用户存在
  const fromUser = stmtUserByUsername.get(fromUsername);
  const toUser = stmtUserByUsername.get(toUsername);

  if (!fromUser) {
    return res.status(404).json({ success: false, message: `用户 "${fromUsername}" 不存在` });
  }
  if (!toUser) {
    return res.status(404).json({ success: false, message: `用户 "${toUsername}" 不存在` });
  }

  // 检查是否已有待处理的邀请（双向检查）
  const duplicate = stmtInviteDuplicate.get(fromUsername, toUsername, toUsername, fromUsername);
  if (duplicate) {
    return res.status(409).json({ success: false, message: '已存在待处理的邀请，请勿重复发送' });
  }

  // 检查是否已经配对
  const alreadyPaired = stmtPairExists.get(fromUsername, fromUsername, toUsername, toUsername);
  if (alreadyPaired) {
    return res.status(409).json({ success: false, message: '双方已经是学习伙伴' });
  }

  const id = uuidv4();
  stmtInsertInvite.run(id, fromUsername, toUsername, 'pending');

  return res.json({ success: true });
});

// ==================== 5. 获取待处理邀请 ====================

router.get('/invites', (req, res) => {
  const username = req.query.username || '';

  if (!username) {
    return res.status(400).json({ success: false, message: '请提供用户名参数' });
  }

  const pending = stmtPendingInvites.all(username);

  return res.json(pending);
});

// ==================== 6. 接受邀请 ====================

router.post('/invite/:id/accept', (req, res) => {
  const inviteId = req.params.id;

  const invite = stmtInviteById.get(inviteId);

  if (!invite) {
    return res.status(404).json({ success: false, message: '邀请不存在' });
  }

  if (invite.status !== 'pending') {
    return res.status(400).json({ success: false, message: '该邀请已被处理' });
  }

  // 更新邀请状态为 accepted
  stmtUpdateInviteStatus.run('accepted', inviteId);

  // 创建配对
  const pairId = uuidv4();
  stmtInsertPair.run(pairId, invite.from_username, invite.to_username);

  // 拒绝双方所有其他待处理邀请
  stmtRejectOtherInvites.run(
    inviteId,
    invite.from_username, invite.to_username,
    invite.from_username, invite.to_username
  );

  return res.json({
    success: true,
    partner: invite.from_username
  });
});

// ==================== 7. 拒绝邀请 ====================

router.post('/invite/:id/reject', (req, res) => {
  const inviteId = req.params.id;

  const invite = stmtInviteById.get(inviteId);

  if (!invite) {
    return res.status(404).json({ success: false, message: '邀请不存在' });
  }

  if (invite.status !== 'pending') {
    return res.status(400).json({ success: false, message: '该邀请已被处理' });
  }

  stmtUpdateInviteStatus.run('rejected', inviteId);

  return res.json({ success: true });
});

// ==================== 8. 获取当前伙伴 ====================

router.get('/partner', (req, res) => {
  const username = req.query.username || '';

  if (!username) {
    return res.status(400).json({ success: false, message: '请提供用户名参数' });
  }

  const pair = stmtFindPair.get(username, username);

  if (!pair) {
    return res.json({ partner: null });
  }

  const partnerName = pair.user1_username === username ? pair.user2_username : pair.user1_username;
  return res.json({ partner: partnerName });
});

module.exports = router;
