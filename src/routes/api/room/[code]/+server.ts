import { json } from '@sveltejs/kit';
import { getRoomState, processAction } from '$lib/server/game';

export async function GET({ params }) {
	const room = getRoomState(params.code);
	if (!room) return json({ error: 'Room not found' }, { status: 404 });
	return json(room);
}

export async function POST({ params, request }) {
	const body = await request.json();
	const result = processAction(params.code, body);
	if ('error' in result) return json(result, { status: 400 });
	return json(result);
}
