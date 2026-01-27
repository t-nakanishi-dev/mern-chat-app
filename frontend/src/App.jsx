// frontend/src/App.jsx
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import axios from "axios";

import Layout from "./components/layout/Layout";
import AuthPage from "./pages/AuthPage";
import GroupsPage from "./pages/GroupsPage";
import ChatPage from "./pages/ChatPage";
import Profile from "./components/ui/Profile";
import AdminPage from "./pages/AdminPage";
import SocketTest from "./pages/SocketTest";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // ===============================
          // ① Firebase ID Token取得
          // ===============================
          const idToken = await user.getIdToken();

          // ===============================
          // ② 自前JWT発行（既存処理）
          // ===============================
          try {
            await axios.post(
              `${API_URL}/auth/issue-jwt`,
              { idToken },
              { timeout: 6000 },
            );
            console.log("✅ 自前JWT発行成功");
          } catch (err) {
            console.log("⚠️ JWT発行スキップ（問題なし）", err.message);
          }

          // ===============================
          // ③ Mongoユーザー保証
          // ===============================
          try {
            await axios.get(`${API_URL}/users/${user.uid}`);
            console.log("👤 Mongoユーザー存在確認OK");
          } catch (err) {
            if (err.response?.status === 404) {
              console.log("🆕 Mongoユーザー未作成 → 作成します");

              await axios.post(`${API_URL}/users`, {
                _id: user.uid,
                name: user.displayName || user.email.split("@")[0],
                email: user.email,
              });

              console.log("✅ Mongoユーザー作成完了");
            } else {
              console.error("❌ Mongoユーザー確認失敗", err);
            }
          }
        } catch (err) {
          console.error("🔥 認証後処理でエラー", err);
        }
      }

      // ===============================
      // ④ 画面制御（今まで通り）
      // ===============================
      setIsLoggedIn(!!user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-500">
        Loading...
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            isLoggedIn ? <Navigate to="/groups" replace /> : <AuthPage />
          }
        />

        <Route element={isLoggedIn ? <Layout /> : <Navigate to="/" replace />}>
          <Route path="/groups" element={<GroupsPage />} />
          <Route path="/groups/:id" element={<ChatPage />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/socket" element={<SocketTest />} />
        </Route>

        <Route
          path="*"
          element={<Navigate to={isLoggedIn ? "/groups" : "/"} replace />}
        />
      </Routes>
    </Router>
  );
}

export default App;
