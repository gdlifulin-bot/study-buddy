/**
 * 设置页
 * 背景设置、用户信息、关于
 *
 * 【扩展点】新增设置项时在此页面添加 Section
 */

import { useState, useEffect } from 'react';
import { useAuth, clearAllCache } from '../../contexts/AuthContext';  // 【新增】认证
import { useUser } from '../../contexts/UserContext';
import { EXAM_DATE } from '../../config/constants';
import api from '../../services/api';
import BackgroundPicker from '../home/BackgroundPicker';
import PartnerMatch from './PartnerMatch';  // 【新增】搭子组队

export default function SettingsPage() {
  const { currentUser } = useUser();
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [examDate, setExamDate] = useState(EXAM_DATE);  // 【新增】考研日期状态
  const [examSaved, setExamSaved] = useState(false);

  // 【新增】加载当前考研日期
  useEffect(() => {
    api.get('/config').then(config => {
      if (config.examDate) setExamDate(config.examDate);
    }).catch(() => {});
  }, []);

  // 【新增】保存考研日期
  const handleExamDateChange = async (value) => {
    setExamDate(value);
    try {
      await api.put('/config', { examDate: value });
      setExamSaved(true);
      setTimeout(() => setExamSaved(false), 1500);
    } catch (e) { /* ignore */ }
  };

  return (
    <div className="mx-auto max-w-lg px-5 py-8">
      <h1 className="mb-8 text-xl font-medium text-apple-black">设置</h1>

      {/* 【改造】当前账户 + 登出 */}
      <Section title="当前账户">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1d1d1f] text-sm text-white">
              {currentUser.name?.[0]}
            </span>
            <div>
              <p className="text-sm font-medium text-apple-black">{currentUser.name}</p>
              <p className="text-xs text-apple-gray">{currentUser.id}</p>
            </div>
          </div>
          <LogoutButton />
        </div>
      </Section>

      {/* 【新增】搭子组队模块 */}
      <Section title="搭子组队">
        <PartnerMatch />
      </Section>

      {/* 背景设置 */}
      <Section title="首页背景">
        {showBgPicker ? (
          <BackgroundPicker onClose={() => setShowBgPicker(false)} />
        ) : (
          <button
            onClick={() => setShowBgPicker(true)}
            className="flex w-full items-center justify-between rounded-apple bg-apple-light px-4 py-3 text-sm text-apple-black hover:bg-gray-200"
          >
            <span>更换背景图片</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9,18 15,12 9,6" />
            </svg>
          </button>
        )}
      </Section>

      {/* 【新增】考研日期设置 */}
      <Section title="考研倒计时日期">
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={examDate}
            onChange={e => handleExamDateChange(e.target.value)}
            className="flex-1 rounded-apple border border-apple-border bg-apple-light px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-apple-black"
          />
          {examSaved && (
            <span className="text-xs text-[#34c759]">已保存</span>
          )}
        </div>
        <p className="mt-2 text-xs text-apple-gray">
          修改后首页倒计时将自动更新
        </p>
      </Section>

      {/* 【新增】一键清除本站缓存 */}
      <Section title="数据管理">
        <button
          onClick={() => { clearAllCache(); window.location.reload(); }}
          className="rounded-apple border border-red-200 px-4 py-2.5 text-xs text-red-500 hover:bg-red-50 transition"
        >
          清除本站全部缓存数据（登录态、旧凭证等）
        </button>
        <p className="mt-2 text-xs text-[#86868b]">
          遇到白屏/登录异常时使用，清除后需重新登录
        </p>
      </Section>

      {/* 关于 */}
      <Section title="关于">
        <div className="space-y-2 text-sm text-apple-gray">
          <p>考研搭子 v1.0</p>
          <p>双人学习监督 · 打卡互助</p>
          <p className="text-xs text-gray-400">为考研路上的你加油</p>
        </div>
      </Section>

      {/* 【扩展点】在此添加更多设置项 */}
    </div>
  );
}

/**
 * 设置分区组件
 */
/** 【新增】登出按钮 */
function LogoutButton() {
  const { logout } = useAuth();
  return (
    <button onClick={logout} className="text-xs text-[#86868b] hover:text-red-500">
      登出
    </button>
  );
}

function Section({ title, children }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-apple-gray">
        {title}
      </h2>
      <div className="rounded-apple-lg border border-apple-border p-4">
        {children}
      </div>
    </section>
  );
}
