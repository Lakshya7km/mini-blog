import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.PROD ? 'https://web-production-1a8896.up.railway.app' : '/';
const socket = io(SOCKET_URL, { autoConnect: false, transports: ['websocket', 'polling'] });

export default socket;
