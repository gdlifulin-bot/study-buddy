/**
 * 【新增】搭子搜索 + 组队邀请模块
 * 嵌入设置页面，极简设计，与全站风格统一
 *
 * 修改入口：SettingsPage.jsx 中作为 Section 嵌入
 */

import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

export default function PartnerMatch() {
  const { sessionUser, partner, refreshPartner } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [inviting, setInviting] = useState(null);
  const [message, setMessage] = useState('');

  // 搜索用户
  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setResults([]);
    try {
      const data = await api.get(`/auth/search?q=${encodeURIComponent(query.trim())}&exclude=${sessionUser.username}`);
      setResults(data || []);
    } catch { setResults([]); }
    finally { setSearching(false); }
  };

  // 发送邀请
  const handleInvite = async (toUsername) => {
    setInviting(toUsername);
    setMessage('');
    try {
      await api.post('/auth/invite', { fromUsername: sessionUser.username, toUsername });
      setMessage(`已向 ${toUsername} 发送搭子邀请`);
    } catch (err) {
      setMessage(err.message || '发送失败');
    } finally {
      setInviting(null);
    }
  };

  // 已组队状态
  if (partner) {
    return (
      <div>
        <p className="text-sm text-[#1d1d1f]">
          已和 <span className="font-medium">{partner.username}</span> 成为考研搭子
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 搜索框 */}
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="输入对方的账号名搜索"
          className="flex-1 rounded-apple border border-[#e5e5e7] bg-[#f5f5f7] px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#1d1d1f] placeholder:text-[#86868b]"
        />
        <button
          onClick={handleSearch}
          disabled={searching || !query.trim()}
          className="rounded-apple bg-[#1d1d1f] px-4 py-2.5 text-xs text-white transition hover:bg-black disabled:opacity-30"
        >
          {searching ? '搜索中' : '搜索'}
        </button>
      </div>

      {/* 搜索结果 */}
      {results.length > 0 && (
        <div className="space-y-2">
          {results.map(user => (
            <div key={user.id} className="flex items-center justify-between rounded-apple bg-[#f5f5f7] px-4 py-2.5">
              <span className="text-sm text-[#1d1d1f]">{user.username}</span>
              <button
                onClick={() => handleInvite(user.username)}
                disabled={inviting === user.username}
                className="text-xs text-[#0071e3] hover:text-blue-600 disabled:opacity-40"
              >
                {inviting === user.username ? '发送中' : '发起组队邀请'}
              </button>
            </div>
          ))}
        </div>
      )}

      {results.length === 0 && query && !searching && (
        <p className="text-xs text-[#86868b]">未找到匹配的用户</p>
      )}

      {message && (
        <p className="text-xs text-[#34c759]">{message}</p>
      )}
    </div>
  );
}
