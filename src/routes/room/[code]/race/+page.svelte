<script lang="ts">
	import { gameState } from '$lib/stores/game.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { getRoomState, sendAction } from '$lib/api';
	import { calcWpm, calcAccuracy } from '$lib/utils/wpm';
	import { Crown, RotateCcw, LogOut } from 'lucide-svelte';

	let typedText = $state('');
	let currentIndex = $state(0);
	let correctChars = $state(0);
	let errors = $state(0);
	let elapsedMs = $state(0);
	let hiddenInput: HTMLInputElement = $state() as unknown as HTMLInputElement;
	let lastProgressEmit = $state(0);
	let racePhase = $state<'countdown' | 'racing' | 'results'>('countdown');
	let countdownValue = $state(3);
	let startTime = $state(0);
	let timerInterval: ReturnType<typeof setInterval> | undefined;
	let pollingInterval: ReturnType<typeof setInterval> | undefined;

	const raceText = $derived(gameState.raceText);
	const totalChars = $derived(raceText.length);

	const progress = $derived(
		racePhase === 'racing' ? Math.round((currentIndex / totalChars) * 100) : 0
	);
	const wpm = $derived(calcWpm(correctChars, elapsedMs));
	const accuracy = $derived(calcAccuracy(correctChars, currentIndex));

	const elapsedDisplay = $derived.by(() => {
		const s = Math.floor(elapsedMs / 1000);
		const m = Math.floor(s / 60);
		const sec = s % 60;
		return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
	});

	function renderTrack(pct: number): string {
		const filled = Math.round(pct / 5);
		const empty = 20 - filled;
		return '\u2588'.repeat(filled) + '\u2591'.repeat(empty);
	}

	async function handleInput(e: Event) {
		if (racePhase !== 'racing') return;
		const input = e.target as HTMLInputElement;
		const val = input.value;
		if (val.length <= currentIndex) {
			typedText = val;
			currentIndex = val.length;
			return;
		}

		const newChar = val[currentIndex];
		if (newChar === undefined) return;

		if (newChar === raceText[currentIndex]) {
			correctChars++;
		} else {
			errors++;
		}
		currentIndex++;
		typedText = val;

		if (currentIndex === totalChars) {
			await sendAction(gameState.roomCode, {
				type: 'finish_race',
				playerId: gameState.playerId,
				wpm,
				accuracy,
			});
			return;
		}

		const now = Date.now();
		if (now - lastProgressEmit >= 100) {
			lastProgressEmit = now;
			sendAction(gameState.roomCode, {
				type: 'progress_update',
				playerId: gameState.playerId,
				progress: Math.round((currentIndex / totalChars) * 100),
				wpm,
				accuracy,
			});
		}
	}

	$effect(() => {
		if (racePhase === 'racing') {
			hiddenInput?.focus();
		}
	});

	async function handleRematch() {
		await sendAction(gameState.roomCode, { type: 'rematch_vote', playerId: gameState.playerId });
	}

	async function handleSurrender() {
		await sendAction(gameState.roomCode, { type: 'surrender', playerId: gameState.playerId });
	}

	async function handleLeave() {
		await sendAction(gameState.roomCode, { type: 'leave_room', playerId: gameState.playerId });
		goto('/');
	}

	onMount(() => {
		const code = $page.params.code;

		if (!code) return;
		pollingInterval = setInterval(async () => {
			const room = await getRoomState(code);
			if (!room) return;

			gameState.players = room.players;
			gameState.rematchVotes = room.rematchVotes;

			if (room.state === 'racing' && racePhase === 'countdown') {
				startTime = room.startTime || Date.now();
				racePhase = 'racing';
				gameState.roomState = 'racing';

				timerInterval = setInterval(() => {
					elapsedMs = Date.now() - startTime;
				}, 100);
			}

			if (room.state === 'countdown' && room.countdownStartedAt) {
				const remaining = Math.max(0, 3 - Math.floor((Date.now() - room.countdownStartedAt) / 1000));
				countdownValue = remaining;
				racePhase = 'countdown';
			}

			if (room.state === 'results' && racePhase !== 'results') {
				racePhase = 'results';
				if (timerInterval) clearInterval(timerInterval);
				gameState.roomState = 'results';
				const results = Array.from(room.players)
					.sort((a, b) => (a.position || 99) - (b.position || 99));
				gameState.results = results;
			}
		}, 100);

		return () => {
			if (timerInterval) clearInterval(timerInterval);
			if (pollingInterval) clearInterval(pollingInterval);
		};
	});
</script>

