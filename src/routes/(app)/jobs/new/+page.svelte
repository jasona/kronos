<script lang="ts">
	import JobForm from '$lib/components/jobs/JobForm.svelte';

	let { form } = $props();
</script>

<svelte:head>
	<title>Create Job - Kronos</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="text-3xl font-bold tracking-tight">Create Job</h1>
		<p class="text-muted-foreground">Create a new scheduled job</p>
	</div>

	<JobForm action="?/default" error={form?.error} />
</div>
