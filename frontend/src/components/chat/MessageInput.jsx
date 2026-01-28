// frontend/src/components/MessageInput.jsx
import React, { useState } from "react";
import axios from "axios";
import GifSearch from "./GifSearch";
import { Paperclip, Send } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;
const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "application/pdf",
];

export default function MessageInput({
  groupId,
  socket,
  user,
  newMessage,
  setNewMessage,
  file,
  setFile,
  previewUrl,
  setPreviewUrl,
  fileInputRef,
  showModal,
  setMessages,
  isMuted,
}) {
  const [gifQuery, setGifQuery] = useState("");
  const [gifResults, setGifResults] = useState([]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    if (!ALLOWED_TYPES.includes(selectedFile.type)) {
      showModal("この種類のファイルは送信できません");
      e.target.value = "";
      setFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      return;
    }

    if (selectedFile.size > MAX_SIZE) {
      showModal("ファイルサイズは5MBまでです");
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);

    setFile(selectedFile);
    if (selectedFile.type.startsWith("image/")) {
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (isMuted || (!newMessage.trim() && !file)) return;
    if (!navigator.onLine) {
      showModal("オフラインです。ネットワークを確認してください。");
      return;
    }

    const tempMessage = {
      _id: "temp-" + Date.now(),
      group: groupId,
      sender: user.uid,
      text: newMessage,
      fileUrl: previewUrl || null,
      createdAt: new Date().toISOString(),
      pending: true,
    };
    setMessages?.((prev) => [...prev, tempMessage]);

    try {
      const formData = new FormData();
      formData.append("group", groupId);
      formData.append("sender", user.uid);
      if (file) formData.append("file", file);
      if (newMessage.trim()) formData.append("text", newMessage);

      const res = await axios.post(`${API_URL}/messages`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 10000,
      });

      socket.emit("groupMessage", res.data);

      setMessages?.((prev) =>
        prev.map((msg) => (msg._id === tempMessage._id ? res.data : msg))
      );

      setNewMessage("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    } catch (err) {
      console.error("送信失敗:", err);
      showModal("メッセージ送信に失敗しました");
      setMessages?.((prev) =>
        prev.filter((msg) => msg._id !== tempMessage._id)
      );
    }
  };

  return (
    <form
      onSubmit={handleSendMessage}
      className="p-4 bg-white/90 backdrop-blur-sm border-t border-gray-200"
    >
      {/* プレビュー */}
      {file && (
        <div className="mb-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
          <p className="text-sm text-gray-700 mb-2">
            選択中: {file.name} ({(file.size / 1024).toFixed(1)} KB)
          </p>
          {file.type.startsWith("image/") && previewUrl && (
            <img
              src={previewUrl}
              alt="プレビュー"
              className="max-h-40 w-full object-contain rounded-lg shadow-md"
            />
          )}
        </div>
      )}

      {/* 入力エリア：アイコン＋入力＋送信 */}
      <div className="flex items-center gap-3">
        {/* ファイル添付アイコン（隠しinputをトリガー） */}
        <label className="cursor-pointer">
          <Paperclip
            size={24}
            className={`text-blue-600 hover:text-blue-800 transition ${
              isMuted ? "opacity-50" : ""
            }`}
          />
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            disabled={isMuted}
          />
        </label>

        {/* テキスト入力 */}
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={isMuted ? "ミュート中..." : "メッセージを入力..."}
          className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
          disabled={isMuted}
        />

        {/* 送信ボタン */}
        <button
          type="submit"
          className={`p-3 rounded-full transition-all ${
            isMuted
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg hover:shadow-xl hover:scale-110"
          }`}
          disabled={isMuted}
        >
          <Send size={20} />
        </button>
      </div>

      {/* GIF検索 */}
      <div
        className="mt-4"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <GifSearch
          gifQuery={gifQuery}
          setGifQuery={setGifQuery}
          gifResults={gifResults}
          setGifResults={setGifResults}
          // socket={socket}
          user={user}
          groupId={groupId}
          showModal={showModal}
          setMessages={setMessages}
        />
      </div>
    </form>
  );
}
