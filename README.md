# 💬 MERN Chat App – チャットアプリ（リアルタイム通信対応）

## 🔗 デプロイURL
https://chat-app.onrender.com  
※スマートフォン・PCの両方に対応しています。

## 🔑 テストログイン
Email: test@gmail.com  
Password: test

## 📸 スクリーンショット
**ログイン画面**  
（ログインページのスクリーンショット）

**グループ一覧画面**  
（グループリストのスクリーンショット）

**チャット画面**  
（メッセージ送受信画面のスクリーンショット）

**管理者ページ**  
（グループ管理ページのスクリーンショット）

## 📝 アプリ概要
このアプリは、Firebase認証とSocket.ioによるリアルタイム通信を実現した  
フルスタックチャットアプリケーションです。  
ユーザー認証・グループ管理・メッセージ送受信・GIF投稿など、  
実運用を想定したチャット機能を包括的に実装しています。

## 🔧 使用技術
- **フロントエンド**：React, Vite, Tailwind CSS, React Router  
- **バックエンド**：Node.js, Express, Socket.io  
- **データベース**：MongoDB（Mongoose）  
- **認証 / ストレージ**：Firebase Auth, Firebase Storage  
- **外部API**：Giphy API（GIF投稿機能）  
- **ホスティング**：Render  

## ✨ 主な機能
- 🔐 **認証機能**：Firebase Authによるユーザーログイン・登録  
- 👥 **グループ管理**：作成、メンバー追加・削除、BAN/MUTE/ADMIN設定  
- 💬 **メッセージ機能**：テキスト・画像・PDF・GIFの送受信  
- 📡 **リアルタイム通信**：Socket.ioによるメッセージ・通知の即時反映  
- 🔍 **検索機能**：メッセージ・ファイル・GIFクエリ対応  
- 📱 **レスポンシブ対応**：スマホ・PC両対応レイアウト  

## 💡 工夫した点
- Socket.ioでリアルタイム同期を安定化  
- Firebase Storageでファイル・画像アップロードを安全に管理  
- Giphy API統合によるGIF検索投稿機能を実装  
- 状態管理をContext APIで統一  
- Tailwindでシンプルかつ使いやすいUIを構築  

## 👤 作者情報
- 名前：PiyoCode324  
- GitHub：[https://github.com/PiyoCode324](https://github.com/PiyoCode324)
