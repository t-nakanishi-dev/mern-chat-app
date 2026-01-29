// frontend/src/components/layout/Layout.jsx
import React, { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { getAuth, signOut } from "firebase/auth";

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const auth = getAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("ログアウトエラー:", error);
    }
  };

  const getPageTitle = () => {
    switch (location.pathname) {
      case "/groups":
        return "チャット一覧";
      case "/profile":
        return "プロフィール";
      case "/admin":
        return "アドミン";
      case "/socket":
        return "ソケットテスト";
      default:
        if (location.pathname.startsWith("/groups/")) return "チャット";
        return "Chat App";
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* サイドバー */}
      <aside
        className={`
    bg-white border-r border-gray-300 shadow-md transition-all duration-300 ease-in-out
    ${sidebarOpen ? "w-64 px-6 py-4" : "w-0"}
    overflow-hidden flex-shrink-0
    z-50                         
  `}
      >
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-bold text-gray-800 whitespace-nowrap">
            Chat App
          </h2>
          <button
            onClick={() => setSidebarOpen(false)}
            className="hidden sm:block p-2 rounded hover:bg-gray-200 text-gray-600"
          >
            ←
          </button>
        </div>

        <nav className="space-y-1">
          <Link
            to="/groups"
            className="block px-3 py-2 rounded-md hover:bg-gray-100 text-gray-700 font-medium"
          >
            Groups
          </Link>
          <Link
            to="/profile"
            className="block px-3 py-2 rounded-md hover:bg-gray-100 text-gray-700 font-medium"
          >
            Profile
          </Link>
          <Link
            to="/admin"
            className="block px-3 py-2 rounded-md hover:bg-gray-100 text-gray-700 font-medium"
          >
            Admin
          </Link>
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 rounded-md hover:bg-red-50 text-red-600 font-medium"
          >
            Logout
          </button>
        </nav>
      </aside>

      {/* メインエリア */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* ヘッダー */}
        <header className="bg-white px-4 h-14 border-b border-gray-300 shadow-sm flex items-center">
          {/* 常に表示されるハンバーガーボタン（閉じてても開けるように！） */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded hover:bg-gray-200 mr-3 sm:hidden"
          >
            ☰
          </button>

          {/* デスクトップでサイドバーが閉じているときに表示する開くボタン */}
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="hidden sm:flex items-center p-2 rounded hover:bg-gray-200 mr-3 text-gray-600"
            >
              ←
            </button>
          )}

          <h1 className="text-lg font-bold text-gray-800">{getPageTitle()}</h1>
        </header>

        {/* メインコンテンツ */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>

      {/* モバイル用オーバーレイ（サイドバー開いてる時だけ） */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 sm:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
