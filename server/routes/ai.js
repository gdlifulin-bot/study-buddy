/**
 * AI 计划生成 API
 * 调用 DeepSeek API，根据用户输入生成每日学习计划
 *
 * 【扩展点】切换 AI 服务商：修改 BASE_URL / MODEL / 请求头即可
 */

const express = require('express');
const router = express.Router();
const https = require('https');
const path = require('path');

// 加载 .env
try { require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') }); } catch {}

const BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1';
const API_KEY = process.env.DEEPSEEK_API_KEY || '';
const MODEL = process.env.AI_MODEL || 'deepseek-chat';

// 科目中文名映射
const SUBJECT_NAMES = {
  math: '数学',
  english: '英语',
  professional: '专业课',
  politics: '政治'
};

/**
 * 构建 AI Prompt
 */
function buildPrompt({ startDate, endDate, timeSlots, goal, subjects }) {
  const subjectLabels = subjects.map(s => SUBJECT_NAMES[s] || s).join('、');
  const slotsText = timeSlots.filter(Boolean).map((s, i) => `${i + 1}. ${s}`).join('\n');

  return {
    system: `你是一位专业的考研学习规划师。你需要根据用户提供的信息，生成一份详细的每日学习计划。

要求：
1. 严格按照用户指定的日期范围和每日空闲时间段来安排
2. 每天的任务数量应等于空闲时间段的数量（每个时段一个科目任务）
3. 任务要具体、可执行，明确写出学习内容
4. 科目分布要合理，重点科目适当倾斜
5. 输出格式必须是严格的 JSON 数组，每个元素格式为：
   {"date": "YYYY-MM-DD", "tasks": [{"title": "具体任务内容", "subject": "math|english|professional|politics", "time": "HH:mm-HH:mm"}]}
6. 不要输出任何 JSON 以外的文字，不要用 markdown 代码块包裹`,

    user: `请根据以下信息生成学习计划：

学习时期：${startDate} 至 ${endDate}
每日空闲时间段：
${slotsText}

学习目标：${goal}
重点科目：${subjectLabels}

请生成每一天的详细任务计划。`
  };
}

/**
 * 解析 AI 返回的 JSON
 */
function parseAIResponse(text) {
  // 清理可能的 markdown 代码块包裹
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/```json\s*/i, '').replace(/```\s*/g, '');
  }
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // 尝试提取 JSON 数组
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error('AI 返回格式解析失败');
  }
}

/**
 * 调用 DeepSeek API（OpenAI 兼容接口）
 */
