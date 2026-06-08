/**
 * SQLite 数据库模块 (sql.js — 纯 JS，零编译依赖)
 * 本地：D:/study-buddy data/studybuddy.db
 * 云端：Railway 持久化卷 /data/studybuddy.db
 */

const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DB_DIR = process.env.DB_DIR || 'D:/study-buddy data';
const DB_PATH = path.join(DB_DIR, 'studybuddy.db');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

let _db = null;      // sql.js Database 实例
let _ready = false;  // 是否就绪
let _initError = null;

// 异步初始化（模块加载时启动）
const _initPromise = (async () => {
  try {
    const SQL = await initSqlJs();
    if (fs.existsSync(DB_PATH)) {
      const buffer = fs.readFileSync(DB_PATH);
      _db = new SQL.Database(buffer);
    } else {
      _db = new SQL.Database();
    }
    // 建表 + 默认配置
    _db.run('PRAGMA journal_mode = WAL');
    _db.run('PRAGMA foreign_keys = ON');
    _createTables(_db);
    _saveToDisk();
    _ready = true;
    const isCloud = !!process.env.RAILWAY_ENVIRONMENT;
    console.log(`数据库已连接: ${DB_PATH} ${isCloud ? '(Railway 云端)' : '(本地)'}`);
  } catch (e) {
    _initError = e;
    console.error('数据库初始化失败:', e.message);
    throw e;
  }
})();

// 持久化到磁盘
function _saveToDisk() {
  if (!_db) return;
  try {
    const data = _db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  } catch (e) {
    console.error('数据库写入失败:', e.message);
  }
}

// 建表语句
function _createTables(database) {
  database.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  database.run(`
    CREATE TABLE IF NOT EXISTS pairs (
      id TEXT PRIMARY KEY,
      user1_username TEXT NOT NULL,
      user2_username TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  database.run(`
    CREATE TABLE IF NOT EXISTS invites (
      id TEXT PRIMARY KEY,
      from_username TEXT NOT NULL,
      to_username TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  database.run(`
    CREATE TABLE IF NOT EXISTS plans (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      days TEXT DEFAULT '{}',
      UNIQUE(user_id, year, month)
    )
  `);
  database.run(`
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
    )
  `);
  database.run(`
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);
  database.run(`
    CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY,
      from_user_id TEXT NOT NULL,
      to_user_id TEXT NOT NULL,
      read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  database.run(`
    CREATE TABLE IF NOT EXISTS backgrounds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      data TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  database.run(`
    CREATE TABLE IF NOT EXISTS cheers (
      id TEXT PRIMARY KEY,
      from_user_id TEXT NOT NULL,
      to_user_id TEXT NOT NULL,
      message TEXT DEFAULT '加油！',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  database.run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT DEFAULT '',
      ref_id TEXT,
      read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // 默认配置
  const defaults = [
    ['backgroundType', 'default'],
    ['customBackgroundUrl', 'null'],
    ['examDate', '2026-12-26']
  ];
  for (const [key, value] of defaults) {
    database.run(
      'INSERT OR IGNORE INTO config (key, value) VALUES (?, ?)',
      [key, String(value ?? '')]
    );
  }
}

// ==================== 兼容 better-sqlite3 API ====================

/**
 * 等待数据库就绪
 */
function ensureReady() {
  if (!_ready) throw new Error('数据库尚未初始化完成，请等待服务启动');
}

/**
 * 执行 SQL 并返回所有行
 * db.prepare(sql).all(...params)
 */
function _prepareAll(sql) {
  ensureReady();
  return function (...params) {
    try {
      const stmt = _db.prepare(sql);
      if (params.length > 0) stmt.bind(params);
      const rows = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      stmt.free();
      return rows;
    } catch (e) {
      console.error('SQL 查询错误:', sql, e.message);
      throw e;
    }
  };
}

/**
 * 执行 SQL 并返回第一行
 * db.prepare(sql).get(...params)
 */
function _prepareGet(sql) {
  ensureReady();
  return function (...params) {
    try {
      const stmt = _db.prepare(sql);
      if (params.length > 0) stmt.bind(params);
      let row = null;
      if (stmt.step()) {
        row = stmt.getAsObject();
      }
      stmt.free();
      return row;
    } catch (e) {
      console.error('SQL 查询错误:', sql, e.message);
      throw e;
    }
  };
}

/**
 * 执行 SQL（INSERT/UPDATE/DELETE）
 * db.prepare(sql).run(...params)
 */
function _prepareRun(sql) {
  ensureReady();
  return function (...params) {
    try {
      _db.run(sql, params);
      _saveToDisk(); // 写入后持久化
      return {
        changes: _db.getRowsModified()
      };
    } catch (e) {
      console.error('SQL 执行错误:', sql, e.message);
      throw e;
    }
  };
}

/**
 * 执行多语句 SQL
 * db.exec(sql)
 */
function _exec(sql) {
  ensureReady();
  try {
    _db.run(sql);
    _saveToDisk();
  } catch (e) {
    console.error('SQL exec 错误:', e.message);
    throw e;
  }
}

// ==================== 导出兼容对象 ====================

// 模拟 better-sqlite3 的 API
const db = {
  prepare: function (sql) {
    return {
      all: _prepareAll(sql),
      get: _prepareGet(sql),
      run: _prepareRun(sql)
    };
  },
  exec: _exec,
  pragma: function (pragmaStr) {
    ensureReady();
    try {
      _db.run(`PRAGMA ${pragmaStr}`);
    } catch (e) {
      console.error('PRAGMA 错误:', e.message);
    }
  },
  // 暴露就绪状态
  get ready() { return _ready; },
  get initPromise() { return _initPromise; }
};

module.exports = db;
