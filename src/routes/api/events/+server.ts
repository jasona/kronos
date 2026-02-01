import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';

// Event types
interface ExecutionEvent {
	type: 'execution_started' | 'execution_completed' | 'execution_failed';
	data: {
		executionId: string;
		jobId: string;
		jobName: string;
		status: string;
		timestamp: string;
	};
}

// Simple event emitter for SSE
class EventEmitter {
	private listeners: Set<(event: ExecutionEvent) => void> = new Set();

	subscribe(listener: (event: ExecutionEvent) => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	emit(event: ExecutionEvent): void {
		for (const listener of this.listeners) {
			listener(event);
		}
	}
}

export const eventEmitter = new EventEmitter();

// GET /api/events - SSE endpoint for real-time updates
export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		error(401, 'Unauthorized');
	}

	const encoder = new TextEncoder();

	const stream = new ReadableStream({
		start(controller) {
			// Send initial connection message
			controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`));

			// Send heartbeat every 30 seconds
			const heartbeat = setInterval(() => {
				try {
					controller.enqueue(encoder.encode(`: heartbeat\n\n`));
				} catch {
					clearInterval(heartbeat);
				}
			}, 30000);

			// Subscribe to events
			const unsubscribe = eventEmitter.subscribe((event) => {
				try {
					controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
				} catch {
					// Stream closed
				}
			});

			// Cleanup on close
			return () => {
				clearInterval(heartbeat);
				unsubscribe();
			};
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive'
		}
	});
};

// Helper function to emit execution events
export function emitExecutionEvent(
	type: ExecutionEvent['type'],
	execution: { id: string; jobId: string; status: string },
	jobName: string
): void {
	eventEmitter.emit({
		type,
		data: {
			executionId: execution.id,
			jobId: execution.jobId,
			jobName,
			status: execution.status,
			timestamp: new Date().toISOString()
		}
	});
}