<div class="flex min-h-screen flex-col items-center px-4 py-6">
	{#if racePhase === 'countdown'}
		<div class="flex flex-col items-center justify-center flex-1 gap-4">
			<p class="text-lg uppercase text-[#555555]">get ready...</p>
			<p class="text-6xl font-bold text-[#7ab648]">{countdownValue}</p>
			{#if countdownValue === 0}
				<p class="text-xl text-[#7ab648]">SCOOT!</p>
			{/if}
		</div>

	{:else if racePhase === 'racing'}
		<div class="w-full max-w-2xl">
			<div class="flex items-center justify-between mb-4">
				<h1 class="text-lg font-bold text-[#7ab648]">SNAILTYPE</h1>
				<span class="text-sm text-[#f0f0f0]">{elapsedDisplay}</span>
			</div>

			<div class="border border-[#555555] p-3 mb-4 space-y-1.5">
				{#each gameState.players as player}
					{@const isMe = player.id === gameState.playerId}
					{@const track = renderTrack(player.finished ? 100 : player.progress)}
					<div class="flex items-center gap-2 text-sm" class:text-[#7ab648]={isMe} class:text-[#ef4444]={player.surrendered}>
						<span class="min-w-[12ch] truncate">{player.nickname}</span>
						<span>🐌{track}</span>
						<span class="min-w-[4ch] text-right">{player.finished ? 100 : player.progress}%</span>
						{#if player.surrendered}
							<span class="min-w-[9ch] text-right text-[#555555]">SURR</span>
						{:else}
							<span class="min-w-[9ch] text-right">{player.wpm}wpm</span>
						{/if}
					</div>
				{/each}
			</div>

			<div class="relative border border-[#555555] p-3 mb-4">
				<div class="text-sm leading-relaxed select-none whitespace-pre-wrap break-all">
					{#each raceText.split('') as char, i}
						{@const isTyped = i < currentIndex}
						{@const isCurrent = i === currentIndex}
						{@const isCorrect = isTyped && typedText[i] === char}
						{@const isWrong = isTyped && typedText[i] !== char}
						{@const displayChar = !isTyped && char === ' ' ? '\u00B7' : char}
						{#if isCurrent}
							<span class="text-[#f0f0f0] border-b border-[#f0f0f0] animate-pulse">{displayChar}</span>
						{:else}
							<span
								class:text-[#7ab648]={isCorrect}
								class:text-[#ef4444]={isWrong}
								class:text-[#555555]={!isTyped}
							>{displayChar}</span>
						{/if}
					{/each}
				</div>
			</div>

			<input
				type="text"
				bind:this={hiddenInput}
				oninput={handleInput}
				autocomplete="off"
				autocorrect="off"
				autocapitalize="off"
				spellcheck="false"
				value={typedText}
				class="opacity-0 absolute h-0 w-0 overflow-hidden"
			/>

			<div class="flex justify-center">
				<button
					onclick={handleSurrender}
					class="border border-[#555555] text-[#555555] px-3 py-1 text-xs uppercase hover:border-[#ef4444] hover:text-[#ef4444] transition-colors"
				>
					SURRENDER
				</button>
			</div>
		</div>

	{:else if racePhase === 'results'}
		<div class="flex flex-col items-center justify-center flex-1 gap-6">
			<div class="text-center">
				<h2 class="text-2xl font-bold text-[#7ab648]">race complete.</h2>
			</div>

			<div class="w-80 border border-[#555555] p-3 space-y-2">
				{#each gameState.results as player, i}
					<div class="flex items-center gap-2 text-sm" class:text-[#ef4444]={player.surrendered}>
						<span class="w-6">{i === 0 ? '\u{1F947}' : i === 1 ? '\u{1F948}' : i === 2 ? '\u{1F949}' : `${i + 1}.`}</span>
						<span class="flex-1 truncate">{player.nickname}</span>
						{#if player.surrendered}
							<span class="min-w-[12ch] text-right text-[#555555]">SURRENDERED</span>
						{:else}
							<span class="min-w-[6ch] text-right">{player.wpm} wpm</span>
							<span class="min-w-[5ch] text-right">{player.accuracy}%</span>
							<span class="min-w-[6ch] text-right">
								{player.finishTime ? (() => { const s = Math.floor((player.finishTime - startTime) / 1000); const m = Math.floor(s / 60); return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; })() : '--:--'}
							</span>
						{/if}
					</div>
				{/each}
			</div>

			<div class="text-xs text-[#555555] uppercase">rematch votes: {gameState.rematchVotes}/{gameState.players.length}</div>

			<div class="flex gap-3">
				<button
					onclick={handleRematch}
					class="flex items-center gap-2 border border-[#7ab648] text-[#7ab648] px-4 py-1.5 uppercase text-sm hover:bg-[#7ab648] hover:text-[#1e1e1e] transition-colors"
				>
					<RotateCcw class="w-3.5 h-3.5" /> rematch
				</button>
				<button
					onclick={handleLeave}
					class="flex items-center gap-2 border border-[#555555] text-[#555555] px-4 py-1.5 uppercase text-sm hover:border-[#ef4444] hover:text-[#ef4444] transition-colors"
				>
					<LogOut class="w-3.5 h-3.5" /> leave
				</button>
			</div>
		</div>
	{/if}
</div>
