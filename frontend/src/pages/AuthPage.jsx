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
        // =====================
        // ログイン
        // =====================
        await signInWithEmailAndPassword(auth, email, password);
        // Mongo ユーザー保証は App.jsx の onAuthStateChanged に任せる
      } else {
        // =====================
        // サインアップ
        // =====================
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );

        const firebaseUser = userCredential.user;

        try {
          // MongoDB ユーザー作成（必須）
          await axios.post(`${API_URL}/users`, {
            _id: firebaseUser.uid,
            name: email.split("@")[0],
            email: firebaseUser.email,
          });
        } catch (mongoErr) {
          // 🔥 Mongo 登録失敗 → Firebase ロールバック
          console.error("Mongo user creation failed:", mongoErr);

          if (auth.currentUser) {
            await auth.currentUser.delete();
          }

          throw new Error("ユーザー作成に失敗しました");
        }
      }
    } catch (error) {
      console.warn("Auth error:", error.code || error.message);

      let message = "登録またはログインに失敗しました";

      if (isLogin) {
        // ログイン時（列挙されない表現）
        if (
          error.code === "auth/invalid-credential" ||
          error.code === "auth/user-not-found" ||
          error.code === "auth/wrong-password"
        ) {
          message = "メールアドレスまたはパスワードが正しくありません";
        }
      } else {
        // サインアップ時
        if (error.code === "auth/email-already-in-use") {
          message =
            "すでにアカウントをお持ちの可能性があります。ログインをお試しください。";
        }
      }

      alert(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* ロゴ */}
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
                disabled={loading}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-purple-300"
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
                disabled={loading}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-purple-300"
              />
            </div>

            {/* ボタン */}
            <button
              onClick={handleAuth}
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-lg rounded-2xl shadow-lg flex items-center justify-center gap-3 disabled:opacity-70"
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
                disabled={loading}
                className="text-purple-600 font-medium hover:underline"
              >
                {isLogin
                  ? "アカウントをお持ちでない方はこちら"
                  : "すでにアカウントをお持ちの方はログイン"}
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-gray-500 text-sm mt-10">
          © 2025 Your Chat App. All rights reserved.
        </p>
      </div>
    </div>
  );
}
