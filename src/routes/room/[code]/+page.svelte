<script lang="ts">
	import { gameState } from '$lib/stores/game.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { getRoomState, sendAction } from '$lib/api';
	import { Copy, Crown } from 'lucide-svelte';

	let copied = $state(false);
	let roomCode = $state($page.params.code);

	function copyCode() {
		navigator.clipboard.writeText(roomCode!);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}

	async function startRace() {
		await sendAction(roomCode!, { type: 'start_race', playerId: gameState.playerId });
	}

	async function leaveRoom() {
		await sendAction(roomCode!, { type: 'leave_room', playerId: gameState.playerId });
		goto('/');
	}

	function setTextLength(length: 'short' | 'medium' | 'long') {
		sendAction(roomCode!, { type: 'set_text_length', playerId: gameState.playerId, textLength: length });
	}

	function setError(msg: string) {
		gameState.error = msg;
		setTimeout(() => (gameState.error = ''), 4000);
	}

	onMount(() => {
		const pollingInterval = setInterval(async () => {
			const room = await getRoomState(roomCode!);
			if (!room) {
				setError('Room not found');
				clearInterval(pollingInterval);
				return;
			}

			gameState.isHost = room.hostId === gameState.playerId;
			gameState.hostId = room.hostId;
			gameState.players = room.players;
			gameState.rematchVotes = room.rematchVotes;
			gameState.textLength = room.textLength as 'short' | 'medium' | 'long';
			gameState.countdown = room.countdownStartedAt
				? Math.max(0, 3 - Math.floor((Date.now() - room.countdownStartedAt) / 1000))
				: 0;
			gameState.countdownStartedAt = room.countdownStartedAt;
			gameState.raceStartedAt = room.startTime;

			if (room.state === 'countdown') {
				gameState.roomState = 'countdown';
				gameState.raceText = room.text;
				goto(`/room/${roomCode!}/race`, { replaceState: true });
			}
		}, 500);

		return () => clearInterval(pollingInterval);
	});
</script>

<div class="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
	<div class="text-center">
		<h1 class="text-2xl font-bold text-[#7ab648]">SNAILTYPE</h1>
		<p class="mt-1 text-[#555555] text-xs">room: {$page.params.code}</p>
	</div>

	<button
		onclick={copyCode}
		class="flex items-center gap-2 border border-[#555555] text-[#f0f0f0] px-3 py-1 text-xs uppercase hover:border-[#7ab648] transition-colors"
	>
		<Copy class="w-3 h-3" />
		{copied ? 'copied!' : 'copy code'}
	</button>

	<div class="w-80 border border-[#555555] p-3">
		<p class="text-xs uppercase text-[#555555] mb-2">connected players:</p>
		{#each gameState.players as player}
			<div class="flex items-center gap-2 text-sm py-0.5">
				<span class="text-[#7ab648]">&gt;</span>
				<span>{player.nickname}</span>
				{#if player.id === gameState.hostId}
					<Crown class="w-3 h-3 text-[#7ab648]" />
				{/if}
			</div>
		{/each}
	</div>

	{#if gameState.isHost}
		<div class="flex flex-col items-center gap-3">
			<div class="flex gap-2 text-xs">
				<button
					onclick={() => setTextLength('short')}
					class="border border-[#555555] text-[#555555] px-3 py-1 uppercase hover:border-[#7ab648] hover:text-[#7ab648] transition-colors"
					class:border-[#7ab648]={gameState.textLength === 'short'}
					class:text-[#7ab648]={gameState.textLength === 'short'}
				>SHORT</button>
				<button
					onclick={() => setTextLength('medium')}
					class="border border-[#555555] text-[#555555] px-3 py-1 uppercase hover:border-[#7ab648] hover:text-[#7ab648] transition-colors"
					class:border-[#7ab648]={gameState.textLength === 'medium'}
					class:text-[#7ab648]={gameState.textLength === 'medium'}
				>MEDIUM</button>
				<button
					onclick={() => setTextLength('long')}
					class="border border-[#555555] text-[#555555] px-3 py-1 uppercase hover:border-[#7ab648] hover:text-[#7ab648] transition-colors"
					class:border-[#7ab648]={gameState.textLength === 'long'}
					class:text-[#7ab648]={gameState.textLength === 'long'}
				>LONG</button>
			</div>

			<button
				onclick={startRace}
				disabled={gameState.players.length < 2}
				class="border border-[#7ab648] text-[#7ab648] px-6 py-1.5 uppercase text-sm hover:bg-[#7ab648] hover:text-[#1e1e1e] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
			>
				START RACE
			</button>
		</div>
	{:else}
		<p class="text-[#555555] text-xs uppercase">waiting for host to start race...</p>
	{/if}

	{#if gameState.error}
		<p class="text-[#ef4444] text-xs uppercase">{gameState.error}</p>
	{/if}

	<button
		onclick={leaveRoom}
		class="border border-[#555555] text-[#555555] px-3 py-1 text-xs uppercase hover:border-[#ef4444] hover:text-[#ef4444] transition-colors"
	>
		LEAVE ROOM
	</button>
</div>
