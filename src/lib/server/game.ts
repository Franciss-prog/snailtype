import { generateRoomCode } from '../utils/roomCode';
import { getRandomText } from '../utils/texts';

export type Player = {
	id: string;
	nickname: string;
	progress: number;
	wpm: number;
	accuracy: number;
	finished: boolean;
	finishTime: number | null;
	position: number | null;
	surrendered: boolean;
};

export type Room = {
	code: string;
	hostId: string;
	players: Map<string, Player>;
	state: 'waiting' | 'countdown' | 'racing' | 'results';
	text: string;
	textLength: 'short' | 'medium' | 'long';
	startTime: number | null;
	countdownStartedAt: number | null;
	rematchVotes: Set<string>;
};

export type RoomData = {
	code: string;
	hostId: string;
	state: string;
	text: string;
	textLength: 'short' | 'medium' | 'long';
	startTime: number | null;
	countdownStartedAt: number | null;
	players: Player[];
	rematchVotes: number;
};

const rooms = new Map<string, Room>();

let playerCounter = 0;
function generatePlayerId(): string {
	return `p${++playerCounter}_${Date.now().toString(36)}`;
}

function formatRoom(room: Room): RoomData {
	return {
		code: room.code,
		hostId: room.hostId,
		state: room.state,
		text: room.text,
		textLength: room.textLength,
		startTime: room.startTime,
		countdownStartedAt: room.countdownStartedAt,
		players: Array.from(room.players.values()),
		rematchVotes: room.rematchVotes.size,
	};
}

function removePlayerFromRoom(playerId: string) {
	for (const [_code, room] of rooms) {
		if (room.players.has(playerId)) {
			const player = room.players.get(playerId)!;
			room.players.delete(playerId);

			if (room.players.size === 0) {
				rooms.delete(_code);
				return { code: _code, player };
			}

			if (room.hostId === playerId) {
				const nextHost = room.players.values().next().value;
				if (nextHost) room.hostId = nextHost.id;
			}

			return { code: _code, player, room };
		}
	}
	return null;
}

export function createRoom(nickname: string, textLength: 'short' | 'medium' | 'long' = 'medium'): { code: string; playerId: string; room: RoomData } {
	const code = generateRoomCode();
	const playerId = generatePlayerId();
	const player: Player = {
		id: playerId,
		nickname: nickname.trim(),
		progress: 0,
		wpm: 0,
		accuracy: 100,
		finished: false,
		finishTime: null,
		position: null,
		surrendered: false,
	};
	const room: Room = {
		code,
		hostId: playerId,
		players: new Map([[playerId, player]]),
		state: 'waiting',
		text: '',
		textLength,
		startTime: null,
		countdownStartedAt: null,
		rematchVotes: new Set(),
	};
	rooms.set(code, room);
	return { code, playerId, room: formatRoom(room) };
}

export function joinRoom(code: string, nickname: string): { playerId: string; room: RoomData } | { error: string } {
	const room = rooms.get(code.toUpperCase());
	if (!room) return { error: 'Room not found' };
	if (room.state !== 'waiting') return { error: 'Race already in progress' };

	const playerId = generatePlayerId();
	const player: Player = {
		id: playerId,
		nickname: nickname.trim(),
		progress: 0,
		wpm: 0,
		accuracy: 100,
		finished: false,
		finishTime: null,
		position: null,
		surrendered: false,
	};
	room.players.set(playerId, player);
	return { playerId, room: formatRoom(room) };
}

export function getRoomState(code: string): RoomData | null {
	const room = rooms.get(code.toUpperCase());
	return room ? formatRoom(room) : null;
}

export type Action =
	| { type: 'start_race'; playerId: string }
	| { type: 'set_text_length'; playerId: string; textLength: 'short' | 'medium' | 'long' }
	| { type: 'leave_room'; playerId: string }
	| { type: 'progress_update'; playerId: string; progress: number; wpm: number; accuracy: number }
	| { type: 'finish_race'; playerId: string; wpm: number; accuracy: number }
	| { type: 'surrender'; playerId: string }
	| { type: 'rematch_vote'; playerId: string };

