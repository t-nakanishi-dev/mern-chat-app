// frontend/src/pages/GroupsPage.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import GroupForm from "../components/chat/GroupForm";
import GroupList from "../components/chat/GroupList";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import io from "socket.io-client";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function GroupsPage() {
  const [groups, setGroups] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [socket, setSocket] = useState(null);

  // Firebase認証リスナー
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) setCurrentUserId(user.uid);
      else setCurrentUserId(null);
    });
    return () => unsubscribe();
  }, []);

  // Socket.IO接続
  useEffect(() => {
    if (!currentUserId) return;

    const s = io(API_URL, {
      query: { userId: currentUserId },
      transports: ["websocket", "polling"], // 明示的に両方許可
    });

    setSocket(s);

    s.emit("joinGroup", { userId: currentUserId });

    s.on(
      "message_received",
      ({ groupId, message, selfOnly }) => {
        if (!selfOnly && message.senderId !== currentUserId) {
          setGroups((prevGroups) =>
            prevGroups.map((group) =>
              group._id === groupId
                ? { ...group, unreadCount: (group.unreadCount || 0) + 1 }
                : group,
            ),
          );
        }
      },
      [currentUserId],
    );

    s.on("readStatusUpdated", (updatedMessage) => {
      setGroups((prevGroups) =>
        prevGroups.map((group) => {
          if (group._id === updatedMessage.group) {
            const newCount = (group.unreadCount || 0) - 1;
            return { ...group, unreadCount: newCount > 0 ? newCount : 0 };
          }
          return group;
        }),
      );
    });

    s.on("removed_from_group", (groupId) => {
      setGroups((prevGroups) => prevGroups.filter((g) => g._id !== groupId));
    });

    return () => {
      s.disconnect();
    };
  }, [currentUserId]);

  // グループ一覧取得
  const fetchGroups = async () => {
    if (!currentUserId) return;
    try {
      const res = await axios.get(`${API_URL}/groups?userId=${currentUserId}`);
      setGroups(res.data);
    } catch (err) {
      console.error("チャット一覧取得失敗:", err);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;
    const interval = setInterval(fetchGroups, 30000);
    return () => clearInterval(interval);
  }, [currentUserId]);

  const handleGroupCreated = (newGroup) => {
    // サーバーから displayName 付きのデータが返ってくるので、そのままセット
    setGroups((prev) => [...prev, newGroup]);

    // 念のため、1秒後くらいに全体を再同期させる
    setTimeout(() => fetchGroups(), 1000);
  };

  const handleDelete = (id) => {
    setGroups((prev) => prev.filter((g) => g._id !== id));
  };

  if (!currentUserId) return <div>ログイン情報を取得中...</div>;

  return (
    <div className="max-w-xl mx-auto p-4 space-y-4">
      <GroupForm
        onGroupCreated={handleGroupCreated}
        currentUserId={currentUserId}
      />
      <GroupList
        groups={groups}
        onDelete={handleDelete}
        currentUserId={currentUserId}
      />
    </div>
  );
}
