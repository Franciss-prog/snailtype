import type { RoomData, Action } from '$lib/server/game';

const BASE = '/api/room';

export async function createRoom(nickname: string, textLength?: string) {
	const res = await fetch(`${BASE}/create`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ nickname, textLength: textLength || 'medium' }),
	});
	return res.json() as Promise<{ code: string; playerId: string; room: RoomData } | { error: string }>;
}

export async function joinRoom(nickname: string, code: string) {
	const res = await fetch(`${BASE}/join`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ nickname, code }),
	});
	return res.json() as Promise<{ playerId: string; room: RoomData } | { error: string }>;
}

export async function getRoomState(code: string) {
	const res = await fetch(`${BASE}/${code}`);
	if (!res.ok) return null;
	return res.json() as Promise<RoomData>;
}

export async function sendAction(code: string, action: Action) {
	const res = await fetch(`${BASE}/${code}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(action),
	});
	return res.json() as Promise<{ room: RoomData } | { error: string }>;
}
