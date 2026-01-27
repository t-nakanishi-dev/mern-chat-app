// backend/server.js
const express = require("express");
const http = require("http");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config({ path: ".env" });

const socket = require("./socket/index");
const User = require("./models/User");
const Group = require("./models/Group");
const GroupMember = require("./models/GroupMember");
const Message = require("./models/Message");

const app = express();
app.use(
  cors({
    origin: "http://localhost:5173", // フロントのURL（必要なら）
    credentials: true, // Cookieを送るために超重要！！
  })
);
app.use(express.json());

// MongoDB接続
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error(err));

const server = http.createServer(app);

// Socket.IO初期化
socket.init(server);

console.log("Socket.IO server initialized");

// ==================== ルーティング ====================

// ここが大事！ require("./routes/xxx") の形で .js を書かない！！
const groupRoutes = require("./routes/groups");
const messageRoutes = require("./routes/message");
const userRoutes = require("./routes/user");
const authRoutes = require("./routes/auth"); // .js なしでOK！

// groupmembers は io を渡す特殊なルーター
const createGroupmemberRouter = require("./routes/groupmembers");
const groupmemberRoutes = createGroupmemberRouter(socket.getIo());

app.use("/api/groups", groupRoutes);
app.use("/api/groupmembers", groupmemberRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes); // これで完全に動く！！

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
