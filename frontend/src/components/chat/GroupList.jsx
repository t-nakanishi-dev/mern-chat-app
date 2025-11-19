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

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function GroupList({ groups, onDelete, currentUserId }) {
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

  const getDisplayName = (group) => {
    if (group.type === "private" && group.members) {
      const otherUser = group.members.find((m) => m._id !== currentUserId);
      return otherUser?.name || "不明なユーザー";
    }
    return group.name || "無名グループ";
  };

  const getAvatar = (group) => {
    if (group.type === "private" && group.members) {
      const otherUser = group.members.find((m) => m._id !== currentUserId);
      const initial = otherUser?.name?.charAt(0).toUpperCase() || "?";
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

  return (
    <div className="h-full bg-white overflow-y-auto">
      {/* ← ここだけ変更！ */}
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
            <Link
              key={group._id}
              to={`/groups/${group._id}`}
              className="block group transition-all duration-300"
            >
              <li className="relative flex items-center justify-between p-4 rounded-2xl bg-white hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 border border-gray-200 hover:border-purple-400 hover:shadow-lg transition-all duration-300">
                {/* 左側：アバター + 名前 + 最後のメッセージ */}
                <div className="flex items-center gap-4 flex-1 min-w-0">
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
                </div>

                {/* 右側：未読数 + 削除ボタン */}
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
            </Link>
          ))
        )}
      </ul>
    </div>
  );
}
