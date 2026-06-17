import { json } from '@sveltejs/kit';
import { joinRoom } from '$lib/server/game';

export async function POST({ request }) {
	const body = await request.json();
	const nickname = body.nickname?.trim();
	const code = body.code?.trim();

	if (!nickname) return json({ error: 'Nickname required' }, { status: 400 });
	if (!code) return json({ error: 'Room code required' }, { status: 400 });

	const result = joinRoom(code, nickname);
	if ('error' in result) return json(result, { status: 404 });
	return json(result);
}
