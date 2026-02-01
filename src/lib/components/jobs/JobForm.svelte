<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import * as Tabs from '$lib/components/ui/tabs';
	import CronBuilder from './CronBuilder.svelte';
	import EnvVarsEditor from './EnvVarsEditor.svelte';

	interface Props {
		job?: {
			id: string;
			name: string;
			description: string | null;
			schedule: string;
			type: string;
			config: string;
			status: string;
			tags: string;
			timeout: number;
			retryPolicy: string;
			envVars: string;
		};
		action: string;
		error?: string;
	}

	let { job, action, error }: Props = $props();

	let name = $state(job?.name || '');
	let description = $state(job?.description || '');
	let schedule = $state(job?.schedule || '0 * * * *');
	let type = $state(job?.type || 'shell');
	let status = $state(job?.status || 'active');
	let timeout = $state(job?.timeout || 300000);
	let tags = $state<string[]>(job?.tags ? JSON.parse(job.tags) : []);
	let tagInput = $state('');

	// Config based on type
	let shellCommand = $state('');
	let shellWorkingDir = $state('');

	let httpUrl = $state('');
	let httpMethod = $state('GET');
	let httpHeaders = $state('{}');
	let httpBody = $state('');

	let dockerImage = $state('');
	let dockerCommand = $state('');

	// Retry policy
	let maxRetries = $state(0);
	let backoff = $state('fixed');
	let delayMs = $state(60000);

	// Env vars
	let envVars = $state<Record<string, string>>({});

	// Initialize from existing job
	$effect(() => {
		if (job?.config) {
			try {
				const config = JSON.parse(job.config);
				if (job.type === 'shell') {
					shellCommand = config.command || '';
					shellWorkingDir = config.workingDir || '';
				} else if (job.type === 'http') {
					httpUrl = config.url || '';
					httpMethod = config.method || 'GET';
					httpHeaders = JSON.stringify(config.headers || {});
					httpBody = config.body || '';
				} else if (job.type === 'docker') {
					dockerImage = config.image || '';
					dockerCommand = (config.command || []).join(' ');
				}
			} catch {
				// Ignore parse errors
			}
		}
		if (job?.retryPolicy) {
			try {
				const policy = JSON.parse(job.retryPolicy);
				maxRetries = policy.maxRetries || 0;
				backoff = policy.backoff || 'fixed';
				delayMs = policy.delayMs || 60000;
			} catch {
				// Ignore parse errors
			}
		}
		if (job?.envVars) {
			try {
				envVars = JSON.parse(job.envVars);
			} catch {
				// Ignore parse errors
			}
		}
	});

	function getConfig(): string {
		if (type === 'shell') {
			return JSON.stringify({
				command: shellCommand,
				workingDir: shellWorkingDir || undefined,
				shell: '/bin/sh'
			});
		} else if (type === 'http') {
			return JSON.stringify({
				url: httpUrl,
				method: httpMethod,
				headers: httpHeaders ? JSON.parse(httpHeaders) : undefined,
				body: httpBody || undefined
			});
		} else if (type === 'docker') {
			return JSON.stringify({
				image: dockerImage,
				command: dockerCommand ? dockerCommand.split(' ') : undefined,
				remove: true
			});
		}
		return '{}';
	}

	function getRetryPolicy(): string {
		return JSON.stringify({ maxRetries, backoff, delayMs });
	}

	function addTag() {
		if (tagInput && !tags.includes(tagInput)) {
			tags = [...tags, tagInput];
			tagInput = '';
		}
	}

	function removeTag(tag: string) {
		tags = tags.filter((t) => t !== tag);
	}
</script>

