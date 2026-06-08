/**
 * 计划解析工具
 * 将文本/CSV 解析为 Task 对象数组
 */

import { SUBJECTS } from '../../config/constants';

// 科目关键词映射 — 用于自动识别
const SUBJECT_KEYWORDS = {
  math: ['数学', '高数', '线代', '线性代数', '概率', '微积分'],
  english: ['英语', '单词', '阅读', '作文', '翻译', '完形', '长难句'],
  professional: ['专业', '专业课', '计算机', '408', '数据结构', '操作系统'],
  politics: ['政治', '马原', '毛概', '思修', '史纲', '时政'],
};

// 时间模式匹配: "08:00-10:00" 或 "8:00-10:00" 或中文连接
const TIME_PATTERN = /(\d{1,2}:\d{2})\s*[-~到至]\s*(\d{1,2}:\d{2})/;

// 【新增】日期模式匹配 — 用于识别文本中的日期标记行
// 支持: "6月10日"、"6月10号"、"2026-06-10"、"2026/06/10"、"6/10"、"6.10"
const DATE_LINE_PATTERN = /^[\s]*(?:(\d{4})[-\/])?(\d{1,2})[月\-\/\.](\d{1,2})[日号]?[\s]*$/;
// 仅月日（无年份）："6月10日"、"6/10"
const SHORT_DATE_PATTERN = /^[\s]*(\d{1,2})\s*[月\/\-\.]\s*(\d{1,2})\s*[日号]?\s*$/;

let taskIdCounter = 0;

function generateId() {
  taskIdCounter += 1;
  return `task_${Date.now()}_${taskIdCounter}`;
}

/**
 * 根据文本识别科目
 * @param {string} text - 待识别文本
 * @returns {string} 'math'|'english'|'professional'|'politics'|'other'
 */
function detectSubject(text) {
  if (!text) return 'other';

  for (const [key, keywords] of Object.entries(SUBJECT_KEYWORDS)) {
    for (const kw of keywords) {
      if (text.includes(kw)) {
        return key;
      }
    }
  }

  return 'other';
}

/**
 * 从文本中提取时间范围
 * @param {string} text - 待解析文本
 * @returns {{ time: string, remaining: string } | null}
 */
function extractTime(text) {
  const match = text.match(TIME_PATTERN);
  if (match) {
    const time = `${match[1]}-${match[2]}`;
    const remaining = text.replace(TIME_PATTERN, '').trim();
    return { time, remaining };
  }
  return null;
}

/**
 * 【新增】尝试将一行文本解析为日期标记
 * @returns {string|null} "YYYY-MM-DD" 或 null
 */