function callDeepSeek(payload) {
  const url = new URL(BASE_URL.replace(/\/?$/, '/') + 'chat/completions');
  const body = JSON.stringify(payload);

  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode >= 400) {
          return reject(new Error(`DeepSeek API ${res.statusCode}: ${data.slice(0, 300)}`));
        }
        try {
          const json = JSON.parse(data);
          resolve(json.choices?.[0]?.message?.content || data);
        } catch {
          resolve(data);
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// POST /api/ai/generate-plan
router.post('/generate-plan', async (req, res) => {
  if (!API_KEY) {
    return res.status(500).json({ error: '未配置 DeepSeek API Key，请在 server/.env 中设置' });
  }

  const { startDate, endDate, timeSlots, goal, subjects } = req.body;
  if (!startDate || !endDate || !goal) {
    return res.status(400).json({ error: '缺少必填参数：startDate, endDate, goal' });
  }

  try {
    const { system, user } = buildPrompt({ startDate, endDate, timeSlots, goal, subjects });

    const aiResult = await callDeepSeek({
      model: MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      temperature: 0.7,
      max_tokens: 4096
    });

    const parsed = parseAIResponse(aiResult);
    res.json({ plan: parsed });
  } catch (err) {
    console.error('AI 生成失败:', err.message);
    res.status(500).json({ error: err.message || 'AI 生成失败，请稍后重试' });
  }
});

// 【新增】POST /api/ai/report-suggestion — 根据周报/月报数据生成学习建议
router.post('/report-suggestion', async (req, res) => {
  if (!API_KEY) {
    return res.status(500).json({ error: '未配置 DeepSeek API Key' });
  }

  const { stats } = req.body;
  if (!stats) {
    return res.status(400).json({ error: '缺少统计数据' });
  }

  try {
    const systemPrompt = `你是一位专业的考研学习规划师。根据用户本周/本月的学习数据，给出简洁的学习调整建议。
要求：
1. 建议围绕：计划优化、学习时长分配、时间安排调整三个方面
2. 语言简洁，每条建议不超过80字，共3-5条
3. 用中文段落输出，每条建议一行，不要编号
4. 不要输出任何其他内容`;

    const userPrompt = `以下是我的学习数据：
- 周期：${stats.period}
- 计划总完成率：${stats.completionRate}%
- 累计学习时长：${stats.totalDuration}分钟
- 各科时长：${JSON.stringify(stats.subjectDurations)}
- 未完成任务数：${stats.incompleteCount}个

请给出下阶段学习调整建议。`;

    const aiResult = await callDeepSeek({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 1024
    });

    res.json({ suggestion: aiResult });
  } catch (err) {
    console.error('AI 建议生成失败:', err.message);
    res.status(500).json({ error: err.message || '生成失败' });
  }
});

// 【新增】POST /api/ai/parse-plan — AI 智能解析文件内容为结构化任务
router.post('/parse-plan', async (req, res) => {
  if (!API_KEY) {
    return res.status(500).json({ error: '未配置 DeepSeek API Key' });
  }

  const { text } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: '缺少待解析文本' });
  }

  try {
    const systemPrompt = `你是一个专业的数据解析助手。用户会给你从 PDF/Word/Excel 文件中提取的原始文本，里面包含一份可能是多日的学习计划表。

你需要：
1. 忽略文件中的页眉页脚、元数据、空白行等无关内容
2. 识别出所有学习任务条目，每个任务包含：任务所属日期、任务名称、所属科目、时间段（如有）
3. 日期识别规则（非常重要）：
   - 如果文中出现"X月X日"、"X月X号"、"YYYY-MM-DD"、"MM/DD"等日期标记，该日期下的所有任务都归属该日期
   - 如果某个任务前面没有新日期标记，则沿用最近一次出现的日期
   - 如果全文没有任何日期标记，默认使用今天日期
   - 日期统一输出为 "YYYY-MM-DD" 格式（推断年份，默认为当前年份）
4. 科目判断规则：
   - 数学相关关键词（数学/高数/线代/概率/微积分）→ "math"
   - 英语相关关键词（英语/单词/阅读/作文/翻译/完形/语法）→ "english"
   - 专业课相关关键词（专业/计算机/408/数据结构/操作系统/组成/网络）→ "professional"
   - 政治相关关键词（政治/马原/毛概/思修/史纲/时政）→ "politics"
   - 无法判断 → "other"
5. 时间格式统一为 "HH:mm-HH:mm"

输出格式为严格的 JSON 数组（不要 markdown 代码块包裹），每个任务必须包含 date 字段：
[{"date": "2026-06-10", "title": "任务名称", "subject": "math", "time": "08:00-10:00"}, ...]`;

    const aiResult = await callDeepSeek({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `请解析以下文件中的学习计划：\n\n${text.slice(0, 8000)}` }
      ],
      temperature: 0.3,
      max_tokens: 4096
    });

    // 解析 AI 返回
    let cleaned = aiResult.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/```json\s*/i, '').replace(/```\s*/g, '');
    }
    const tasks = JSON.parse(cleaned.match(/\[[\s\S]*\]/)?.[0] || cleaned);
    res.json({ tasks });
  } catch (err) {
    console.error('AI 解析失败:', err.message);
    res.status(500).json({ error: 'AI 解析失败: ' + err.message });
  }
});

module.exports = router;
