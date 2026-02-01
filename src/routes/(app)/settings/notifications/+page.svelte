<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Tabs from '$lib/components/ui/tabs';

	let { data, form } = $props();

	let createDialogOpen = $state(false);
	let notificationType = $state<'webhook' | 'email'>('webhook');
	let selectedEvents = $state<string[]>(['job_failed']);
	let selectedJobs = $state<string[]>([]);

	function toggleEvent(event: string) {
		if (selectedEvents.includes(event)) {
			selectedEvents = selectedEvents.filter((e) => e !== event);
		} else {
			selectedEvents = [...selectedEvents, event];
		}
	}

	function toggleJob(jobId: string) {
		if (selectedJobs.includes(jobId)) {
			selectedJobs = selectedJobs.filter((j) => j !== jobId);
		} else {
			selectedJobs = [...selectedJobs, jobId];
		}
	}

	function resetForm() {
		notificationType = 'webhook';
		selectedEvents = ['job_failed'];
		selectedJobs = [];
		createDialogOpen = false;
	}

	const eventOptions = [
		{ value: 'job_failed', label: 'Job Failed', description: 'When a job execution fails' },
		{ value: 'job_timeout', label: 'Job Timeout', description: 'When a job exceeds its timeout' },
		{ value: 'job_recovered', label: 'Job Recovered', description: 'When a previously failing job succeeds' }
	];
</script>

