<script lang="ts">
	import { socket } from '$lib/socket';
	import { gameState } from '$lib/stores/game.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { Copy, Crown } from 'lucide-svelte';

	let copied = $state(false);
	let roomCode = $state($page.params.code);

	function copyCode() {
		navigator.clipboard.writeText(roomCode!);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}

	function startRace() {
		socket.emit('start_race');
	}

	function leaveRoom() {
		socket.emit('leave_room');
		goto('/');
	}

	function handleError({ message }: { message: string }) {
		gameState.error = message;
		setTimeout(() => (gameState.error = ''), 4000);
	}

	onMount(() => {
		socket.connect();
		socket.emit('join_room', { nickname: gameState.nickname, code: roomCode! });

		socket.on('error', handleError);
		socket.on('room_updated', ({ room }) => {
			gameState.isHost = room.hostId === socket.id;
			gameState.hostId = room.hostId;
			gameState.players = room.players;
			gameState.rematchVotes = room.rematchVotes;
			gameState.textLength = room.textLength;
		});
		socket.on('player_joined', ({ room }) => {
			gameState.players = room.players;
		});
		socket.on('player_left', ({ room }) => {
			gameState.players = room.players;
		});
		socket.on('countdown_started', ({ countdown }) => {
			gameState.countdown = countdown;
			gameState.roomState = 'countdown';
			goto(`/room/${roomCode!}/race`);
		});

		return () => {
			socket.off('error', handleError);
			socket.off('room_updated');
			socket.off('player_joined');
			socket.off('player_left');
			socket.off('countdown_started');
		};
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
					onclick={() => socket.emit('set_text_length', 'short')}
					class="border border-[#555555] text-[#555555] px-3 py-1 uppercase hover:border-[#7ab648] hover:text-[#7ab648] transition-colors"
					class:border-[#7ab648]={gameState.textLength === 'short'}
					class:text-[#7ab648]={gameState.textLength === 'short'}
				>SHORT</button>
				<button
					onclick={() => socket.emit('set_text_length', 'medium')}
					class="border border-[#555555] text-[#555555] px-3 py-1 uppercase hover:border-[#7ab648] hover:text-[#7ab648] transition-colors"
					class:border-[#7ab648]={gameState.textLength === 'medium'}
					class:text-[#7ab648]={gameState.textLength === 'medium'}
				>MEDIUM</button>
				<button
					onclick={() => socket.emit('set_text_length', 'long')}
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
