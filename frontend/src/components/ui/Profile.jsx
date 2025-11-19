// frontend/src/components/Profile.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import axios from "axios";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../../firebase";
import { Camera, Loader2 } from "lucide-react"; // lucide でカメラアイコン！

const API_URL = import.meta.env.VITE_API_URL;

export default function Profile() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [iconFile, setIconFile] = useState(null);
  const [iconUrl, setIconUrl] = useState("");
  const [loading, setLoading] = useState(false); // 保存中ローダー用

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get(`${API_URL}/users/${user.uid}`);
        setName(res.data.name || "");
        setBio(res.data.bio || "");
        setIconUrl(res.data.iconUrl || "");
      } catch {
        // エラーは無視（初回は空でもOK）
      }
    };
    if (user) fetchProfile();
  }, [user]);

  const handleUpload = async () => {
    if (!iconFile) return iconUrl;
    const storageRef = ref(
      storage,
      `icons/${user.uid}/${Date.now()}_${iconFile.name}`
    );
    await uploadBytes(storageRef, iconFile);
    const url = await getDownloadURL(storageRef);
    setIconUrl(url);
    return url;
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      let uploadedUrl = iconUrl;
      if (iconFile) {
        uploadedUrl = await handleUpload();
        setIconFile(null); // クリア
      }

      await axios.patch(`${API_URL}/users/${user.uid}`, {
        name: name.trim(),
        bio: bio.trim(),
        iconUrl: uploadedUrl,
      });

      alert("プロフィールを更新しました！");
    } catch {
      alert("保存に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  // ファイル選択時にプレビュー更新
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setIconFile(file);
      const preview = URL.createObjectURL(file);
      setIconUrl(preview); // 即反映！
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* ヘッダー背景 */}
        <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-600"></div>

        <div className="relative px-8 pt-8 pb-12 -mt-16">
          {/* アイコン（大きめ＋カメラオーバーレイ） */}
          <div className="relative inline-block">
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg bg-gray-200">
              {iconUrl ? (
                <img
                  src={iconUrl}
                  alt="プロフィール画像"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
                  <span className="text-4xl font-bold text-white">
                    {name.charAt(0).toUpperCase() || "U"}
                  </span>
                </div>
              )}
            </div>

            {/* カメラボタン */}
            <label
              htmlFor="icon-upload"
              className="absolute bottom-0 right-0 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 cursor-pointer transition transform hover:scale-110"
            >
              <Camera size={20} />
              <input
                id="icon-upload"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>
          {/* 名前 */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              名前
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="あなたの名前"
              className="w-full px-5 py-4 text-lg font-semibold bg-gray-50 border border-gray-300 rounded-2xl focus:ring-4 focus:ring-blue-300 focus:border-blue-500 outline-none transition"
            />
          </div>
          {/* Bio */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              自己紹介（bio）
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="例：フロントエンドエンジニア | React大好き | カフェ巡り中"
              rows={4}
              className="w-full px-5 py-4 bg-gray-50 border border-gray-300 rounded-2xl focus:ring-4 focus:ring-blue-300 focus:border-blue-500 outline-none resize-none transition"
            />
            <p className="text-sm text-gray-500 mt-2 text-right">
              {bio.length}/150
            </p>
          </div>
          {/* 保存ボタン */}
          <div className="mt-10 text-center">
            <button
              onClick={handleSave}
              disabled={loading}
              className="inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-lg rounded-2xl hover:from-blue-700 hover:to-purple-700 transform hover:shadow-xl transform hover:scale-105 transition duration-300 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={24} />
                  保存中...
                </>
              ) : (
                "保存する"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
