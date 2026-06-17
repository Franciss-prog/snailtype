import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { Server } from 'socket.io';
import { initSocketServer } from './src/lib/server/socket';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter()
		}),
		{
			name: 'socket-io',
			configureServer(server) {
				if (!server.httpServer) return;
				const io = new Server(server.httpServer, { cors: { origin: '*' } });
				initSocketServer(io);
			}
		}
	]
});
