# 考研搭子 — 双人学习监督网站

极简双人考研学习监督工具，支持学习计划管理与双人打卡监督。

## 快速启动

```bash
# 1. 安装依赖（仅首次）
npm run install:all

# 2. 启动前后端（同时启动）
npm run dev
```

启动后访问：
- 本机：`http://localhost:5173`
- 局域网其他设备：`http://<你的IP>:5173`（启动时控制台会显示 IP）

后端 API 运行在 `http://localhost:3001`，Vite 自动代理 API 请求到后端。

## 功能概览

| 功能 | 说明 |
|------|------|
| 首页 | 全屏极简背景 + 浮动功能入口 |
| 学习计划表 | 月度视图、任务管理、多方式导入（图片OCR/文字/文件）、AI 生成预留 |
| 双人打卡 | 数学/英语/专业课/政治四科目、图片文件上传、互相查看 |
| 设置 | 用户切换、背景更换 |

## 技术栈

- **前端**：React 18 + Vite + Tailwind CSS + React Router v6
- **后端**：Express.js + JSON 文件存储
- **OCR**：Tesseract.js（浏览器端）

## 项目结构

```
study-buddy/
├── client/          # 前端 SPA
│   └── src/
│       ├── config/       # 主题 & 常量配置
│       ├── components/   # 共享 UI 组件
│       ├── contexts/     # React Context 状态管理
│       ├── services/     # API 通信层
│       ├── features/     # 功能模块
│       │   ├── home/     # 首页
│       │   ├── planner/  # 学习计划
│       │   ├── checkin/  # 打卡
│       │   └── settings/ # 设置
│       └── hooks/        # 自定义 Hooks
├── server/          # 后端 API
│   ├── routes/      # API 路由
│   └── data/        # JSON 数据存储
└── 修改指南.md       # 代码修改指南
```

## 局域网访问

1. 确保两台设备在同一局域网
2. 启动服务后，控制台会显示局域网 IP 地址
3. 另一设备通过 `http://<IP>:5173` 访问
4. 两人通过首页右上角或设置页切换 user1/user2 身份
