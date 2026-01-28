// frontend/src/components/chat/GroupChat.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../../hooks/useAuth";
import { io } from "socket.io-client";
import axios from "axios";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import Modal from "../ui/Modal";
import { v4 as uuidv4 } from "uuid";
import { Ban, VolumeX, MessageCircle, Users } from "lucide-react";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;
const API_URL = import.meta.env.VITE_API_URL;

export default function GroupChat({ groupId }) {
  const { user } = useAuth();

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalMessage, setModalMessage] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [members, setMembers] = useState([]);
  const [isBanned, setIsBanned] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [groupName, setGroupName] = useState("チャット");

  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const fileInputRef = useRef(null);

  const showModal = (msg) => {
    setModalMessage(msg);
    setIsModalOpen(true);
  };

  // Socket.io 初期化
  useEffect(() => {
    if (!user) return;
    const newSocket = io(SOCKET_URL, { query: { userId: user.uid } });
    setSocket(newSocket);
    return () => newSocket.disconnect();
  }, [user]);

  // メンバー取得 + グループ名取得 + Socket設定
  useEffect(() => {
    if (!user || !groupId || !socket) return;

    const fetchMembersAndSetup = async () => {
      try {
        const { data: memberData } = await axios.get(
          `${API_URL}/groupmembers/${groupId}`,
        );
        setMembers(memberData);

        const { data: groupData } = await axios.get(
          `${API_URL}/groups/${groupId}`,
        );

        // ★ここを修正：privateチャットの場合は相手の名前を表示
        let displayName = groupData.name || "個人チャット";
        if (groupData.type === "private" && memberData.length >= 2) {
          const otherMember = memberData.find((m) => m.userId._id !== user.uid);
          if (otherMember?.userId?.name) {
            displayName = otherMember.userId.name;
            // 好みで「あなたと〇〇」にしたい場合は以下に変更
            // displayName = `あなたと ${otherMember.userId.name}`;
          }
        }
        setGroupName(displayName);

        const me = memberData.find((m) => m.userId._id === user.uid);
        if (me?.isBanned) {
          showModal("あなたはBANされています。チャットに参加できません。");
          setIsBanned(true);
        } else {
          setIsBanned(false);
          setIsMuted(me?.isMuted || false);
          socket.emit("joinGroup", { groupId, userId: user.uid });
        }

        socket.on("member_banned", ({ userId: uid, action }) => {
          if (uid === user.uid) {
            const banned = action === "ban";
            setIsBanned(banned);
            showModal(
              banned
                ? "あなたはグループからBANされました。"
                : "BANが解除されました。",
            );
          }
        });

        socket.on("member_muted", ({ userId: uid, action }) => {
          if (uid === user.uid) {
            const muted = action === "mute";
            setIsMuted(muted);
            showModal(
              muted
                ? "あなたはミュートされました。"
                : "ミュートが解除されました。",
            );
          }
        });

        socket.on("message_received", ({ groupId: gId, message }) => {
          console.log("相手からmessage_received受信！", { gId, message });
          if (gId !== groupId) return;
          const senderId =
            typeof message.sender === "string"
              ? message.sender
              : message.sender?._id;
          if (senderId === user.uid) return;

          const normalizedMsg = { ...message, sender: senderId || "unknown" };
          setMessages((prev) => [...prev, normalizedMsg]);
        });

        socket.on("readStatusUpdated", (updatedMsg) => {
          const senderId =
            typeof updatedMsg.sender === "string"
              ? updatedMsg.sender
              : updatedMsg.sender?._id;
          const normalizedMsg = {
            ...updatedMsg,
            sender: senderId || "unknown",
          };
          setMessages((prev) =>
            prev.map((msg) =>
              msg._id === normalizedMsg._id ? normalizedMsg : msg,
            ),
          );
        });

        fetchMessages();
      } catch (err) {
        console.error("メンバーまたはグループ情報の取得に失敗:", err);
        showModal("チャットの読み込みに失敗しました");
      } finally {
        setLoading(false);
      }
    };

    fetchMembersAndSetup();

    return () => {
      socket.off("message_received");
      socket.off("readStatusUpdated");
      socket.off("member_banned");
      socket.off("member_muted");
    };
  }, [user, groupId, socket]);

  // メッセージ取得
  const fetchMessages = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data } = await axios.get(`${API_URL}/messages/group/${groupId}`, {
        params: { userId: user.uid, page: 1, limit: 20 },
      });
      const normalized = data.map((msg) => ({
        ...msg,
        sender:
          typeof msg.sender === "string"
            ? msg.sender
            : msg.sender?._id || "unknown",
      }));
      setMessages(normalized);
      setHasMore(normalized.length === 20);
      setPage(2);
    } catch (err) {
      console.error("メッセージ取得に失敗:", err);
      showModal("メッセージの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [groupId, user]);

  // 過去メッセージ読み込み
  const loadMoreMessages = useCallback(async () => {
    if (!user || !hasMore || loadingMore) return;
    try {
      setLoadingMore(true);
      const { data } = await axios.get(`${API_URL}/messages/group/${groupId}`, {
        params: { userId: user.uid, page, limit: 20 },
      });
      const normalized = data.map((msg) => ({
        ...msg,
        sender:
          typeof msg.sender === "string"
            ? msg.sender
            : msg.sender?._id || "unknown",
      }));
      if (normalized.length > 0) {
        setMessages((prev) => [...normalized, ...prev]);
        setPage((prev) => prev + 1);
        setHasMore(normalized.length === 20);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error("過去メッセージ読み込み失敗:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [user, groupId, page, hasMore, loadingMore]);

  // メッセージ送信
  const handleSendMessage = async (text, fileData) => {
    if (!user || (!text?.trim() && !fileData)) return;

    const tempId = uuidv4();
    const tempMessage = {
      _tempId: tempId,
      sender: user.uid,
      text: text?.trim() || "",
      fileUrl: fileData ? URL.createObjectURL(fileData) : null,
      createdAt: new Date().toISOString(),
      readBy: [user.uid], // 送信時点で自分を既読に
    };

    setMessages((prev) => [...prev, tempMessage]);

    try {
      const formData = new FormData();
      formData.append("text", text?.trim() || "");
      if (fileData) formData.append("file", fileData);

      const { data } = await axios.post(
        `${API_URL}/messages/group/${groupId}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );

      const normalizedRes = {
        ...data,
        sender:
          typeof data.sender === "string"
            ? data.sender
            : data.sender?._id || "unknown",
      };

      setMessages((prev) =>
        prev.map((msg) => (msg._tempId === tempId ? normalizedRes : msg)),
      );

      socket?.emit("send_message", { groupId, message: normalizedRes });
    } catch (err) {
      console.error("送信失敗:", err);
      showModal("メッセージの送信に失敗しました");
      setMessages((prev) => prev.filter((msg) => msg._tempId !== tempId));
    }
  };

  // スマート自動スクロール（これが最後のピース！）
  useEffect(() => {
    if (!messagesEndRef.current || !scrollContainerRef.current) return;

    const scrollContainer = scrollContainerRef.current;
    const lastMessage = messages[messages.length - 1];

    // 自分が送信したメッセージ → 必ず最下部へ
    if (lastMessage?.sender === user?.uid) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      return;
    }

    // ユーザーが下にいるかどうか（100px以内なら「下にいる」と判定）
    const isNearBottom =
      scrollContainer.scrollHeight -
        scrollContainer.scrollTop -
        scrollContainer.clientHeight <
      100;

    // 下にいる場合のみ自動スクロール
    if (isNearBottom) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, user?.uid]);

  // 以下、表示部分（変更なし）
  if (!user)
    return (
      <div className="flex items-center justify-center h-screen text-gray-500">
        認証中...
      </div>
    );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl font-medium text-gray-700">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (isBanned) {
    return (
      <div className="flex flex-col h-screen bg-gradient-to-br from-red-50 to-pink-50">
        <div className="bg-white/90 backdrop-blur-sm border-b border-red-200 p-8 text-center">
          <Ban className="w-20 h-20 text-red-600 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-red-700">{groupName}</h2>
          <p className="text-xl text-red-600 mt-6">
            あなたはこのグループからBANされています
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <header className="bg-white/90 backdrop-blur-sm border-b border-gray-200 px-6 py-5 shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <MessageCircle className="w-10 h-10 text-purple-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{groupName}</h1>
              <p className="text-sm text-gray-500 flex items-center gap-2">
                <Users size={16} />
                {members.length}人のメンバー
                {isMuted && (
                  <span className="ml-3 text-orange-600 flex items-center gap-1">
                    <VolumeX size={16} /> ミュート中
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col max-w-6xl mx-auto w-full">
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          message={modalMessage}
        />

        <div className="flex-1 bg-white/80 backdrop-blur-sm border-x border-gray-200 overflow-hidden">
          <MessageList
            messages={messages}
            currentUserId={user.uid}
            onLoadMore={loadMoreMessages}
            hasMore={hasMore}
            loadingMore={loadingMore}
            messagesEndRef={messagesEndRef}
            scrollContainerRef={scrollContainerRef}
            socket={socket} // ← ここを追加！！
          />
        </div>

        <div className="border-t border-x border-gray-200 bg-white/90 backdrop-blur-sm rounded-b-3xl shadow-lg">
          <MessageInput
            groupId={groupId}
            socket={socket}
            user={user}
            newMessage={newMessage}
            setNewMessage={setNewMessage}
            file={file}
            setFile={setFile}
            previewUrl={previewUrl}
            setPreviewUrl={setPreviewUrl}
            fileInputRef={fileInputRef}
            showModal={showModal}
            setMessages={setMessages}
            onSendMessage={handleSendMessage}
            isMuted={isMuted}
          />
        </div>
      </div>
    </div>
  );
}
