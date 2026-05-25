import axios from "axios";

const apiUrl = import.meta.env.VITE_API_URL || "";
const baseURL = apiUrl ? `${apiUrl}/api` : "/api";

export const api = axios.create({
  baseURL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Token ${token}`;
  }
  return config;
});
