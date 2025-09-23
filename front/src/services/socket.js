// src/services/socket.js
import { io } from "socket.io-client";
import api from "./api";

const guessFromAxios = () => {
  const b = api?.defaults?.baseURL || "";
  return b ? b.replace(/\/api\/?$/, "") : "";
};

const API_BASE =
  (process.env.REACT_APP_API_BASE_URL || "").replace(/\/$/, "") ||
  guessFromAxios() ||
  window.location.origin.replace(":3000", ":3001");

export const socket = io(API_BASE, {
  transports: ["websocket"],
  withCredentials: true,
});
