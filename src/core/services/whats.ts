import axios from 'axios';

const whatsApi = axios.create({
  baseURL: process.env.WHATS_API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Client-Token': process.env.WHATS_API_KEY,
  },
});

export default whatsApi;
