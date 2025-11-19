// frontend/src/components/GroupForm.jsx
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { X, Loader2 } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function GroupForm({ onGroupCreated, currentUserId }) {
  const [name, setName] = useState("");
  const [input, setInput] = useState("");
  const [members, setMembers] = useState([]); // { uid, name }
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!input.trim()) return setSuggestions([]);

    const fetchUsers = async () => {
      try {
        const res = await axios.get(
          `${API_URL}/groups/search-users?q=${input}`
        );
        const filtered = res.data.filter((u) => u.uid !== currentUserId);
        setSuggestions(filtered);
      } catch {
        // エラーは無視（検索中はたまに失敗してもOK）
      }
    };

    const timeoutId = setTimeout(fetchUsers, 300);
    return () => clearTimeout(timeoutId);
  }, [input, currentUserId]);

  const handleAddMember = (user) => {
    if (!members.find((m) => m.uid === user.uid)) {
      setMembers([...members, { uid: user.uid, name: user.name }]);
    }
    setInput("");
    setSuggestions([]);
    inputRef.current?.focus();
  };

  const handleRemoveMember = (uid) => {
    setMembers(members.filter((m) => m.uid !== uid));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const memberUids = members.map((m) => m.uid);

    // 個人チャットの場合：自分＋相手の2人にする
    if (!name.trim() && memberUids.length === 1) {
      memberUids.push(currentUserId);
    }

    if (!name.trim() && memberUids.length !== 2) {
      alert("個人チャットの場合は相手を1人だけ選んでください");
      setLoading(false);
      return;
    }

    try {
      const payload = {
        name: name.trim() || undefined,
        members: name.trim() ? [...memberUids, currentUserId] : memberUids,
        createdBy: currentUserId,
        type: name.trim() ? "group" : "private",
      };

      const res = await axios.post(`${API_URL}/groups`, payload);
      onGroupCreated(res.data);

      // 成功したらリセット
      setName("");
      setMembers([]);
      setInput("");
      inputRef.current?.focus();
    } catch {
      alert("グループ作成に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-3xl shadow-2xl p-8 max-w-lg mx-auto space-y-7"
    >
      {/* グループ名 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          グループ名（個人チャットなら空欄）
        </label>
        <input
          type="text"
          placeholder="例：プロジェクトチーム、家族、友達グループ"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-5 py-4 border border-gray-300 rounded-2xl focus:ring-4 focus:ring-blue-300 focus:border-blue-500 outline-none transition text-lg"
        />
      </div>

      {/* メンバー検索 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          メンバーを追加
        </label>
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            placeholder="名前やメールで検索..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full px-5 py-4 border border-gray-300 rounded-2xl focus:ring-4 focus:ring-blue-300 focus:border-blue-500 outline-none transition text-lg"
          />

          {suggestions.length > 0 && (
            <div className="absolute z-20 w-full mt-2 bg-white border border-gray-200 rounded-2xl shadow-2xl max-h-64 overflow-y-auto">
              {suggestions.map((user) => (
                <div
                  key={user._id}
                  onClick={() => handleAddMember(user)}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-blue-50 cursor-pointer transition"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold">{user.name}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 追加済みメンバー */}
      {members.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {members.map((member) => (
            <div
              key={member.uid}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 px-5 py-3 rounded-full text-sm font-semibold shadow-sm"
            >
              <span>{member.name}</span>
              <button
                type="button"
                onClick={() => handleRemoveMember(member.uid)}
                className="hover:bg-white/50 rounded-full p-1 transition"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 神ボタン（プロフィールと完全統一！） */}
      <button
        type="submit"
        disabled={loading}
        className="w-full inline-flex justify-center items-center gap-3 px-10 py-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-xl rounded-2xl hover:from-blue-700 hover:to-purple-700 transform hover:shadow-2xl hover:scale-105 transition duration-300 shadow-xl disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" size={28} />
            作成中...
          </>
        ) : name.trim() ? (
          "グループを作成する"
        ) : (
          "チャットを開始する"
        )}
      </button>
    </form>
  );
}