<form method="POST" {action} use:enhance class="space-y-6">
	{#if error}
		<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
			{error}
		</div>
	{/if}

	<Card.Root>
		<Card.Header>
			<Card.Title>Basic Information</Card.Title>
		</Card.Header>
		<Card.Content class="space-y-4">
			<div class="space-y-2">
				<Label for="name">Name</Label>
				<Input id="name" name="name" bind:value={name} required />
			</div>

			<div class="space-y-2">
				<Label for="description">Description</Label>
				<Input id="description" name="description" bind:value={description} />
			</div>

			<CronBuilder value={schedule} onchange={(v) => (schedule = v)} />
			<input type="hidden" name="schedule" value={schedule} />

			<div class="space-y-2">
				<Label>Tags</Label>
				<div class="flex gap-2">
					<Input
						bind:value={tagInput}
						placeholder="Add tag"
						onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
					/>
					<Button type="button" variant="secondary" onclick={addTag}>Add</Button>
				</div>
				{#if tags.length > 0}
					<div class="flex flex-wrap gap-2 mt-2">
						{#each tags as tag}
							<span
								class="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-sm"
							>
								{tag}
								<button type="button" onclick={() => removeTag(tag)} class="hover:text-destructive">
									x
								</button>
							</span>
						{/each}
					</div>
				{/if}
				<input type="hidden" name="tags" value={JSON.stringify(tags)} />
			</div>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Job Type</Card.Title>
		</Card.Header>
		<Card.Content>
			<Tabs.Root bind:value={type}>
				<Tabs.List>
					<Tabs.Trigger value="shell">Shell</Tabs.Trigger>
					<Tabs.Trigger value="http">HTTP</Tabs.Trigger>
					<Tabs.Trigger value="docker">Docker</Tabs.Trigger>
				</Tabs.List>

				<Tabs.Content value="shell" class="space-y-4 pt-4">
					<div class="space-y-2">
						<Label for="shellCommand">Command</Label>
						<Input
							id="shellCommand"
							bind:value={shellCommand}
							placeholder="echo 'Hello World'"
							class="font-mono"
						/>
					</div>
					<div class="space-y-2">
						<Label for="shellWorkingDir">Working Directory (optional)</Label>
						<Input id="shellWorkingDir" bind:value={shellWorkingDir} placeholder="/home/user" />
					</div>
				</Tabs.Content>

				<Tabs.Content value="http" class="space-y-4 pt-4">
					<div class="grid grid-cols-4 gap-4">
						<div class="col-span-1 space-y-2">
							<Label for="httpMethod">Method</Label>
							<select
								id="httpMethod"
								bind:value={httpMethod}
								class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
							>
								<option value="GET">GET</option>
								<option value="POST">POST</option>
								<option value="PUT">PUT</option>
								<option value="DELETE">DELETE</option>
								<option value="PATCH">PATCH</option>
							</select>
						</div>
						<div class="col-span-3 space-y-2">
							<Label for="httpUrl">URL</Label>
							<Input id="httpUrl" bind:value={httpUrl} placeholder="https://api.example.com" />
						</div>
					</div>
					<div class="space-y-2">
						<Label for="httpHeaders">Headers (JSON)</Label>
						<Input
							id="httpHeaders"
							bind:value={httpHeaders}
							placeholder='{"Content-Type": "application/json"}'
							class="font-mono"
						/>
					</div>
					{#if httpMethod !== 'GET'}
						<div class="space-y-2">
							<Label for="httpBody">Body</Label>
							<textarea
								id="httpBody"
								bind:value={httpBody}
								placeholder='{"key": "value"}'
								class="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
							></textarea>
						</div>
					{/if}
				</Tabs.Content>

				<Tabs.Content value="docker" class="space-y-4 pt-4">
					<div class="space-y-2">
						<Label for="dockerImage">Image</Label>
						<Input id="dockerImage" bind:value={dockerImage} placeholder="alpine:latest" />
					</div>
					<div class="space-y-2">
						<Label for="dockerCommand">Command (optional)</Label>
						<Input
							id="dockerCommand"
							bind:value={dockerCommand}
							placeholder="echo 'Hello from Docker'"
							class="font-mono"
						/>
					</div>
				</Tabs.Content>
			</Tabs.Root>
			<input type="hidden" name="type" value={type} />
			<input type="hidden" name="config" value={getConfig()} />
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Advanced Settings</Card.Title>
		</Card.Header>
		<Card.Content class="space-y-4">
			<div class="grid grid-cols-2 gap-4">
				<div class="space-y-2">
					<Label for="timeout">Timeout (ms)</Label>
					<Input id="timeout" name="timeout" type="number" bind:value={timeout} min="1000" max="3600000" />
				</div>
				<div class="space-y-2">
					<Label for="status">Status</Label>
					<select
						id="status"
						name="status"
						bind:value={status}
						class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
					>
						<option value="active">Active</option>
						<option value="paused">Paused</option>
					</select>
				</div>
			</div>

			<div class="space-y-2">
				<Label>Retry Policy</Label>
				<div class="grid grid-cols-3 gap-4">
					<div class="space-y-2">
						<Label for="maxRetries" class="text-xs">Max Retries</Label>
						<Input id="maxRetries" type="number" bind:value={maxRetries} min="0" max="10" />
					</div>
					<div class="space-y-2">
						<Label for="backoff" class="text-xs">Backoff</Label>
						<select
							id="backoff"
							bind:value={backoff}
							class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
						>
							<option value="fixed">Fixed</option>
							<option value="exponential">Exponential</option>
						</select>
					</div>
					<div class="space-y-2">
						<Label for="delayMs" class="text-xs">Delay (ms)</Label>
						<Input id="delayMs" type="number" bind:value={delayMs} min="1000" max="3600000" />
					</div>
				</div>
			</div>
			<input type="hidden" name="retryPolicy" value={getRetryPolicy()} />

			<EnvVarsEditor bind:value={envVars} />
			<input type="hidden" name="envVars" value={JSON.stringify(envVars)} />
		</Card.Content>
	</Card.Root>

	<div class="flex gap-4">
		<Button type="submit">{job ? 'Update Job' : 'Create Job'}</Button>
		<Button type="button" variant="outline" href="/jobs">Cancel</Button>
	</div>
</form>
