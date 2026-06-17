import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
	kit: {
		adapter: adapter({
			runtime: 'nodejs22.x',
		}),
	},
	preprocess: vitePreprocess(),
};
