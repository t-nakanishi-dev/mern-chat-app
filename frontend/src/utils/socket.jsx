// src/utils/socket.js
import { io } from "socket.io-client";

const socket = io(import.meta.env.VITE_SOCKET_URL, {
  withCredentials: true, // credentials: true とペア
  transports: ["websocket", "polling"], // pollingが失敗してもwebsocketを試す
  reconnection: true,
  reconnectionAttempts: 5,
});

export default socket;
