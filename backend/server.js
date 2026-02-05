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

const allowedOrigins = [
  "http://localhost:5173",
  process.env.FRONTEND_URL ||
    "https://mern-chat-app-frontend-zg6x.onrender.com",
];

app.use(express.json()); 
app.use(express.urlencoded({ extended: true })); 

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// MongoDB接続
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error(err));

const server = http.createServer(app);

// Socket.IO初期化
socket.init(server);

// ==================== ルーティング ====================

const groupRoutes = require("./routes/groups");
const messageRoutes = require("./routes/message");
const userRoutes = require("./routes/user");
const authRoutes = require("./routes/auth"); 

// groupmembers は io を渡す特殊なルーター
const createGroupmemberRouter = require("./routes/groupmembers");
const groupmemberRoutes = createGroupmemberRouter(socket.getIo());

app.use("/api/groups", groupRoutes);
app.use("/api/groupmembers", groupmemberRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes); 

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
