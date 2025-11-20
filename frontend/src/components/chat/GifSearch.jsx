// frontend/src/components/GifSearch.jsx
import React from "react";
import { searchGifs } from "../../api/giphy";

export default function GifSearch({
  gifQuery,
  setGifQuery,
  gifResults,
  setGifResults,
  socket,
  user,
  groupId,
  showModal,
  setMessages, // ← これをMessageInputから受け取る！！
}) {
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

  const handleSendGif = (url) => {
    if (!socket || !user || !groupId) return;

    const gifMessage = {
      _id: "temp-gif-" + Date.now(), // 一時ID
      group: groupId,
      sender: user.uid,
      text: "",
      fileUrl: url,
      createdAt: new Date().toISOString(),
      pending: true,
    };

    // まず自分の画面に即座に表示（楽観的更新！）
    setMessages((prev) => [...prev, gifMessage]);

    // サーバーに送信（実際のAPIは後で作ればOK）
    socket.emit("send_message", {
      groupId,
      message: {
        group: groupId,
        sender: user.uid,
        text: "",
        fileUrl: url,
      },
    });

    // 検索結果をクリア
    setGifResults([]);
    setGifQuery("");
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
              className="w-full h-32 object-cover rounded-lg cursor-pointer hover:scale-105 transition transform shadow-md hover:shadow-xl border-2 border-transparent hover:border-purple-500"
              onClick={() => handleSendGif(url)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
