import http from 'http';
import { handler } from './build/handler.js';
import { Server } from 'socket.io';
import { initSocketServer } from './src/lib/server/socket';

const server = http.createServer(handler);
const io = new Server(server, { cors: { origin: '*' } });
initSocketServer(io);

const port = process.env.PORT || 3000;
server.listen(port, () => {
	console.log(`SnailType running on http://localhost:${port}`);
});