export function processAction(code: string, action: Action): { room: RoomData } | { error: string } {
	const room = rooms.get(code.toUpperCase());
	if (!room) return { error: 'Room not found' };

	const player = room.players.get(action.playerId);
	if (!player && action.type !== 'start_race' && action.type !== 'set_text_length') {
		return { error: 'Player not found in room' };
	}

	switch (action.type) {
		case 'set_text_length': {
			if (room.hostId !== action.playerId) return { error: 'Only host can set text length' };
			room.textLength = action.textLength;
			return { room: formatRoom(room) };
		}

		case 'start_race': {
			if (room.hostId !== action.playerId) return { error: 'Only host can start race' };
			if (room.players.size < 2) return { error: 'Need at least 2 players to start' };
			if (room.state !== 'waiting') return { error: 'Race already started' };

			room.text = getRandomText(room.textLength);
			room.state = 'countdown';
			room.countdownStartedAt = Date.now();
			room.startTime = null;

			for (const [, p] of room.players) {
				p.progress = 0;
				p.wpm = 0;
				p.accuracy = 100;
				p.finished = false;
				p.finishTime = null;
				p.position = null;
				p.surrendered = false;
			}

			setTimeout(() => {
				if (room.state === 'countdown') {
					room.state = 'racing';
					room.startTime = Date.now();
				}
			}, 3000);

			return { room: formatRoom(room) };
		}

		case 'leave_room': {
			const result = removePlayerFromRoom(action.playerId);
			if (result && result.room) {
				return { room: formatRoom(result.room) };
			}
			return { room: formatRoom(room) };
		}

		case 'progress_update': {
			if (room.state !== 'racing') return { room: formatRoom(room) };
			if (player!.finished) return { room: formatRoom(room) };
			player!.progress = action.progress;
			player!.wpm = action.wpm;
			player!.accuracy = action.accuracy;
			return { room: formatRoom(room) };
		}

		case 'finish_race': {
			if (room.state !== 'racing') return { room: formatRoom(room) };
			if (player!.finished) return { room: formatRoom(room) };

			const finishedPlayers = Array.from(room.players.values()).filter((p) => p.finished);
			player!.finished = true;
			player!.wpm = action.wpm;
			player!.accuracy = action.accuracy;
			player!.finishTime = Date.now();
			player!.position = finishedPlayers.length + 1;
			player!.progress = 100;

			const allFinished = Array.from(room.players.values()).every((p) => p.finished);
			if (allFinished) {
				room.state = 'results';
				const results = Array.from(room.players.values())
					.sort((a, b) => (a.position || 99) - (b.position || 99));
				return { room: formatRoom(room) };
			}

			setTimeout(() => {
				if (room.state === 'racing') {
					room.state = 'results';
				}
			}, 60000);

			return { room: formatRoom(room) };
		}

		case 'surrender': {
			if (room.state !== 'racing') return { room: formatRoom(room) };
			if (player!.finished) return { room: formatRoom(room) };

			const finishedPlayers = Array.from(room.players.values()).filter((p) => p.finished);
			player!.finished = true;
			player!.surrendered = true;
			player!.finishTime = Date.now();
			player!.position = finishedPlayers.length + 1;

			const allFinished = Array.from(room.players.values()).every((p) => p.finished);
			if (allFinished) {
				room.state = 'results';
				const results = Array.from(room.players.values())
					.sort((a, b) => (a.position || 99) - (b.position || 99));
			}

			return { room: formatRoom(room) };
		}

		case 'rematch_vote': {
			room.rematchVotes.add(action.playerId);

			if (room.rematchVotes.size >= room.players.size) {
				room.rematchVotes.clear();
				room.text = getRandomText(room.textLength);
				room.state = 'countdown';
				room.countdownStartedAt = Date.now();
				room.startTime = null;

				for (const [, p] of room.players) {
					p.progress = 0;
					p.wpm = 0;
					p.accuracy = 100;
					p.finished = false;
					p.finishTime = null;
					p.position = null;
					p.surrendered = false;
				}

				setTimeout(() => {
					if (room.state === 'countdown') {
						room.state = 'racing';
						room.startTime = Date.now();
					}
				}, 3000);
			}

			return { room: formatRoom(room) };
		}

		default:
			return { error: 'Unknown action type' };
	}
}
