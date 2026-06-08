/**
 * 全局业务常量
 * 【可配置】新增科目、修改考试日期等在此调整
 */

// 考研科目 — 打卡/计划的分类维度
export const SUBJECTS = [
  { key: 'math', label: '数学', color: '#0071e3' },
  { key: 'english', label: '英语', color: '#ff6b35' },
  { key: 'professional', label: '专业课', color: '#34c759' },
  { key: 'politics', label: '政治', color: '#af52de' }
];

// 考研日期 — 首页倒计时使用（设置页可修改，后端 config 表优先）
export const EXAM_DATE = '2026-12-26';

// 【扩展点】后续新增科目只需在 SUBJECTS 中添加，全站自动适配
