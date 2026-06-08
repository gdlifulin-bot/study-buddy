/**
 * 搭子选择器
 * 【改造】从 UserContext 读取动态 partner，替代旧的 user1/user2 硬编码
 * 未组队时隐藏搭子按钮
 */

import { useUser } from '../../contexts/UserContext';

export default function PartnerSelector({ viewUser, onChange }) {
  const { currentUser, partner } = useUser();
  const isSelf = viewUser === currentUser.id;

  // 未组队时只显示自己
  if (!partner) {
    return (
      <div className="flex items-center rounded-apple-full bg-apple-light p-0.5 text-xs">
        <button className="rounded-full px-3 py-1 bg-white text-apple-black shadow-sm">
          {currentUser.name}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center rounded-apple-full bg-apple-light p-0.5 text-xs">
      <button
        onClick={() => onChange(currentUser.id)}
        className={`rounded-full px-3 py-1 transition ${
          isSelf ? 'bg-white text-apple-black shadow-sm' : 'text-apple-gray'
        }`}
      >
        {currentUser.name}
      </button>
      <button
        onClick={() => onChange(partner.id)}
        className={`rounded-full px-3 py-1 transition ${
          !isSelf ? 'bg-white text-apple-black shadow-sm' : 'text-apple-gray'
        }`}
      >
        {partner.name}
      </button>
    </div>
  );
}
