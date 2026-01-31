// frontend/src/components/GroupList.jsx
import axios from "axios";
import { Link } from "react-router-dom";
import {
  MessageCircle,
  Users,
  User,
  Hash,
  BellRing,
  Trash2,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function GroupList({ groups, onDelete, currentUserId }) {
  // ===============================
  // 表示名の決定
  // バックエンドから渡される displayName を優先し、なければ group.name を使う
  // ===============================
  const getDisplayName = (group) =>
    group.displayName || group.name || "名称未設定";

  // ===============================
  // アバターの生成
  // ===============================
  const getAvatar = (group) => {
    const displayName = getDisplayName(group);

    if (group.type === "private") {
      const initial = displayName?.charAt(0)?.toUpperCase() || "?";
      return (
        <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md ring-4 ring-white">
          {initial}
        </div>
      );
    }

    return (
      <div className="w-11 h-11 bg-gradient-to-br from-indigo-500 to-pink-500 rounded-full flex items-center justify-center text-white shadow-md ring-4 ring-white">
        <Users size={22} />
      </div>
    );
  };

  // ===============================
  // 削除処理
  // ===============================
  const handleDelete = async (id, createdBy) => {
    if (createdBy !== currentUserId) {
      alert("作成者のみ削除可能です");
      return;
    }
    if (!window.confirm("本当にこのチャットを削除しますか？")) return;

    try {
      await axios.delete(`${API_URL}/groups/${id}`, {
        data: { userId: currentUserId },
      });
      onDelete(id);
    } catch (err) {
      console.error(err);
      alert("削除に失敗しました");
    }
  };

  return (
    <div className="h-full bg-white overflow-y-auto">
      {/* ヘッダー */}
      <div className="p-6 sticky top-0 bg-white/90 backdrop-blur-sm z-10 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
          <MessageCircle className="w-8 h-8 text-purple-600" />
          あなたのチャット
        </h2>
      </div>

      <ul className="p-4 space-y-3">
        {groups.length === 0 ? (
          <li className="text-center py-16 text-gray-500">
            <BellRing className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">まだチャットがありません</p>
            <p className="text-sm mt-2">新しいグループを作成してみましょう！</p>
          </li>
        ) : (
          groups.map((group) => (
            <li
              key={group._id}
              className="relative flex items-center justify-between p-4 rounded-2xl bg-white hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 border border-gray-200 hover:border-purple-400 hover:shadow-lg transition-all duration-300"
            >
              <Link
                to={`/groups/${group._id}`}
                className="flex items-center gap-4 flex-1 min-w-0"
              >
                <div className="flex-shrink-0">{getAvatar(group)}</div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {group.type === "private" ? (
                      <User size={18} className="text-green-600" />
                    ) : (
                      <Hash size={18} className="text-purple-600" />
                    )}
                    <span className="font-bold text-gray-800 truncate">
                      {getDisplayName(group)}
                    </span>
                  </div>
                  {/* 未読がある場合のバッジ表示（オプション） */}
                  {group.unreadCount > 0 && (
                    <span className="mt-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
                      {group.unreadCount}
                    </span>
                  )}
                </div>
              </Link>

              {/* ⭐ 削除ボタンを追加（作成者本人の場合のみ表示） */}
              {group.createdBy === currentUserId && (
                <button
                  onClick={() => handleDelete(group._id, group.createdBy)}
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                  title="チャットを削除"
                >
                  <Trash2 size={20} />
                </button>
              )}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
