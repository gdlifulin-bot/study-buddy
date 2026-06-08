/**
 * SQLite 数据库模块
 * 本地模式：D:/study-buddy data/studybuddy.db
 * 云端模式：Railway 持久化卷 /data/studybuddy.db
 *
 * 通过 DB_DIR 环境变量切换
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// 数据库文件路径 — 本地/云端自动适配
const DB_DIR = process.env.DB_DIR || 'D:/study-buddy data';
const DB_PATH = path.join(DB_DIR, 'studybuddy.db');

// 确保目录存在
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// 初始化数据库连接
const db = new Database(DB_PATH);

// 启用 WAL 模式提升并发性能
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ==================== 建表 ====================
db.exec(`
  -- 用户表
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- 搭子配对表
  CREATE TABLE IF NOT EXISTS pairs (
    id TEXT PRIMARY KEY,
    user1_username TEXT NOT NULL,
    user2_username TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- 组队邀请表
  CREATE TABLE IF NOT EXISTS invites (
    id TEXT PRIMARY KEY,
    from_username TEXT NOT NULL,
    to_username TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- 学习计划表（days 以 JSON 文本存储整月数据）
  CREATE TABLE IF NOT EXISTS plans (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    days TEXT DEFAULT '{}',
    UNIQUE(user_id, year, month)
  );

  -- 打卡记录表
  CREATE TABLE IF NOT EXISTS checkins (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    date TEXT NOT NULL,
    subject TEXT NOT NULL,
    content TEXT DEFAULT '',
    images TEXT DEFAULT '[]',
    files TEXT DEFAULT '[]',
    duration INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- 配置表（key-value 存储全局配置）
  CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  -- 提醒表
  CREATE TABLE IF NOT EXISTS reminders (
    id TEXT PRIMARY KEY,
    from_user_id TEXT NOT NULL,
    to_user_id TEXT NOT NULL,
    read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- 背景图存储（base64 存本地）
  CREATE TABLE IF NOT EXISTS backgrounds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    data TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- 加油/鼓励表
  CREATE TABLE IF NOT EXISTS cheers (
    id TEXT PRIMARY KEY,
    from_user_id TEXT NOT NULL,
    to_user_id TEXT NOT NULL,
    message TEXT DEFAULT '加油！',
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- 通知聚合表（统一管理 reminders + cheers + invites + auto_reminder）
  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT DEFAULT '',
    ref_id TEXT,
    read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// 默认配置初始化
const defaultConfig = {
  backgroundType: 'default',
  customBackgroundUrl: null,
  examDate: '2026-12-26'
};

const insertConfig = db.prepare('INSERT OR IGNORE INTO config (key, value) VALUES (?, ?)');
for (const [key, value] of Object.entries(defaultConfig)) {
  insertConfig.run(key, String(value ?? ''));
}

const isCloud = !!process.env.RAILWAY_ENVIRONMENT;
console.log(`数据库已连接: ${DB_PATH} ${isCloud ? '(Railway 云端)' : '(本地)'}`);

module.exports = db;