<svelte:head>
	<title>Notifications - Kronos</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Notifications</h1>
			<p class="text-muted-foreground">Configure alerts for job events</p>
		</div>
		<Button onclick={() => (createDialogOpen = true)}>Add Notification</Button>
	</div>

	{#if form?.error}
		<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
			{form.error}
		</div>
	{/if}

	{#if form?.message}
		<div class="rounded-md bg-green-500/10 p-3 text-sm text-green-600">
			{form.message}
		</div>
	{/if}

	<!-- Notifications List -->
	{#if data.notifications.length === 0}
		<Card.Root>
			<Card.Content class="flex flex-col items-center justify-center py-12">
				<p class="text-muted-foreground">No notifications configured</p>
				<Button class="mt-4" onclick={() => (createDialogOpen = true)}>
					Add your first notification
				</Button>
			</Card.Content>
		</Card.Root>
	{:else}
		<div class="space-y-4">
			{#each data.notifications as notification}
				<Card.Root>
					<Card.Header class="flex flex-row items-center justify-between space-y-0">
						<div>
							<Card.Title class="flex items-center gap-2">
								{notification.name}
								<Badge variant={notification.enabled ? 'default' : 'secondary'}>
									{notification.enabled ? 'Enabled' : 'Disabled'}
								</Badge>
								<Badge variant="outline">{notification.type}</Badge>
							</Card.Title>
							<Card.Description class="mt-1">
								{#if notification.type === 'webhook'}
									{notification.config.url}
								{:else if notification.type === 'email'}
									{notification.config.to.join(', ')}
								{/if}
							</Card.Description>
						</div>
						<div class="flex gap-2">
							<form method="POST" action="?/test" use:enhance>
								<input type="hidden" name="id" value={notification.id} />
								<Button type="submit" variant="outline" size="sm">Test</Button>
							</form>
							<form method="POST" action="?/toggle" use:enhance>
								<input type="hidden" name="id" value={notification.id} />
								<Button type="submit" variant="outline" size="sm">
									{notification.enabled ? 'Disable' : 'Enable'}
								</Button>
							</form>
							<form method="POST" action="?/delete" use:enhance>
								<input type="hidden" name="id" value={notification.id} />
								<Button type="submit" variant="destructive" size="sm">Delete</Button>
							</form>
						</div>
					</Card.Header>
					<Card.Content>
						<div class="flex flex-wrap gap-2">
							<span class="text-sm text-muted-foreground">Events:</span>
							{#each notification.events as event}
								<Badge variant="outline">{event.replace('_', ' ')}</Badge>
							{/each}
						</div>
						{#if notification.jobIds.length > 0}
							<div class="flex flex-wrap gap-2 mt-2">
								<span class="text-sm text-muted-foreground">Jobs:</span>
								{#each notification.jobIds as jobId}
									{@const job = data.jobs.find((j) => j.id === jobId)}
									<Badge variant="outline">{job?.name || jobId}</Badge>
								{/each}
							</div>
						{:else}
							<p class="text-sm text-muted-foreground mt-2">Applies to all jobs</p>
						{/if}
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
	{/if}
</div>

<!-- Create Dialog -->
<Dialog.Root bind:open={createDialogOpen} onOpenChange={(open) => !open && resetForm()}>
	<Dialog.Content class="max-w-2xl">
		<Dialog.Header>
			<Dialog.Title>Add Notification</Dialog.Title>
			<Dialog.Description>Configure a new notification channel</Dialog.Description>
		</Dialog.Header>

		<form method="POST" action="?/create" use:enhance={() => {
			return async ({ result, update }) => {
				if (result.type === 'success') {
					resetForm();
				}
				await update();
			};
		}}>
			<Tabs.Root bind:value={notificationType}>
				<Tabs.List class="mb-4">
					<Tabs.Trigger value="webhook">Webhook</Tabs.Trigger>
					<Tabs.Trigger value="email">Email</Tabs.Trigger>
				</Tabs.List>

				<input type="hidden" name="type" value={notificationType} />

				<div class="space-y-4">
					<div class="space-y-2">
						<Label for="name">Name</Label>
						<Input id="name" name="name" placeholder="My Notification" required />
					</div>

					<Tabs.Content value="webhook" class="space-y-4">
						<div class="space-y-2">
							<Label for="url">Webhook URL</Label>
							<Input id="url" name="url" type="url" placeholder="https://example.com/webhook" />
						</div>
						<div class="space-y-2">
							<Label for="headers">Headers (JSON, optional)</Label>
							<Input
								id="headers"
								name="headers"
								placeholder='{"Authorization": "Bearer token"}'
								class="font-mono"
							/>
						</div>
					</Tabs.Content>

					<Tabs.Content value="email" class="space-y-4">
						<div class="space-y-2">
							<Label for="to">Recipients (comma-separated)</Label>
							<Input id="to" name="to" type="text" placeholder="admin@example.com, team@example.com" />
						</div>
						<div class="space-y-2">
							<Label for="subject">Subject (optional)</Label>
							<Input id="subject" name="subject" placeholder="Custom subject line" />
						</div>
					</Tabs.Content>

					<!-- Events Selection -->
					<div class="space-y-2">
						<Label>Events</Label>
						<div class="grid gap-2">
							{#each eventOptions as event}
								<label class="flex items-center gap-2 p-2 border rounded-md cursor-pointer hover:bg-muted">
									<input
										type="checkbox"
										name="events"
										value={event.value}
										checked={selectedEvents.includes(event.value)}
										onchange={() => toggleEvent(event.value)}
									/>
									<div>
										<span class="font-medium">{event.label}</span>
										<p class="text-xs text-muted-foreground">{event.description}</p>
									</div>
								</label>
							{/each}
						</div>
					</div>

					<!-- Jobs Selection -->
					<div class="space-y-2">
						<Label>Apply to Jobs (leave empty for all)</Label>
						<div class="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
							{#each data.jobs as job}
								<label class="flex items-center gap-2 p-1 cursor-pointer hover:bg-muted rounded">
									<input
										type="checkbox"
										name="jobIds"
										value={job.id}
										checked={selectedJobs.includes(job.id)}
										onchange={() => toggleJob(job.id)}
									/>
									<span class="text-sm">{job.name}</span>
								</label>
							{/each}
							{#if data.jobs.length === 0}
								<p class="text-sm text-muted-foreground">No jobs available</p>
							{/if}
						</div>
					</div>
				</div>

				<Dialog.Footer class="mt-6">
					<Button type="button" variant="outline" onclick={() => (createDialogOpen = false)}>
						Cancel
					</Button>
					<Button type="submit">Create Notification</Button>
				</Dialog.Footer>
			</Tabs.Root>
		</form>
	</Dialog.Content>
</Dialog.Root>
