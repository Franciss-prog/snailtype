<script lang="ts">
	import { socket } from '$lib/socket';
	import { gameState } from '$lib/stores/game.svelte';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	let showJoinInput = $state(false);
	let nickname = $state('');
	let roomCode = $state('');
	let textLength = $state<'short' | 'medium' | 'long'>('medium');

	function handleError({ message }: { message: string }) {
		gameState.error = message;
		setTimeout(() => (gameState.error = ''), 4000);
	}

	function createRoom() {
		if (!nickname.trim()) return;
		gameState.nickname = nickname.trim();
		gameState.textLength = textLength;
		socket.emit('create_room', { nickname: nickname.trim(), textLength });
	}

	function joinRoom() {
		if (!nickname.trim() || !roomCode.trim()) return;
		gameState.nickname = nickname.trim();
		socket.emit('join_room', { nickname: nickname.trim(), code: roomCode.trim().toUpperCase() });
	}

	onMount(() => {
		socket.connect();
		socket.on('error', handleError);

		socket.on('room_created', ({ code }) => {
			gameState.isHost = true;
			gameState.roomCode = code;
			goto(`/room/${code}`);
		});

		socket.on('room_updated', ({ room }) => {
			gameState.isHost = room.hostId === socket.id;
			gameState.roomCode = room.code;
			gameState.players = room.players;
			gameState.rematchVotes = room.rematchVotes;
			goto(`/room/${room.code}`);
		});

		return () => {
			socket.off('error', handleError);
			socket.off('room_created');
			socket.off('room_updated');
		};
	});
</script>

<div class="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
	<div class="text-center">
		<h1 class="text-3xl font-bold text-[#7ab648]">SNAILTYPE</h1>
		<p class="mt-1 text-[#555555]">a realtime typing race</p>
	</div>

	<div class="flex flex-col gap-3 w-80">
		<input
			type="text"
			placeholder="nickname"
			maxlength="16"
			bind:value={nickname}
			class="w-full bg-[#2c2c2c] border border-[#555555] text-[#f0f0f0] px-3 py-1.5 focus:border-[#7ab648] outline-none uppercase text-sm"
		/>

		<div class="flex gap-2">
			<button
				onclick={createRoom}
				disabled={!nickname.trim()}
				class="flex-1 border border-[#7ab648] text-[#7ab648] px-4 py-1.5 uppercase text-sm hover:bg-[#7ab648] hover:text-[#1e1e1e] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
			>
				CREATE ROOM
			</button>
			<button
				onclick={() => (showJoinInput = !showJoinInput)}
				class="flex-1 border border-[#7ab648] text-[#7ab648] px-4 py-1.5 uppercase text-sm hover:bg-[#7ab648] hover:text-[#1e1e1e] transition-colors"
			>
				JOIN ROOM
			</button>
		</div>

		{#if showJoinInput}
			<div class="flex gap-2">
				<input
					type="text"
					placeholder="room code"
					maxlength="6"
					bind:value={roomCode}
					class="flex-1 bg-[#2c2c2c] border border-[#555555] text-[#f0f0f0] px-3 py-1.5 focus:border-[#7ab648] outline-none uppercase text-sm tracking-widest"
					oninput={() => (roomCode = roomCode.toUpperCase())}
				/>
				<button
					onclick={joinRoom}
					disabled={!nickname.trim() || !roomCode.trim()}
					class="border border-[#7ab648] text-[#7ab648] px-4 py-1.5 uppercase text-sm hover:bg-[#7ab648] hover:text-[#1e1e1e] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
				>
					JOIN
				</button>
			</div>
		{/if}

		{#if gameState.error}
			<p class="text-[#ef4444] text-xs uppercase text-center">{gameState.error}</p>
		{/if}
	</div>
</div>
