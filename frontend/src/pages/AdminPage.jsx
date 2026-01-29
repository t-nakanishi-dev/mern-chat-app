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
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [socket, setSocket] = useState(null);

  const navigate = useNavigate();

  // 管理者権限チェック
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

        setCurrentUser({ id: user.uid, name: user.displayName || "管理者" });

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

  // Socket.IO
  useEffect(() => {
    if (!currentUser) return;
    const newSocket = io(SOCKET_URL, { query: { userId: currentUser.id } });
    setSocket(newSocket);
    return () => newSocket.disconnect();
  }, [currentUser]);

  // リアルタイム更新
  useEffect(() => {
    if (!socket || !selectedGroup) return;

    socket.on("member_banned", ({ userId: bannedUserId, groupId, action }) => {
      if (selectedGroup._id !== groupId) return;
      setMembers((prev) =>
        prev.map((m) =>
          m.userId._id === bannedUserId
            ? { ...m, isBanned: action === "ban" }
            : m,
        ),
      );
    });

    socket.on("removed_from_group", ({ userId, groupId }) => {
      if (selectedGroup._id !== groupId) return;
      setMembers((prev) => prev.filter((m) => m.userId._id !== userId));
    });

    return () => {
      socket.off("member_banned");
      socket.off("removed_from_group");
    };
  }, [socket, selectedGroup]);

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

  const handleMemberAction = async (targetUserId, action) => {
    if (
      action === "remove" &&
      !confirm("本当にこのユーザーをグループから削除しますか？")
    )
      return;

    setActionLoading(true);
    try {
      if (action === "ban" || action === "unban") {
        await axios.patch(
          `${API_URL}/groupmembers/${selectedGroup._id}/ban-member`,
          { adminUserId: currentUser.id, targetUserId, action },
        );
        setMembers((prev) =>
          prev.map((m) =>
            m.userId._id === targetUserId
              ? { ...m, isBanned: action === "ban" }
              : m,
          ),
        );
      }

      if (action === "mute" || action === "unmute") {
        await axios.patch(
          `${API_URL}/groupmembers/${selectedGroup._id}/mute-member`,
          { adminUserId: currentUser.id, targetUserId, action },
        );
        setMembers((prev) =>
          prev.map((m) =>
            m.userId._id === targetUserId
              ? { ...m, isMuted: action === "mute" }
              : m,
          ),
        );
      }

      if (action === "remove") {
        await axios.delete(`${API_URL}/groupmembers/${targetUserId}`);
        setMembers((prev) => prev.filter((m) => m.userId._id !== targetUserId));
      }
    } catch (err) {
      alert("操作に失敗しました");
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="animate-spin w-12 h-12 text-blue-600 mx-auto mb-4" />
          <p className="text-xl font-semibold text-gray-700">
            管理者パネルを読み込み中...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-4 bg-white/80 backdrop-blur px-8 py-6 rounded-3xl shadow-2xl">
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

        {/* 動的なグリッド設定:
          - selectedGroupがある時: lgで3カラム (1:2の比率)
          - selectedGroupがない時: 1カラムかつ最大幅を抑えて中央寄せ
        */}
        <div
          className={`grid grid-cols-1 gap-8 transition-all duration-500 ${
            selectedGroup ? "lg:grid-cols-3" : "max-w-2xl mx-auto"
          }`}
        >
          {/* グループ一覧 */}
          <div className={`${selectedGroup ? "lg:col-span-1" : "w-full"}`}>
            <div className="bg-white rounded-3xl shadow-xl p-8 h-full">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                <Users className="w-8 h-8 text-blue-600" />
                管理グループ一覧
              </h2>

              <div className="space-y-4">
                {groups.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    管理しているグループはありません
                  </p>
                ) : (
                  groups.map((group) => (
                    <div
                      key={group._id}
                      className={`p-6 rounded-2xl border-2 transition-all cursor-pointer ${
                        selectedGroup?._id === group._id
                          ? "border-purple-500 bg-purple-50 shadow-lg"
                          : "border-gray-200 hover:border-purple-400 hover:shadow-md"
                      }`}
                      onClick={() => handleSelectGroup(group)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-bold text-lg">
                            {group.name || "個人チャット"}
                          </h3>
                          <p className="text-sm text-gray-600 mt-2 flex items-center gap-2">
                            <Users size={15} className="text-purple-600" />
                            <span className="font-semibold text-purple-700">
                              {group.memberCount || group.members?.length || 0}
                            </span>
                            <span className="text-gray-500">人のメンバー</span>
                          </p>
                        </div>
                        {group.createdBy === currentUser.id && (
                          <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs px-3 py-1 rounded-full font-bold">
                            作成者
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* メンバー管理パネル */}
          {selectedGroup && (
            <div className="lg:col-span-2 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="bg-white rounded-3xl shadow-2xl p-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                  <h2 className="text-3xl font-bold text-gray-800">
                    {selectedGroup.name || "個人チャット"} のメンバー管理
                  </h2>
                  <button
                    onClick={() => handleDeleteGroup(selectedGroup._id)}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white font-bold rounded-2xl hover:from-red-700 hover:to-red-800 transform hover:scale-105 transition shadow-lg whitespace-nowrap"
                  >
                    <Trash2 size={20} />
                    グループ削除
                  </button>
                </div>

                <div className="space-y-5">
                  {members.map((member) => (
                    <div
                      key={member._id}
                      className={`p-6 rounded-2xl border-2 transition-all ${
                        member.isBanned
                          ? "bg-red-50 border-red-300"
                          : "bg-gray-50 border-gray-200 hover:border-purple-400"
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg flex-shrink-0">
                            {member.userId.name?.charAt(0).toUpperCase() || "?"}
                          </div>
                          <div>
                            <h4 className="font-bold text-lg">
                              {member.userId.name || "不明"}
                            </h4>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {member.userId._id ===
                                selectedGroup.createdBy && (
                                <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs px-3 py-1 rounded-full font-bold">
                                  作成者
                                </span>
                              )}
                              {member.isBanned && (
                                <span className="bg-red-600 text-white text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1">
                                  <Ban size={14} />
                                  BAN中
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-3 max-[500px]:flex-col w-full lg:w-auto">
                          <button
                            onClick={() =>
                              handleMemberAction(
                                member.userId._id,
                                member.isBanned ? "unban" : "ban",
                              )
                            }
                            disabled={actionLoading}
                            className={`flex-1 min-w-[120px] px-5 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition transform hover:scale-105 ${
                              member.isBanned
                                ? "bg-green-600 hover:bg-green-700 text-white"
                                : "bg-red-600 hover:bg-red-700 text-white"
                            }`}
                          >
                            <Ban size={18} />
                            {member.isBanned ? "解除" : "BAN"}
                          </button>

                          <button
                            onClick={() =>
                              handleMemberAction(
                                member.userId._id,
                                member.isMuted ? "unmute" : "mute",
                              )
                            }
                            disabled={actionLoading}
                            className={`flex-1 min-w-[120px] px-5 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition transform hover:scale-105 ${
                              member.isMuted
                                ? "bg-blue-600 hover:bg-blue-700 text-white"
                                : "bg-gray-600 hover:bg-gray-700 text-white"
                            }`}
                          >
                            {member.isMuted ? (
                              <Volume2 size={18} />
                            ) : (
                              <VolumeX size={18} />
                            )}
                            {member.isMuted ? "解除" : "ミュート"}
                          </button>

                          <button
                            onClick={() =>
                              member.userId._id !== selectedGroup.createdBy &&
                              handleMemberAction(member.userId._id, "remove")
                            }
                            disabled={
                              actionLoading ||
                              member.userId._id === currentUser.id ||
                              member.userId._id === selectedGroup.createdBy
                            }
                            className={`flex-1 min-w-[120px] px-5 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-200 ${
                              member.userId._id === currentUser.id ||
                              member.userId._id === selectedGroup.createdBy
                                ? "bg-gray-400 text-gray-600 cursor-not-allowed opacity-60"
                                : "bg-gradient-to-r from-orange-500 to-red-600 text-white hover:from-orange-600 hover:to-red-700 transform hover:scale-105 shadow-lg"
                            }`}
                          >
                            <UserX size={18} />
                            削除
                          </button>
                        </div>
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
