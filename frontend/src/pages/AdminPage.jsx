// frontend/src/pages/AdminPage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import { io } from "socket.io-client";
import {
  Shield,
  Users,
  UserX,
  Ban,
  VolumeX,
  Volume2,
  Trash2,
  Loader2,
  Crown,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

export default function AdminPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [groups, setGroups] = useState([]);
  const [displayNames, setDisplayNames] = useState({});
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [socket, setSocket] = useState(null);

  const navigate = useNavigate();

  // ===============================
  // 管理者権限チェック + 管理グループ取得
  // ===============================
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate("/profile");
        return;
      }

      try {
        const res = await axios.get(
          `${API_URL}/groupmembers/check-admin/${user.uid}`,
        );
        if (!res.data.isAdmin) {
          alert("あなたは管理者ではありません");
          navigate("/profile");
          return;
        }

        setCurrentUser({
          id: user.uid,
          name: user.displayName || "管理者",
        });

        const groupRes = await axios.get(
          `${API_URL}/groups/admin-groups/${user.uid}`,
        );
        setGroups(groupRes.data);
      } catch {
        alert("権限確認に失敗しました");
        navigate("/profile");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // ===============================
  // private chat 用 表示名解決（Promise.all）
  // ===============================
  useEffect(() => {
    if (!groups.length || !currentUser) return;

    const fetchDisplayNames = async () => {
      const names = {};

      const privateTargets = groups.filter((g) => g.type === "private");

      // 通常グループ即時
      groups.forEach((g) => {
        if (g.type !== "private") {
          names[g._id] = g.name || "グループチャット";
        }
      });

      const results = await Promise.all(
        privateTargets.map((group) =>
          axios
            .get(`${API_URL}/groups/${group._id}`)
            .then((res) => ({ ok: true, group, data: res.data }))
            .catch((err) => ({ ok: false, group, err })),
        ),
      );

      results.forEach((r) => {
        if (r.ok) {
          const other = r.data.members?.find(
            (m) => m.userId._id !== currentUser.id,
          );
          names[r.group._id] =
            other?.userId?.name || r.group.name || "個人チャット";
        } else {
          names[r.group._id] = "個人チャット";
        }
      });

      setDisplayNames(names);
    };

    fetchDisplayNames();
  }, [groups, currentUser]);

  // ===============================
  // Socket.IO
  // ===============================
  useEffect(() => {
    if (!currentUser) return;
    const newSocket = io(SOCKET_URL, { query: { userId: currentUser.id } });
    setSocket(newSocket);
    return () => newSocket.disconnect();
  }, [currentUser]);

  // ===============================
  // リアルタイム更新
  // ===============================
  useEffect(() => {
    if (!socket || !selectedGroup) return;

    socket.on("member_banned", ({ userId, groupId, action }) => {
      if (selectedGroup._id !== groupId) return;
      setMembers((prev) =>
        prev.map((m) =>
          m.userId._id === userId
            ? { ...m, isBanned: action === "ban" } 
            : m,
        ),
      );
    });

    socket.on("member_muted", ({ userId, groupId, isMuted }) => {
      if (selectedGroup._id !== groupId) return;
      setMembers((prev) =>
        prev.map((m) => (m.userId._id === userId ? { ...m, isMuted } : m)),
      );
    });

    socket.on("removed_from_group", ({ userId, groupId }) => {
      if (selectedGroup._id !== groupId) return;
      setMembers((prev) => prev.filter((m) => m.userId._id !== userId));
    });

    return () => {
      socket.off("member_banned");
      socket.off("member_muted");
      socket.off("removed_from_group");
    };
  }, [socket, selectedGroup]);

  // ===============================
  // メンバー取得
  // ===============================
  const fetchMembers = async (groupId) => {
    try {
      const res = await axios.get(`${API_URL}/groupmembers/${groupId}`);
      setMembers(res.data);
    } catch (err) {
      console.error("メンバー取得失敗:", err);
    }
  };

  const handleSelectGroup = (group) => {
    setSelectedGroup(group);
    fetchMembers(group._id);
  };

  // ===============================
  // メンバー操作
  // ===============================
  const handleMemberAction = async (member, action = null) => {
    // memberを第1引数に
    // actionが指定されていない場合（削除専用）は "remove" とみなす
    const actualAction = action || "remove";
    const targetUserId = member.userId._id;

    if (
      actualAction === "remove" &&
      !confirm("本当にこのユーザーをグループから削除しますか？")
    )
      return;

    setActionLoading(true);
    try {
      if (actualAction === "ban" || actualAction === "unban") {
        await axios.patch(
          `${API_URL}/groupmembers/${selectedGroup._id}/ban-member`,
          { adminUserId: currentUser.id, targetUserId, action: actualAction },
        );

        setMembers((prev) =>
          prev.map((m) =>
            m.userId._id === targetUserId
              ? { ...m, isBanned: actualAction === "ban" }
              : m,
          ),
        );
      }

      if (actualAction === "mute" || actualAction === "unmute") {
        await axios.patch(
          `${API_URL}/groupmembers/${selectedGroup._id}/mute-member`,
          { adminUserId: currentUser.id, targetUserId, action: actualAction },
        );

        setMembers((prev) =>
          prev.map((m) =>
            m.userId._id === targetUserId
              ? { ...m, isMuted: actualAction === "mute" }
              : m,
          ),
        );
      }

      if (actualAction === "remove") {
        await axios.delete(`${API_URL}/groupmembers/${member._id}`);
        setMembers((prev) => prev.filter((m) => m._id !== member._id));
        alert("メンバーを削除しました");
      }
    } catch (err) {
      console.error("操作エラー:", err);
      alert(
        "操作に失敗しました: " + (err.response?.data?.message || err.message),
      );
    } finally {
      setActionLoading(false);
    }
  };

  // ===============================
  // グループ削除
  // ===============================
  const handleDeleteGroup = async (groupId) => {
    if (
      !confirm("このグループを完全に削除しますか？\nこの操作は取り消せません！")
    )
      return;

    try {
      await axios.delete(`${API_URL}/groups/${groupId}`, {
        data: { userId: currentUser.id },
      });
      setGroups((prev) => prev.filter((g) => g._id !== groupId));
      setSelectedGroup(null);
      setMembers([]);
      alert("グループを削除しました");
    } catch {
      alert("削除に失敗しました");
    }
  };

  // ===============================
  // ローディング
  // ===============================
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="animate-spin w-12 h-12 text-blue-600" />
      </div>
    );
  }

  // ===============================
  // JSX
  // ===============================
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-4 bg-white/80 px-8 py-6 rounded-3xl shadow-2xl">
            <Shield className="w-12 h-12 text-red-600" />
            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-red-600 to-purple-600 bg-clip-text text-transparent">
              管理者パネル
            </h1>
            <Crown className="w-10 h-10 text-yellow-500" />
          </div>
          <p className="mt-4 text-lg text-gray-600">
            ようこそ、{currentUser?.name} さん
          </p>
        </div>

        <div
          className={`grid grid-cols-1 gap-8 ${
            selectedGroup ? "lg:grid-cols-3" : "max-w-2xl mx-auto"
          }`}
        >
          {/* 管理グループ一覧 */}
          <div>
            <div className="bg-white rounded-3xl shadow-xl p-8">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <Users className="w-8 h-8 text-blue-600" />
                管理グループ一覧
              </h2>

              <div className="space-y-4">
                {groups.map((group) => (
                  <div
                    key={group._id}
                    onClick={() => handleSelectGroup(group)}
                    className={`p-6 rounded-2xl border-2 cursor-pointer ${
                      selectedGroup?._id === group._id
                        ? "border-purple-500 bg-purple-50"
                        : "border-gray-200 hover:border-purple-400"
                    }`}
                  >
                    <h3 className="font-bold text-lg">
                      {displayNames[group._id] || "読み込み中..."}
                    </h3>
                    <p className="text-sm text-gray-600 mt-2">
                      {group.memberCount} 人のメンバー
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* メンバー管理 */}
          {selectedGroup && (
            <div className="lg:col-span-2">
              <div className="bg-white rounded-3xl shadow-2xl p-8">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-3xl font-bold">
                    {displayNames[selectedGroup._id] || "個人チャット"} の管理
                  </h2>
                  <button
                    disabled={actionLoading}
                    onClick={() => handleDeleteGroup(selectedGroup._id)}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold ${
                      actionLoading ? "bg-gray-400" : "bg-red-600 text-white"
                    }`}
                  >
                    <Trash2 size={20} />
                    削除
                  </button>
                </div>

                <div className="space-y-4">
                  {members.map((member) => (
                    <div
                      key={member._id}
                      className="p-5 rounded-xl border flex justify-between items-center"
                    >
                      <strong>{member.userId.name}</strong>
                      <div className="flex gap-2">
                        {/* ミュートボタン */}
                        <button
                          disabled={actionLoading}
                          onClick={() =>
                            handleMemberAction(
                              member,
                              member.isMuted ? "unmute" : "mute",
                            )
                          }
                          className={`group relative px-3 py-2 rounded text-white ${
                            actionLoading
                              ? "bg-gray-400"
                              : "bg-gray-600 hover:bg-gray-700"
                          } transition-colors`}
                        >
                          {member.isMuted ? (
                            <Volume2 size={20} />
                          ) : (
                            <VolumeX size={20} />
                          )}
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                            {member.isMuted ? "ミュート解除" : "ミュート"}
                          </span>
                        </button>

                        {/* Banボタン */}
                        <button
                          disabled={actionLoading}
                          onClick={() =>
                            handleMemberAction(
                              member,
                              member.isBanned ? "unban" : "ban",
                            )
                          }
                          className={`group relative px-3 py-2 text-white rounded transition-colors ${
                            member.isBanned
                              ? "bg-red-800 hover:bg-red-900"
                              : "bg-red-600 hover:bg-red-700"
                          }`}
                        >
                          <Ban size={20} />
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                            {member.isBanned ? "Ban解除" : "Ban"}
                          </span>
                        </button>

                        {/* 削除ボタン */}
                        <button
                          disabled={actionLoading}
                          onClick={() => handleMemberAction(member)} // ← member全体を渡す
                          className="group relative px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded transition-colors"
                        >
                          <UserX size={20} />
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                            グループから削除
                          </span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
