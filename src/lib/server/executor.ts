import { spawn } from 'child_process';
import { db } from './db';
import type { Job, Execution } from '@prisma/client/index';

interface ShellConfig {
	command: string;
	workingDir?: string;
	shell?: string;
}

interface HttpConfig {
	url: string;
	method: string;
	headers?: Record<string, string>;
	body?: string;
	timeout?: number;
}

interface DockerConfig {
	image: string;
	command?: string[];
	entrypoint?: string[];
	env?: Record<string, string>;
	volumes?: string[];
	network?: string;
	remove?: boolean;
}

interface RetryPolicy {
	maxRetries: number;
	backoff: 'fixed' | 'exponential';
	delayMs: number;
}

async function appendLog(
	executionId: string,
	stream: 'stdout' | 'stderr',
	content: string
): Promise<void> {
	await db.log.create({
		data: {
			executionId,
			stream,
			content
		}
	});
}

async function executeShell(
	config: ShellConfig,
	executionId: string,
	envVars: Record<string, string>,
	timeout: number
): Promise<{ exitCode: number; success: boolean }> {
	return new Promise((resolve) => {
		const shell = config.shell || '/bin/sh';
		const proc = spawn(shell, ['-c', config.command], {
			cwd: config.workingDir,
			env: { ...process.env, ...envVars },
			timeout
		});

		let stdout = '';
		let stderr = '';

		proc.stdout.on('data', (data) => {
			stdout += data.toString();
		});

		proc.stderr.on('data', (data) => {
			stderr += data.toString();
		});

		proc.on('close', async (code) => {
			// Save logs
			if (stdout) {
				await appendLog(executionId, 'stdout', stdout);
			}
			if (stderr) {
				await appendLog(executionId, 'stderr', stderr);
			}

			resolve({
				exitCode: code ?? 1,
				success: code === 0
			});
		});

		proc.on('error', async (err) => {
			await appendLog(executionId, 'stderr', `Process error: ${err.message}`);
			resolve({
				exitCode: 1,
				success: false
			});
		});

		// Handle timeout
		setTimeout(() => {
			if (!proc.killed) {
				proc.kill('SIGTERM');
				setTimeout(() => {
					if (!proc.killed) {
						proc.kill('SIGKILL');
					}
				}, 5000);
			}
		}, timeout);
	});
}

async function executeHttp(
	config: HttpConfig,
	executionId: string,
	envVars: Record<string, string>,
	timeout: number
): Promise<{ exitCode: number; success: boolean }> {
	try {
		// Replace environment variables in URL and body
		let url = config.url;
		let body = config.body;

		for (const [key, value] of Object.entries(envVars)) {
			const pattern = new RegExp(`\\$\\{${key}\\}|\\$${key}`, 'g');
			url = url.replace(pattern, value);
			if (body) {
				body = body.replace(pattern, value);
			}
		}

		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), config.timeout || timeout);

		const response = await fetch(url, {
			method: config.method,
			headers: config.headers,
			body: config.method !== 'GET' ? body : undefined,
			signal: controller.signal
		});

		clearTimeout(timeoutId);

		const responseText = await response.text();
		await appendLog(
			executionId,
			'stdout',
			`HTTP ${response.status} ${response.statusText}\n${responseText}`
		);

		return {
			exitCode: response.ok ? 0 : response.status,
			success: response.ok
		};
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		await appendLog(executionId, 'stderr', `HTTP request failed: ${message}`);
		return {
			exitCode: 1,
			success: false
		};
	}
}

