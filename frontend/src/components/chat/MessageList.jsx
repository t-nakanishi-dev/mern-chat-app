// frontend/src/components/chat/MessageList.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { ja } from "date-fns/locale";

const API_URL = import.meta.env.VITE_API_URL;

// 今日・昨日・日付を日本語で表示
const formatDateLabel = (dateString) => {
  if (!dateString) return "";
  const date = parseISO(dateString);
  if (isToday(date)) return "今日";
  if (isYesterday(date)) return "昨日";
  return format(date, "yyyy年M月d日", { locale: ja });
};

export default function MessageList({
  messages,
  currentUserId,
  messagesEndRef,
  scrollContainerRef,
  socket, // ← 新規追加：socket を受け取る
}) {
  const [userProfiles, setUserProfiles] = useState({});

  // ユーザー情報取得（変更なし）
  useEffect(() => {
    const uniqueUserIds = [...new Set(messages.map((m) => m.sender))];
    uniqueUserIds.forEach(async (uid) => {
      if (!userProfiles[uid]) {
        try {
          const res = await axios.get(`${API_URL}/users/${uid}`);
          setUserProfiles((prev) => ({ ...prev, [uid]: res.data }));
        } catch (err) {
          console.error("ユーザー情報取得失敗:", uid, err);
        }
      }
    });
  }, [messages, userProfiles]); // userProfiles を依存に追加（安全のため）

  // ★ 新規追加：未読メッセージを既読にする
  useEffect(() => {
    if (!socket || !currentUserId || messages.length === 0) return;

    const markAsRead = async () => {
      const unreadMessages = messages.filter(
        (msg) =>
          msg.sender !== currentUserId && // 自分が送ったものは除外
          !msg.readBy?.includes(currentUserId), // まだ既読でないもの
      );

      if (unreadMessages.length === 0) return;

      for (const msg of unreadMessages) {
        try {
          await axios.post(`${API_URL}/messages/${msg._id}/read`, {
            userId: currentUserId,
          });
          console.log(`既読マーク完了: ${msg._id}`);
        } catch (err) {
          console.error(`既読マーク失敗: ${msg._id}`, err);
        }
      }
    };

    markAsRead();
  }, [messages, currentUserId, socket]);

  return (
    <div
      ref={scrollContainerRef}
      className="flex-1 overflow-y-auto mb-2 p-2 bg-white rounded-md flex flex-col"
      style={{ maxHeight: "calc(100vh - 240px)" }}
    >
      {messages.length > 0 ? (
        messages.map((msg, index) => {
          const profile = userProfiles[msg.sender] || {};
          const isCurrentUser = msg.sender === currentUserId;

          const prevMsg = messages[index - 1];
          const currentDate = msg.createdAt?.split("T")[0];
          const prevDate = prevMsg?.createdAt?.split("T")[0];
          const showDateSeparator = currentDate && currentDate !== prevDate;

          return (
            <div key={msg._id || msg._tempId || index}>
              {showDateSeparator && (
                <div className="my-8 text-center">
                  <span className="bg-gray-100 text-gray-600 text-xs font-bold px-5 py-2 rounded-full shadow-sm border border-gray-300">
                    {formatDateLabel(msg.createdAt)}
                  </span>
                </div>
              )}

              <div
                className={`flex mb-2 ${
                  isCurrentUser ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`flex ${
                    isCurrentUser ? "flex-row-reverse" : "flex-row"
                  } max-w-[70%]`}
                >
                  {profile.iconUrl && (
                    <img
                      src={profile.iconUrl}
                      alt="icon"
                      className={`w-10 h-10 rounded-full object-cover flex-shrink-0 ${
                        isCurrentUser ? "ml-2" : "mr-2"
                      }`}
                    />
                  )}

                  <div
                    className={`p-3 rounded-2xl shadow-sm ${
                      isCurrentUser
                        ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                        : "bg-gray-100 text-gray-800 border border-gray-200"
                    }`}
                  >
                    <p className="font-bold text-sm text-gray-800 mb-1">
                      {profile.name || msg.sender.slice(0, 8)}
                    </p>
                    {msg.text && <p className="break-words">{msg.text}</p>}
                    {msg.fileUrl && (
                      <img
                        src={msg.fileUrl}
                        alt="添付"
                        className="mt-2 rounded-lg max-w-full shadow-sm"
                      />
                    )}
                    <div className="text-xs text-gray-400 mt-2 text-right">
                      {msg.createdAt
                        ? new Date(msg.createdAt).toLocaleTimeString("ja-JP", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : ""}
                    </div>
                    {isCurrentUser && (
                      <p className="text-xs text-white/80 text-right">
                        既読{" "}
                        {msg.readBy?.filter((id) => id !== currentUserId)
                          .length || 0}
                        人
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })
      ) : (
        <p className="text-center text-gray-500 mt-10">
          まだメッセージがありません。
        </p>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}
