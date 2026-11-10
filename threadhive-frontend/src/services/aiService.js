import axiosInstance from '../api/axiosInstance';
import { AI_API } from '../config/apiConfig.js';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const rephraseText = async (text, field) => {
  const res = await axiosInstance.post(
    AI_API.REPHRASE,
    { text, field },
    { headers: getAuthHeaders() },
  );
  return res.data.data.rephrased;
};
