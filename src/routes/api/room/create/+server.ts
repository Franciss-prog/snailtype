import { json } from '@sveltejs/kit';
import { createRoom } from '$lib/server/game';

export async function POST({ request }) {
	const body = await request.json();
	const nickname = body.nickname?.trim();
	if (!nickname) return json({ error: 'Nickname required' }, { status: 400 });

	const textLength = body.textLength || 'medium';
	const result = createRoom(nickname, textLength);
	return json(result);
}
