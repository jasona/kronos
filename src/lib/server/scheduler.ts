import cron from 'node-cron';
import { db } from './db';
import { executeJob } from './executor';

interface ScheduledJob {
	id: string;
	task: cron.ScheduledTask;
}

class Scheduler {
	private jobs: Map<string, ScheduledJob> = new Map();
	private running = false;
	private tickInterval: NodeJS.Timeout | null = null;

	async start(): Promise<void> {
		if (this.running) return;

		console.log('[Scheduler] Starting scheduler...');
		this.running = true;

		// Load all active jobs from database
		await this.loadJobs();

		// Start tick-based check for jobs (backup in case cron misses)
		this.tickInterval = setInterval(() => this.tick(), 60000); // Check every minute

		console.log(`[Scheduler] Started with ${this.jobs.size} jobs`);
	}

	async stop(): Promise<void> {
		if (!this.running) return;

		console.log('[Scheduler] Stopping scheduler...');
		this.running = false;

		// Stop tick interval
		if (this.tickInterval) {
			clearInterval(this.tickInterval);
			this.tickInterval = null;
		}

		// Stop all scheduled jobs
		for (const [id, job] of this.jobs) {
			job.task.stop();
			console.log(`[Scheduler] Stopped job ${id}`);
		}
		this.jobs.clear();

		console.log('[Scheduler] Stopped');
	}

	private async loadJobs(): Promise<void> {
		const jobs = await db.job.findMany({
			where: { status: 'active' }
		});

		for (const job of jobs) {
			this.scheduleJob(job.id, job.schedule);
		}
	}

	private scheduleJob(id: string, schedule: string): void {
		// Validate cron expression
		if (!cron.validate(schedule)) {
			console.error(`[Scheduler] Invalid cron expression for job ${id}: ${schedule}`);
			return;
		}

		// Stop existing task if any
		const existing = this.jobs.get(id);
		if (existing) {
			existing.task.stop();
		}

		// Create new scheduled task
		const task = cron.schedule(schedule, async () => {
			console.log(`[Scheduler] Triggering job ${id}`);
			await this.runJob(id, 'scheduled');
		});

		this.jobs.set(id, { id, task });
		console.log(`[Scheduler] Scheduled job ${id} with cron: ${schedule}`);
	}

	private unscheduleJob(id: string): void {
		const existing = this.jobs.get(id);
		if (existing) {
			existing.task.stop();
			this.jobs.delete(id);
			console.log(`[Scheduler] Unscheduled job ${id}`);
		}
	}

	private async tick(): Promise<void> {
		// This is a backup check - mainly for monitoring
		// The cron library handles the actual scheduling
		if (!this.running) return;

		// Check for any jobs that should be running
		const runningExecutions = await db.execution.findMany({
			where: { status: 'running' },
			include: { job: true }
		});

		for (const execution of runningExecutions) {
			const startTime = new Date(execution.startedAt).getTime();
			const elapsed = Date.now() - startTime;
			const timeout = execution.job.timeout;

			if (elapsed > timeout) {
				console.log(`[Scheduler] Job ${execution.jobId} execution ${execution.id} timed out`);
				await db.execution.update({
					where: { id: execution.id },
					data: {
						status: 'timeout',
						finishedAt: new Date()
					}
				});
			}
		}
	}

	async runJob(jobId: string, trigger: 'scheduled' | 'manual' | 'retry'): Promise<string | null> {
		const job = await db.job.findUnique({ where: { id: jobId } });
		if (!job) {
			console.error(`[Scheduler] Job ${jobId} not found`);
			return null;
		}

		if (job.status !== 'active' && trigger === 'scheduled') {
			console.log(`[Scheduler] Job ${jobId} is paused, skipping scheduled run`);
			return null;
		}

		// Check for overlapping executions
		const runningExecution = await db.execution.findFirst({
			where: {
				jobId,
				status: 'running'
			}
		});

		if (runningExecution) {
			console.log(`[Scheduler] Job ${jobId} is already running, skipping`);
			return null;
		}

		// Create execution record
		const execution = await db.execution.create({
			data: {
				jobId,
				trigger,
				status: 'running'
			}
		});

		console.log(`[Scheduler] Starting execution ${execution.id} for job ${jobId}`);

		// Execute the job asynchronously
		executeJob(job, execution.id).catch((err) => {
			console.error(`[Scheduler] Error executing job ${jobId}:`, err);
		});

		return execution.id;
	}

	// Dynamic job management
	async addJob(jobId: string): Promise<void> {
		const job = await db.job.findUnique({ where: { id: jobId } });
		if (!job) return;

		if (job.status === 'active') {
			this.scheduleJob(job.id, job.schedule);
		}
	}

	async updateJob(jobId: string): Promise<void> {
		const job = await db.job.findUnique({ where: { id: jobId } });
		if (!job) {
			this.unscheduleJob(jobId);
			return;
		}

		if (job.status === 'active') {
			this.scheduleJob(job.id, job.schedule);
		} else {
			this.unscheduleJob(jobId);
		}
	}

	async removeJob(jobId: string): Promise<void> {
		this.unscheduleJob(jobId);
	}

	// Health check
	getStatus(): {
		running: boolean;
		jobCount: number;
		jobs: Array<{ id: string; scheduled: boolean }>;
	} {
		return {
			running: this.running,
			jobCount: this.jobs.size,
			jobs: Array.from(this.jobs.entries()).map(([id]) => ({
				id,
				scheduled: true
			}))
		};
	}
}

// Singleton instance
export const scheduler = new Scheduler();

// Graceful shutdown
process.on('SIGTERM', async () => {
	console.log('[Scheduler] Received SIGTERM, shutting down...');
	await scheduler.stop();
});

process.on('SIGINT', async () => {
	console.log('[Scheduler] Received SIGINT, shutting down...');
	await scheduler.stop();
});
