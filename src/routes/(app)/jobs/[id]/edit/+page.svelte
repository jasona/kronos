<script lang="ts">
	import JobForm from '$lib/components/jobs/JobForm.svelte';

	let { data, form } = $props();
</script>

<svelte:head>
	<title>Edit {data.job.name} - Kronos</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="text-3xl font-bold tracking-tight">Edit Job</h1>
		<p class="text-muted-foreground">Update job configuration</p>
	</div>

	<JobForm job={data.job} action="?/default" error={form?.error} />
</div>
