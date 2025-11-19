// frontend/src/pages/AuthPage.jsx
import { useState } from "react";
import { auth } from "../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import axios from "axios";
import { Mail, Lock, LogIn, UserPlus } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (!email || !password) {
      alert("メールアドレスとパスワードを入力してください");
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        // ログイン
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        // サインアップ
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
        const firebaseUser = userCredential.user;

        await axios.post(`${API_URL}/users`, {
          _id: firebaseUser.uid,
          name: email.split("@")[0],
          email: firebaseUser.email,
        });
      }
      // 成功したら自動でリダイレクトされるはず（App.jsxでonAuthStateChanged処理してる前提）
    } catch (error) {
      const message =
        error.code === "auth/invalid-credential"
          ? "メールアドレスまたはパスワードが間違っています"
          : error.message;
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* ロゴエリア */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full shadow-2xl mb-6">
            <span className="text-4xl font-bold text-white">C</span>
          </div>
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Welcome
          </h1>
          <p className="text-gray-600 mt-3 text-lg">
            {isLogin
              ? "またお会いできて嬉しいです"
              : "一緒にチャットを始めましょう"}
          </p>
        </div>

        {/* カード */}
        <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl p-8 border border-gray-200/50">
          <div className="space-y-6">
            {/* Email */}
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-500" />
              <input
                type="email"
                placeholder="メールアドレス"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-purple-300 focus:border-purple-500 transition-all text-gray-800 placeholder-gray-400"
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-500" />
              <input
                type="password"
                placeholder="パスワード"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-purple-300 focus:border-purple-500 transition-all text-gray-800 placeholder-gray-400"
                disabled={loading}
              />
            </div>

            {/* ボタン */}
            <button
              onClick={handleAuth}
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-lg rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {loading ? (
                <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
              ) : isLogin ? (
                <>
                  <LogIn size={22} />
                  ログイン
                </>
              ) : (
                <>
                  <UserPlus size={22} />
                  アカウント作成
                </>
              )}
            </button>

            {/* 切り替え */}
            <div className="text-center pt-4">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-purple-600 font-medium hover:underline hover:text-purple-700 transition"
                disabled={loading}
              >
                {isLogin
                  ? "アカウントをお持ちでない方はこちら"
                  : "すでにアカウントをお持ちの方はログイン"}
              </button>
            </div>
          </div>
        </div>

        {/* フッター */}
        <p className="text-center text-gray-500 text-sm mt-10">
          © 2025 Your Chat App. All rights reserved.
        </p>
      </div>
    </div>
  );
}