async function executeDocker(
	config: DockerConfig,
	executionId: string,
	envVars: Record<string, string>,
	timeout: number
): Promise<{ exitCode: number; success: boolean }> {
	try {
		// Dynamic import for dockerode
		const Dockerode = (await import('dockerode')).default;
		const docker = new Dockerode();

		// Build environment array
		const env = Object.entries({ ...config.env, ...envVars }).map(
			([key, value]) => `${key}=${value}`
		);

		// Create container
		const container = await docker.createContainer({
			Image: config.image,
			Cmd: config.command,
			Entrypoint: config.entrypoint,
			Env: env,
			HostConfig: {
				Binds: config.volumes,
				NetworkMode: config.network,
				AutoRemove: config.remove !== false
			}
		});

		// Attach to get output
		const stream = await container.attach({
			stream: true,
			stdout: true,
			stderr: true
		});

		let stdout = '';
		let stderr = '';

		stream.on('data', (chunk: Buffer) => {
			// Docker multiplexes stdout/stderr in the stream
			// First 8 bytes are header: [stream_type, 0, 0, 0, size1, size2, size3, size4]
			const data = chunk.toString();
			stdout += data;
		});

		// Start container
		await container.start();

		// Wait for completion with timeout
		const result = await Promise.race([
			container.wait(),
			new Promise<{ StatusCode: number }>((_, reject) =>
				setTimeout(() => {
					container.stop().catch(() => {});
					reject(new Error('Container timeout'));
				}, timeout)
			)
		]);

		// Save logs
		if (stdout) {
			await appendLog(executionId, 'stdout', stdout);
		}
		if (stderr) {
			await appendLog(executionId, 'stderr', stderr);
		}

		return {
			exitCode: result.StatusCode,
			success: result.StatusCode === 0
		};
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		await appendLog(executionId, 'stderr', `Docker execution failed: ${message}`);
		return {
			exitCode: 1,
			success: false
		};
	}
}

export async function executeJob(job: Job, executionId: string): Promise<void> {
	const config = JSON.parse(job.config);
	const envVars = JSON.parse(job.envVars) as Record<string, string>;
	const retryPolicy = JSON.parse(job.retryPolicy) as RetryPolicy;

	let result: { exitCode: number; success: boolean };
	let attempt = 0;
	const maxAttempts = (retryPolicy.maxRetries || 0) + 1;

	while (attempt < maxAttempts) {
		attempt++;

		if (attempt > 1) {
			// Calculate delay for retry
			let delay = retryPolicy.delayMs || 60000;
			if (retryPolicy.backoff === 'exponential') {
				delay = delay * Math.pow(2, attempt - 2);
			}

			console.log(
				`[Executor] Retrying job ${job.id} (attempt ${attempt}/${maxAttempts}) after ${delay}ms`
			);
			await new Promise((resolve) => setTimeout(resolve, delay));

			// Create new execution for retry
			const retryExecution = await db.execution.create({
				data: {
					jobId: job.id,
					trigger: 'retry',
					status: 'running'
				}
			});
			executionId = retryExecution.id;
		}

		try {
			switch (job.type) {
				case 'shell':
					result = await executeShell(config as ShellConfig, executionId, envVars, job.timeout);
					break;
				case 'http':
					result = await executeHttp(config as HttpConfig, executionId, envVars, job.timeout);
					break;
				case 'docker':
					result = await executeDocker(config as DockerConfig, executionId, envVars, job.timeout);
					break;
				default:
					throw new Error(`Unknown job type: ${job.type}`);
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Unknown error';
			await appendLog(executionId, 'stderr', `Execution error: ${message}`);
			result = { exitCode: 1, success: false };
		}

		// Update execution record
		await db.execution.update({
			where: { id: executionId },
			data: {
				status: result.success ? 'success' : 'failed',
				exitCode: result.exitCode,
				finishedAt: new Date()
			}
		});

		if (result.success) {
			console.log(`[Executor] Job ${job.id} completed successfully`);
			break;
		}

		if (attempt >= maxAttempts) {
			console.log(`[Executor] Job ${job.id} failed after ${attempt} attempts`);
		}
	}
}

// Manual trigger function
export async function triggerJob(
	jobId: string
): Promise<{ executionId: string } | { error: string }> {
	const job = await db.job.findUnique({ where: { id: jobId } });
	if (!job) {
		return { error: 'Job not found' };
	}

	// Check for overlapping executions
	const runningExecution = await db.execution.findFirst({
		where: {
			jobId,
			status: 'running'
		}
	});

	if (runningExecution) {
		return { error: 'Job is already running' };
	}

	// Create execution record
	const execution = await db.execution.create({
		data: {
			jobId,
			trigger: 'manual',
			status: 'running'
		}
	});

	// Execute asynchronously
	executeJob(job, execution.id).catch((err) => {
		console.error(`[Executor] Error executing job ${jobId}:`, err);
	});

	return { executionId: execution.id };
}
