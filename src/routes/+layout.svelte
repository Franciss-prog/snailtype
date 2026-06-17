<script lang="ts">
	import './layout.css';
	import '$lib/socket';
	import snail from '$lib/assets/snail.png';
	let { children } = $props();
</script>

<svelte:head><link rel="icon" href={snail} /></svelte:head>
{@render children()}
