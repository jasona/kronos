import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';

export const load: PageServerLoad = async () => {
	const now = new Date();
	const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

	// Get job counts by status
	const [totalJobs, activeJobs, pausedJobs] = await Promise.all([
		db.job.count(),
		db.job.count({ where: { status: 'active' } }),
		db.job.count({ where: { status: 'paused' } })
	]);

	// Get running executions
	const runningJobs = await db.execution.count({
		where: { status: 'running' }
	});

	// Get executions in the last 24 hours
	const recentExecutions = await db.execution.findMany({
		where: {
			startedAt: { gte: yesterday }
		},
		select: {
			id: true,
			status: true,
			startedAt: true,
			finishedAt: true,
			jobId: true,
			job: {
				select: { name: true }
			}
		},
		orderBy: { startedAt: 'desc' }
	});

	const successCount = recentExecutions.filter((e) => e.status === 'success').length;
	const failedCount = recentExecutions.filter((e) => e.status === 'failed').length;
	const timeoutCount = recentExecutions.filter((e) => e.status === 'timeout').length;
	const total = recentExecutions.length;

	const successRate = total > 0 ? Math.round((successCount / total) * 100) : 100;

	// Get jobs with their last execution status for health overview
	const jobs = await db.job.findMany({
		include: {
			executions: {
				take: 1,
				orderBy: { startedAt: 'desc' },
				select: {
					status: true,
					startedAt: true,
					finishedAt: true
				}
			}
		},
		orderBy: { name: 'asc' }
	});

	// Categorize jobs by health
	const healthyJobs = jobs.filter(
		(j) => j.status === 'active' && j.executions[0]?.status === 'success'
	).length;
	const failingJobs = jobs.filter(
		(j) =>
			j.status === 'active' &&
			(j.executions[0]?.status === 'failed' || j.executions[0]?.status === 'timeout')
	).length;

	// Get recent executions for timeline (last 20)
	const recentTimeline = recentExecutions.slice(0, 20).map((e) => ({
		id: e.id,
		jobName: e.job.name,
		status: e.status,
		startedAt: e.startedAt,
		finishedAt: e.finishedAt,
		duration: e.finishedAt
			? new Date(e.finishedAt).getTime() - new Date(e.startedAt).getTime()
			: null
	}));

	// Job status overview
	const jobsOverview = jobs.map((j) => ({
		id: j.id,
		name: j.name,
		status: j.status,
		schedule: j.schedule,
		lastExecution: j.executions[0] || null
	}));

	return {
		stats: {
			totalJobs,
			activeJobs,
			pausedJobs,
			successRate,
			runningJobs,
			failedJobs: failedCount,
			timeoutJobs: timeoutCount,
			healthyJobs,
			failingJobs,
			executions24h: total
		},
		recentTimeline,
		jobsOverview
	};
};
