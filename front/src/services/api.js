import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001/api', // porta do seu back-end
});

export default api;
