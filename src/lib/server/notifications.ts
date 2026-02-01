import nodemailer from 'nodemailer';
import { db } from './db';

interface WebhookConfig {
	url: string;
	headers?: Record<string, string>;
}

interface EmailConfig {
	to: string[];
	subject?: string;
}

type NotificationEvent = 'job_failed' | 'job_timeout' | 'job_recovered';

interface NotificationPayload {
	event: NotificationEvent;
	job: {
		id: string;
		name: string;
	};
	execution: {
		id: string;
		status: string;
		exitCode: number | null;
		startedAt: Date;
		finishedAt: Date | null;
	};
	timestamp: Date;
}

// Create SMTP transporter (lazy initialization)
let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
	if (transporter) return transporter;

	const host = process.env.SMTP_HOST;
	const port = parseInt(process.env.SMTP_PORT || '587');
	const user = process.env.SMTP_USER;
	const pass = process.env.SMTP_PASS;

	if (!host) {
		console.warn('[Notifications] SMTP not configured');
		return null;
	}

	transporter = nodemailer.createTransport({
		host,
		port,
		secure: port === 465,
		auth: user && pass ? { user, pass } : undefined
	});

	return transporter;
}

async function sendWebhook(config: WebhookConfig, payload: NotificationPayload): Promise<boolean> {
	try {
		const response = await fetch(config.url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...config.headers
			},
			body: JSON.stringify(payload)
		});

		if (!response.ok) {
			console.error(`[Notifications] Webhook failed: ${response.status} ${response.statusText}`);
			return false;
		}

		console.log(`[Notifications] Webhook sent to ${config.url}`);
		return true;
	} catch (err) {
		console.error('[Notifications] Webhook error:', err);
		return false;
	}
}

async function sendEmail(config: EmailConfig, payload: NotificationPayload): Promise<boolean> {
	const transport = getTransporter();
	if (!transport) {
		console.warn('[Notifications] Email skipped - SMTP not configured');
		return false;
	}

	const from = process.env.SMTP_FROM || 'kronos@localhost';
	const subject =
		config.subject ||
		`[Kronos] ${payload.event.replace('_', ' ').toUpperCase()}: ${payload.job.name}`;

	const html = `
		<h2>Kronos Notification</h2>
		<p><strong>Event:</strong> ${payload.event.replace('_', ' ')}</p>
		<p><strong>Job:</strong> ${payload.job.name}</p>
		<p><strong>Status:</strong> ${payload.execution.status}</p>
		<p><strong>Exit Code:</strong> ${payload.execution.exitCode ?? 'N/A'}</p>
		<p><strong>Started:</strong> ${payload.execution.startedAt.toISOString()}</p>
		<p><strong>Finished:</strong> ${payload.execution.finishedAt?.toISOString() ?? 'N/A'}</p>
		<p><strong>Time:</strong> ${payload.timestamp.toISOString()}</p>
		<hr>
		<p><small>Sent by Kronos Job Scheduler</small></p>
	`;

	try {
		await transport.sendMail({
			from,
			to: config.to.join(', '),
			subject,
			html
		});

		console.log(`[Notifications] Email sent to ${config.to.join(', ')}`);
		return true;
	} catch (err) {
		console.error('[Notifications] Email error:', err);
		return false;
	}
}

export async function sendNotification(
	event: NotificationEvent,
	jobId: string,
	executionId: string
): Promise<void> {
	// Get job and execution details
	const [job, execution] = await Promise.all([
		db.job.findUnique({ where: { id: jobId } }),
		db.execution.findUnique({ where: { id: executionId } })
	]);

	if (!job || !execution) {
		console.error('[Notifications] Job or execution not found');
		return;
	}

	// Find applicable notifications
	const notifications = await db.notification.findMany({
		where: {
			enabled: true
		}
	});

	const payload: NotificationPayload = {
		event,
		job: { id: job.id, name: job.name },
		execution: {
			id: execution.id,
			status: execution.status,
			exitCode: execution.exitCode,
			startedAt: execution.startedAt,
			finishedAt: execution.finishedAt
		},
		timestamp: new Date()
	};

	for (const notification of notifications) {
		// Check if this notification handles this event
		const events = JSON.parse(notification.events) as string[];
		if (!events.includes(event)) continue;

		// Check if this notification applies to this job
		const jobIds = JSON.parse(notification.jobIds) as string[];
		if (jobIds.length > 0 && !jobIds.includes(jobId)) continue;

		// Send notification
		const config = JSON.parse(notification.config);

		if (notification.type === 'webhook') {
			await sendWebhook(config as WebhookConfig, payload);
		} else if (notification.type === 'email') {
			await sendEmail(config as EmailConfig, payload);
		}
	}
}

// Test notification
export async function testNotification(
	notificationId: string
): Promise<{ success: boolean; error?: string }> {
	const notification = await db.notification.findUnique({
		where: { id: notificationId }
	});

	if (!notification) {
		return { success: false, error: 'Notification not found' };
	}

	const testPayload: NotificationPayload = {
		event: 'job_failed',
		job: { id: 'test', name: 'Test Job' },
		execution: {
			id: 'test-execution',
			status: 'failed',
			exitCode: 1,
			startedAt: new Date(),
			finishedAt: new Date()
		},
		timestamp: new Date()
	};

	const config = JSON.parse(notification.config);

	try {
		if (notification.type === 'webhook') {
			const success = await sendWebhook(config as WebhookConfig, testPayload);
			return { success };
		} else if (notification.type === 'email') {
			const success = await sendEmail(config as EmailConfig, testPayload);
			return { success };
		}
		return { success: false, error: 'Unknown notification type' };
	} catch (err) {
		return {
			success: false,
			error: err instanceof Error ? err.message : 'Unknown error'
		};
	}
}
