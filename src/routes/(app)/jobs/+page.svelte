<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import * as Table from '$lib/components/ui/table';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Dialog from '$lib/components/ui/dialog';
	import { describeCron } from '$lib/utils/cron';

	let { data } = $props();

	let searchValue = $state(data.filters.search || '');
	let deleteDialogOpen = $state(false);
	let jobToDelete = $state<{ id: string; name: string } | null>(null);

	function formatDate(date: Date | string) {
		return new Date(date).toLocaleString();
	}

	function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
		switch (status) {
			case 'active':
				return 'default';
			case 'paused':
				return 'secondary';
			case 'success':
				return 'default';
			case 'failed':
				return 'destructive';
			case 'running':
				return 'outline';
			default:
				return 'secondary';
		}
	}

	function handleSearch() {
		const url = new URL($page.url);
		if (searchValue) {
			url.searchParams.set('search', searchValue);
		} else {
			url.searchParams.delete('search');
		}
		goto(url.toString());
	}

	function confirmDelete(job: { id: string; name: string }) {
		jobToDelete = job;
		deleteDialogOpen = true;
	}
</script>

<svelte:head>
	<title>Jobs - Kronos</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Jobs</h1>
			<p class="text-muted-foreground">Manage your scheduled jobs</p>
		</div>
		<Button href="/jobs/new">Create Job</Button>
	</div>

	<!-- Filters -->
	<div class="flex gap-4">
		<form onsubmit={handleSearch} class="flex gap-2">
			<Input
				type="search"
				placeholder="Search jobs..."
				bind:value={searchValue}
				class="w-64"
			/>
			<Button type="submit" variant="secondary">Search</Button>
		</form>

		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				<Button variant="outline">
					Status: {data.filters.status || 'All'}
				</Button>
			</DropdownMenu.Trigger>
			<DropdownMenu.Content>
				<DropdownMenu.Item href="?status=all">All</DropdownMenu.Item>
				<DropdownMenu.Item href="?status=active">Active</DropdownMenu.Item>
				<DropdownMenu.Item href="?status=paused">Paused</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</div>

	<!-- Jobs Table -->
	{#if data.jobs.length === 0}
		<div class="flex flex-col items-center justify-center py-12 text-center">
			<p class="text-muted-foreground">No jobs found</p>
			<Button href="/jobs/new" class="mt-4">Create your first job</Button>
		</div>
	{:else}
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head>Name</Table.Head>
					<Table.Head>Schedule</Table.Head>
					<Table.Head>Type</Table.Head>
					<Table.Head>Status</Table.Head>
					<Table.Head>Last Run</Table.Head>
					<Table.Head class="text-right">Actions</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each data.jobs as job}
					<Table.Row>
						<Table.Cell>
							<a href="/jobs/{job.id}" class="font-medium hover:underline">{job.name}</a>
							{#if job.description}
								<p class="text-sm text-muted-foreground">{job.description}</p>
							{/if}
							{#if job.tags.length > 0}
								<div class="mt-1 flex gap-1">
									{#each job.tags as tag}
										<Badge variant="outline" class="text-xs">{tag}</Badge>
									{/each}
								</div>
							{/if}
						</Table.Cell>
						<Table.Cell>
							<code class="text-sm">{job.schedule}</code>
							<p class="text-xs text-muted-foreground">{describeCron(job.schedule)}</p>
						</Table.Cell>
						<Table.Cell>
							<Badge variant="outline">{job.type}</Badge>
						</Table.Cell>
						<Table.Cell>
							<Badge variant={getStatusVariant(job.status)}>{job.status}</Badge>
						</Table.Cell>
						<Table.Cell>
							{#if job.lastExecution}
								<div class="space-y-1">
									<Badge variant={getStatusVariant(job.lastExecution.status)}>
										{job.lastExecution.status}
									</Badge>
									<p class="text-xs text-muted-foreground">
										{formatDate(job.lastExecution.startedAt)}
									</p>
								</div>
							{:else}
								<span class="text-muted-foreground">Never</span>
							{/if}
						</Table.Cell>
						<Table.Cell class="text-right">
							<DropdownMenu.Root>
								<DropdownMenu.Trigger>
									<Button variant="ghost" size="sm">...</Button>
								</DropdownMenu.Trigger>
								<DropdownMenu.Content align="end">
									<DropdownMenu.Item href="/jobs/{job.id}">View Details</DropdownMenu.Item>
									<DropdownMenu.Item href="/jobs/{job.id}/edit">Edit</DropdownMenu.Item>
									<DropdownMenu.Item href="/jobs/{job.id}/executions">
										Execution History
									</DropdownMenu.Item>
									<DropdownMenu.Separator />
									<form method="POST" action="?/toggleStatus" use:enhance>
										<input type="hidden" name="id" value={job.id} />
										<DropdownMenu.Item>
											<button type="submit" class="w-full text-left">
												{job.status === 'active' ? 'Pause' : 'Resume'}
											</button>
										</DropdownMenu.Item>
									</form>
									<DropdownMenu.Separator />
									<DropdownMenu.Item
										class="text-destructive"
										onclick={() => confirmDelete({ id: job.id, name: job.name })}
									>
										Delete
									</DropdownMenu.Item>
								</DropdownMenu.Content>
							</DropdownMenu.Root>
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	{/if}
</div>

<!-- Delete Confirmation Dialog -->
<Dialog.Root bind:open={deleteDialogOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Delete Job</Dialog.Title>
			<Dialog.Description>
				Are you sure you want to delete "{jobToDelete?.name}"? This action cannot be undone.
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (deleteDialogOpen = false)}>Cancel</Button>
			<form method="POST" action="?/delete" use:enhance>
				<input type="hidden" name="id" value={jobToDelete?.id} />
				<Button type="submit" variant="destructive" onclick={() => (deleteDialogOpen = false)}>
					Delete
				</Button>
			</form>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