function tryParseDate(line) {
  const trimmed = line.trim();
  if (!trimmed) return null;
  // 排除明显是任务的行（包含科目关键词或时间模式）
  if (TIME_PATTERN.test(trimmed)) return null;
  if (detectSubject(trimmed) !== 'other') return null;

  const now = new Date();
  // 完整日期: 2026-06-10 或 2026/06/10
  const fullMatch = trimmed.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$|^(\d{4})年(\d{1,2})月(\d{1,2})日?$/);
  if (fullMatch) {
    const [, y1, m1, d1, y2, m2, d2] = fullMatch;
    const y = y1 || y2, m = m1 || m2, d = d1 || d2;
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  // 短日期: 6月10日 / 6/10 / 6.10
  const shortMatch = trimmed.match(SHORT_DATE_PATTERN);
  if (shortMatch) {
    const m = shortMatch[1], d = shortMatch[2];
    return `${now.getFullYear()}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  return null;
}

/**
 * 解析单行文本为 Task 对象
 * @param {string} line - 单行文本
 * @param {string} currentDate - 当前上下文日期（由日期标记行设置）
 * @returns {{ id: string, title: string, subject: string, completed: boolean, time?: string, date?: string }}
 */
function parseLine(line, currentDate) {
  const trimmed = line.trim();
  if (!trimmed) return null;

  let title = trimmed;
  let time = undefined;

  // 尝试提取时间
  const timeResult = extractTime(trimmed);
  if (timeResult) {
    time = timeResult.time;
    title = timeResult.remaining || trimmed;
  }

  // 如果提取时间后 title 为空，使用原始文本
  if (!title || title.length === 0) {
    title = trimmed;
  }

  // 检测科目
  const subject = detectSubject(title);

  return {
    id: generateId(),
    title,
    subject,
    completed: false,
    ...(time ? { time } : {}),
    ...(currentDate ? { date: currentDate } : {}),
  };
}

/**
 * 解析多行文本为 Task 数组
 * @param {string} text - 多行文本，每行一个任务
 * @returns {Array<{ id: string, title: string, subject: string, completed: boolean, time?: string }>}
 */
export function parseTextPlan(text) {
  if (!text || typeof text !== 'string') return [];

  const lines = text.split('\n');
  const tasks = [];
  let currentDate = null;  // 【新增】跟踪当前日期上下文

  for (const line of lines) {
    // 【新增】先检查是否为日期标记行
    const parsedDate = tryParseDate(line);
    if (parsedDate) {
      currentDate = parsedDate;
      continue;  // 日期行本身不是任务
    }

    const task = parseLine(line, currentDate);
    if (task) {
      tasks.push(task);
    }
  }

  return tasks;
}

/**
 * 解析 CSV 文本为 Task 数组
 * 支持格式:
 *   - time,subject,title（三列）
 *   - time,title（两列，subject 自动识别）
 *   - subject,title（两列，无时间）
 *   - title（单列）
 * @param {string} csvText - CSV 文本
 * @returns {Array<{ id: string, title: string, subject: string, completed: boolean, time?: string }>}
 */
export function parseCSVPlan(csvText) {
  if (!csvText || typeof csvText !== 'string') return [];

  const lines = csvText.split('\n').filter((l) => l.trim());
  if (lines.length === 0) return [];

  // 尝试检测是否有表头（首行不含时间模式且含常见表头关键词）
  const headerLine = lines[0].toLowerCase();
  const hasHeader =
    /time|时间|subject|科目|title|任务|内容|topic/.test(headerLine) &&
    !TIME_PATTERN.test(headerLine);

  const dataLines = hasHeader ? lines.slice(1) : lines;
  const tasks = [];

  for (const line of dataLines) {
    const columns = parseCSVLine(line);
    if (columns.length === 0) continue;

    let time = undefined;
    let subject = 'other';
    let title = '';

    if (columns.length >= 3) {
      // time, subject, title 或 time, title, subject
      const first = columns[0].trim();
      const second = columns[1].trim();
      const third = columns[2].trim();

      const firstIsTime = TIME_PATTERN.test(first) || /^\d{1,2}:\d{2}/.test(first);
      const secondIsTime = TIME_PATTERN.test(second) || /^\d{1,2}:\d{2}/.test(second);

      if (firstIsTime) {
        time = normalizeTime(first);
        // 判断第二列是科目还是标题
        const detectedSubject = detectSubject(second);
        if (detectedSubject !== 'other') {
          subject = detectedSubject;
          title = third;
        } else {
          subject = detectSubject(third);
          title = second + (third ? ' ' + third : '');
        }
      } else if (secondIsTime) {
        subject = detectSubject(first);
        time = normalizeTime(second);
        title = third;
      } else {
        // 没有时间列
        const detectedSubject = detectSubject(first);
        if (detectedSubject !== 'other') {
          subject = detectedSubject;
          title = second + (third ? ' ' + third : '');
        } else {
          subject = detectSubject(second);
          title = first + ' ' + second + (third ? ' ' + third : '');
        }
      }
    } else if (columns.length === 2) {
      const first = columns[0].trim();
      const second = columns[1].trim();

      const firstIsTime = TIME_PATTERN.test(first) || /^\d{1,2}:\d{2}/.test(first);

      if (firstIsTime) {
        time = normalizeTime(first);
        title = second;
        subject = detectSubject(second);
      } else {
        const detectedSubject = detectSubject(first);
        if (detectedSubject !== 'other') {
          subject = detectedSubject;
          title = second;
        } else {
          subject = detectSubject(second);
          title = first + ' ' + second;
        }
      }
    } else {
      // 单列
      title = columns[0].trim();
      subject = detectSubject(title);
    }

    if (title) {
      tasks.push({
        id: generateId(),
        title: title.trim(),
        subject,
        completed: false,
        ...(time ? { time } : {}),
      });
    }
  }

  return tasks;
}

/**
 * 解析 CSV 单行（处理引号包裹的字段）
 * @param {string} line - CSV 行
 * @returns {string[]}
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((char === ',' || char === '\t') && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result.filter((c) => c.length > 0 || result.length === 1);
}

/**
 * 标准化时间格式为 HH:mm-HH:mm
 * @param {string} timeStr - 时间字符串
 * @returns {string | undefined}
 */
function normalizeTime(timeStr) {
  const cleaned = timeStr.replace(/\s/g, '').replace(/[-~到至]/g, '-');
  const match = cleaned.match(TIME_PATTERN);
  if (match) {
    const start = match[1].padStart(5, '0');
    const end = match[2].padStart(5, '0');
    return `${start}-${end}`;
  }

  // 可能是单个时间点
  const singleMatch = cleaned.match(/(\d{1,2}:\d{2})/);
  if (singleMatch) {
    return singleMatch[1];
  }

  return undefined;
}

// ==================== 【新增】PDF / Word / Excel 解析 ====================

/**
 * 解析 PDF 文件，提取文本并按行解析为任务
 * 使用 pdfjs-dist 提取文本内容，再逐行解析
 * @param {File|ArrayBuffer} file - PDF 文件或 ArrayBuffer
 * @returns {Promise<Array>} Task 数组
 */
export async function parsePDFPlan(file) {
  try {
    const pdfjsLib = await import('pdfjs-dist');
    // 设置 worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = '';

    const arrayBuffer = file instanceof File
      ? await file.arrayBuffer()
      : file;

    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map(item => item.str).join(' ');
      fullText += pageText + '\n';
    }

    return parseTextPlan(fullText);
  } catch (err) {
    console.error('PDF 解析失败:', err);
    throw new Error('PDF 文件解析失败，请确认文件未加密且包含可选中的文字');
  }
}

/**
 * 解析 Word (.docx) 文件，提取文本并按行解析为任务
 * 使用 mammoth 提取纯文本
 * @param {File|ArrayBuffer} file - DOCX 文件或 ArrayBuffer
 * @returns {Promise<Array>} Task 数组
 */
export async function parseDOCXPlan(file) {
  try {
    const mammoth = await import('mammoth');

    const arrayBuffer = file instanceof File
      ? await file.arrayBuffer()
      : file;

    const result = await mammoth.extractRawText({ arrayBuffer });
    return parseTextPlan(result.value);
  } catch (err) {
    console.error('Word 解析失败:', err);
    throw new Error('Word 文件解析失败');
  }
}

/**
 * 解析 Excel (.xlsx/.xls) 文件
 * 读取第一个工作表，每行作为一个任务
 * @param {File|ArrayBuffer} file - Excel 文件或 ArrayBuffer
 * @returns {Promise<Array>} Task 数组
 */
export async function parseXLSXPlan(file) {
  try {
    const XLSX = await import('xlsx');

    const arrayBuffer = file instanceof File
      ? await file.arrayBuffer()
      : file;

    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

    // 尝试识别表头行
    const tasks = [];
    let headerSkipped = false;

    for (const row of rows) {
      if (!row || row.every(cell => !cell)) continue; // 跳过空行

      // 将行转为 CSV 格式的字符串，复用 CSV 解析
      const csvLine = row.map(cell =>
        typeof cell === 'string' ? `"${cell.replace(/"/g, '""')}"` : String(cell ?? '')
      ).join(',');

      tasks.push(csvLine);
    }

    // 将所有行拼接后用 CSV 解析器处理
    const csvText = tasks.join('\n');
    return parseCSVPlan(csvText);
  } catch (err) {
    console.error('Excel 解析失败:', err);
    throw new Error('Excel 文件解析失败');
  }
}
