// frontend/src/components/GifSearch.jsx
import React, { useState } from "react";
import axios from "axios";
import { searchGifs } from "../../api/giphy";

const API_URL = import.meta.env.VITE_API_URL;

export default function GifSearch({
  gifQuery,
  setGifQuery,
  gifResults,
  setGifResults,
  user,
  groupId,
  showModal,
  setMessages,
}) {
  const [sending, setSending] = useState(false);

  const handleSearchGif = async () => {
    if (!gifQuery.trim()) return;
    try {
      const results = await searchGifs(gifQuery);
      setGifResults(results);
    } catch (err) {
      console.error("GIF検索に失敗:", err);
      showModal("GIF検索に失敗しました");
    }
  };

  const handleSendGif = async (url) => {
    // 送信中なら何もしない（ダブルクリック防止）
    if (sending) {
      console.log("送信中です。連続クリックは無視されます");
      return;
    }

    setSending(true);
    console.log("handleSendGif が呼ばれました！ URL:", url);

    if (!user || !groupId) {
      console.log("早期return: userまたはgroupIdがありません", {
        user,
        groupId,
      });
      setSending(false);
      return;
    }

    const tempId = "temp-gif-" + Date.now();
    console.log("送信処理開始 - tempId:", tempId);

    const tempMessage = {
      _id: tempId,
      group: groupId,
      sender: user.uid,
      text: "",
      fileUrl: url,
      createdAt: new Date().toISOString(),
      pending: true,
    };

    try {
      console.log("1. 楽観的更新開始");
      setMessages((prev) => [...prev, tempMessage]);

      console.log("2. axios.post を実行します...");
      const res = await axios.post(`${API_URL}/messages/gif`, {
        group: groupId,
        sender: user.uid,
        fileUrl: url,
        gifQuery: gifQuery.trim() || "searched gif",
      });

      console.log("3. axios.post 成功！ レスポンス:", res.data);

      setMessages((prev) =>
        prev.map((msg) => (msg._id === tempId ? res.data : msg)),
      );

      setGifResults([]);
      setGifQuery("");
    } catch (err) {
      console.error("★ GIF送信でエラーが発生しました ★", err);
      console.error("エラー詳細:", err.message);
      if (err.response) {
        console.error("サーバーからのレスポンス:", err.response.data);
        console.error("ステータスコード:", err.response.status);
      }
      showModal("GIFの送信に失敗しました: " + (err.message || "不明なエラー"));
      setMessages((prev) => prev.filter((msg) => msg._id !== tempId));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={gifQuery}
          onChange={(e) => setGifQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSearchGif();
            }
          }}
          placeholder="GIFを検索...（例: cat, happy, thank you）"
          className="flex-1 p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleSearchGif();
          }}
          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold rounded-xl hover:shadow-lg transition"
        >
          Search
        </button>
      </div>

      {gifResults.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-80 overflow-y-auto p-2">
          {gifResults.map((url, index) => (
            <img
              key={index}
              src={url}
              alt="GIF"
              className={`w-full h-32 object-cover rounded-lg cursor-pointer transition transform shadow-md hover:shadow-xl border-2 border-transparent hover:border-purple-500 ${
                sending ? "opacity-50 cursor-wait" : "hover:scale-105"
              }`}
              onClick={() => handleSendGif(url)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
