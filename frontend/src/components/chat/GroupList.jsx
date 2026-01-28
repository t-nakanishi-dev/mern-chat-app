// frontend/src/components/GroupList.jsx
import axios from "axios";
import { Link } from "react-router-dom";
import {
  Trash2,
  MessageCircle,
  Users,
  User,
  Hash,
  BellRing,
} from "lucide-react";
import { useState, useEffect } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function GroupList({ groups, onDelete, currentUserId }) {
  const [displayNames, setDisplayNames] = useState({});

  // グループごとに表示名を非同期で取得
  useEffect(() => {
    const fetchDisplayNames = async () => {
      const newNames = { ...displayNames };

      for (const group of groups) {
        if (newNames[group._id]) continue; // 既に取得済みならスキップ

        if (group.type !== "private") {
          newNames[group._id] = group.name || "グループチャット";
          continue;
        }

        try {
          const { data } = await axios.get(`${API_URL}/groups/${group._id}`);
          const other = data.members?.find(
            (m) => m.userId._id !== currentUserId,
          );
          newNames[group._id] = other?.userId?.name || "個人チャット";
        } catch (err) {
          console.error("表示名取得エラー:", group._id, err);
          newNames[group._id] = group.name || "個人チャット";
        }
      }

      setDisplayNames(newNames);
    };

    if (groups?.length > 0) {
      fetchDisplayNames();
    }
  }, [groups, currentUserId]);

  const getDisplayName = (group) => {
    return displayNames[group._id] || group.name || "読み込み中...";
  };

  const getAvatar = (group) => {
    // アバターも相手の名前で初期文字を表示したい場合
    // 表示名が決まっているならそれを使う
    const displayName = getDisplayName(group);
    if (group.type === "private" && displayName !== "読み込み中...") {
      const initial = displayName?.charAt(0)?.toUpperCase() || "?";
      return (
        <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md ring-4 ring-white">
          {initial}
        </div>
      );
    }
    return (
      <div className="w-11 h-11 bg-gradient-to-br from-indigo-500 to-pink-500 rounded-full flex items-center justify-center text-white shadow-md ring-4 ring-white">
        {group.type === "private" ? <User size={22} /> : <Users size={22} />}
      </div>
    );
  };

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
                  {group.lastMessage && (
                    <p className="text-sm text-gray-500 truncate mt-1">
                      {group.lastMessage}
                    </p>
                  )}
                </div>
              </Link>

              <div className="flex items-center gap-3 ml-3">
                {group.unreadCount > 0 && (
                  <span className="bg-gradient-to-r from-red-500 to-pink-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg animate-pulse ring-4 ring-white">
                    {group.unreadCount >= 100 ? "99+" : group.unreadCount}
                  </span>
                )}

                {group.createdBy === currentUserId && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDelete(group._id, group.createdBy);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-all duration-300 p-2.5 hover:bg-red-100 rounded-xl"
                    title="削除"
                  >
                    <Trash2
                      size={20}
                      className="text-red-500 hover:text-red-700"
                    />
                  </button>
                )}
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
