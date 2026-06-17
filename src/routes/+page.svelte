<script lang="ts">
	import { gameState } from '$lib/stores/game.svelte';
	import { goto } from '$app/navigation';
	import { createRoom, joinRoom } from '$lib/api';

	let showJoinInput = $state(false);
	let nickname = $state('');
	let roomCode = $state('');
	let textLength = $state<'short' | 'medium' | 'long'>('medium');

	function setError(msg: string) {
		gameState.error = msg;
		setTimeout(() => (gameState.error = ''), 4000);
	}

	async function handleCreateRoom() {
		if (!nickname.trim()) return;
		const result = await createRoom(nickname.trim(), textLength);
		if ('error' in result) {
			setError(result.error);
			return;
		}
		gameState.nickname = nickname.trim();
		gameState.playerId = result.playerId;
		gameState.roomCode = result.room.code;
		gameState.textLength = result.room.textLength as 'short' | 'medium' | 'long';
		gameState.isHost = true;
		gameState.hostId = result.room.hostId;
		gameState.players = result.room.players;
		goto(`/room/${result.room.code}`);
	}

	async function handleJoinRoom() {
		if (!nickname.trim() || !roomCode.trim()) return;
		const result = await joinRoom(nickname.trim(), roomCode.trim().toUpperCase());
		if ('error' in result) {
			setError(result.error);
			return;
		}
		gameState.nickname = nickname.trim();
		gameState.playerId = result.playerId;
		gameState.roomCode = result.room.code;
		gameState.textLength = result.room.textLength as 'short' | 'medium' | 'long';
		gameState.isHost = result.room.hostId === result.playerId;
		gameState.hostId = result.room.hostId;
		gameState.players = result.room.players;
		gameState.rematchVotes = result.room.rematchVotes;
		goto(`/room/${result.room.code}`);
	}
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
				onclick={handleCreateRoom}
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
					onclick={handleJoinRoom}
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
