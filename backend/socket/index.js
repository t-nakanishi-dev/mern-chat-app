// backend/socket/index.js
const Message = require("../models/Message");
const GroupMember = require("../models/GroupMember");

let io;
const userSockets = new Map(); // userId -> socket.id

const socketHandler = (socket) => {

  socket.on("joinGroup", ({ groupId, userId }) => {
    socket.userId = userId;
    // ユーザーIDをキーとしてソケットIDを保存
    userSockets.set(userId.toString(), socket.id);
    socket.join(groupId); // グループIDでのルーム参加も引き続き必要
  });

  socket.on("groupMessage", async (msg) => {
    const { group, senderId } = msg;
    try {
      const members = await GroupMember.find({ groupId: group }).lean();
      members.forEach((member) => {
        if (member.isBanned) return;
        if (member.isMuted && member.userId.toString() !== senderId) return;

        const targetSocketId =
          member.userId.toString() === senderId && member.isMuted
            ? socket.id
            : userSockets.get(member.userId.toString());

        if (targetSocketId) {
          io.to(targetSocketId).emit("message_received", {
            groupId: group,
            message: msg,
            selfOnly: member.userId.toString() === senderId && member.isMuted,
          });
        }
      });
    } catch (err) {
      console.error("⚠️ Socket message error:", err);
    }
  });

  socket.on("readStatusUpdated", (updatedMessage) => {
    io.to(updatedMessage.group.toString()).emit(
      "readStatusUpdated",
      updatedMessage,
    );
  });

  socket.on("disconnect", () => {
    if (socket.userId) {
      // ユーザーIDをキーとしてマップから削除
      userSockets.delete(socket.userId.toString());
    }
  });
};

module.exports = {
  init: (httpServer) => {
    const { Server } = require("socket.io");
    io = new Server(httpServer, {
      cors: {
        origin: [
          "http://localhost:5173", 
          "https://mern-chat-app-frontend-zg6x.onrender.com", 
        ],
        methods: ["GET", "POST"],
        credentials: true, 
      },
    });

    io.on("connection", socketHandler);
    return io;
  },

  getIo: () => {
    if (!io) throw new Error("Socket.io not initialized!");
    return io;
  },

  // userSocketsマップをエクスポート
  userSockets: userSockets,

  emitRemovedFromGroup: (userId, groupId) => {
    const socketId = userSockets.get(userId.toString());
    if (socketId) {
      io.to(socketId).emit("removed_from_group", groupId.toString());
    }
  },
};
