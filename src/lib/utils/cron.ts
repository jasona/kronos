// Cron expression utilities

export interface CronParts {
	minute: string;
	hour: string;
	dayOfMonth: string;
	month: string;
	dayOfWeek: string;
}

export function parseCron(expression: string): CronParts | null {
	const parts = expression.trim().split(/\s+/);
	if (parts.length !== 5) return null;

	return {
		minute: parts[0],
		hour: parts[1],
		dayOfMonth: parts[2],
		month: parts[3],
		dayOfWeek: parts[4]
	};
}

export function buildCron(parts: CronParts): string {
	return `${parts.minute} ${parts.hour} ${parts.dayOfMonth} ${parts.month} ${parts.dayOfWeek}`;
}

const MONTHS = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December'
];

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function describeField(
	value: string,
	fieldName: string,
	names?: string[]
): string {
	if (value === '*') {
		return `every ${fieldName}`;
	}

	if (value.startsWith('*/')) {
		const interval = value.slice(2);
		return `every ${interval} ${fieldName}${parseInt(interval) > 1 ? 's' : ''}`;
	}

	if (value.includes(',')) {
		const values = value.split(',').map((v) => {
			const num = parseInt(v);
			return names ? names[num] || v : v;
		});
		return values.join(', ');
	}

	if (value.includes('-')) {
		const [start, end] = value.split('-').map((v) => {
			const num = parseInt(v);
			return names ? names[num] || v : v;
		});
		return `${start} through ${end}`;
	}

	const num = parseInt(value);
	if (names && !isNaN(num)) {
		return names[num] || value;
	}

	return value;
}

export function describeCron(expression: string): string {
	const parts = parseCron(expression);
	if (!parts) return 'Invalid cron expression';

	const { minute, hour, dayOfMonth, month, dayOfWeek } = parts;

	// Common patterns
	if (minute === '*' && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
		return 'Every minute';
	}

	if (minute === '0' && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
		return 'Every hour';
	}

	if (minute === '0' && hour === '0' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
		return 'Every day at midnight';
	}

	// Build description
	const descriptions: string[] = [];

	// Time
	if (minute !== '*' && hour !== '*') {
		const minVal = minute.startsWith('*/')
			? describeField(minute, 'minute')
			: `${minute.padStart(2, '0')}`;
		const hourVal = hour.startsWith('*/')
			? describeField(hour, 'hour')
			: `${hour.padStart(2, '0')}`;

		if (!minute.includes('*') && !hour.includes('*')) {
			descriptions.push(`At ${hourVal}:${minVal}`);
		} else {
			if (minute.startsWith('*/')) {
				descriptions.push(describeField(minute, 'minute'));
			}
			if (hour.startsWith('*/')) {
				descriptions.push(describeField(hour, 'hour'));
			}
		}
	} else if (minute !== '*') {
		if (minute.startsWith('*/')) {
			descriptions.push(describeField(minute, 'minute'));
		} else {
			descriptions.push(`At minute ${minute}`);
		}
	} else if (hour !== '*') {
		if (hour.startsWith('*/')) {
			descriptions.push(describeField(hour, 'hour'));
		} else {
			descriptions.push(`At ${hour}:00`);
		}
	}

	// Day of month
	if (dayOfMonth !== '*') {
		descriptions.push(`on day ${dayOfMonth} of the month`);
	}

	// Month
	if (month !== '*') {
		descriptions.push(`in ${describeField(month, 'month', MONTHS)}`);
	}

	// Day of week
	if (dayOfWeek !== '*') {
		descriptions.push(`on ${describeField(dayOfWeek, 'day', DAYS)}`);
	}

	if (descriptions.length === 0) {
		return 'Every minute';
	}

	return descriptions.join(' ');
}

// Validate cron expression
export function isValidCron(expression: string): boolean {
	const parts = parseCron(expression);
	if (!parts) return false;

	const validateField = (value: string, min: number, max: number): boolean => {
		if (value === '*') return true;
		if (value.startsWith('*/')) {
			const interval = parseInt(value.slice(2));
			return !isNaN(interval) && interval >= 1 && interval <= max;
		}
		if (value.includes(',')) {
			return value.split(',').every((v) => validateField(v, min, max));
		}
		if (value.includes('-')) {
			const [start, end] = value.split('-').map(Number);
			return !isNaN(start) && !isNaN(end) && start >= min && end <= max && start <= end;
		}
		const num = parseInt(value);
		return !isNaN(num) && num >= min && num <= max;
	};

	return (
		validateField(parts.minute, 0, 59) &&
		validateField(parts.hour, 0, 23) &&
		validateField(parts.dayOfMonth, 1, 31) &&
		validateField(parts.month, 1, 12) &&
		validateField(parts.dayOfWeek, 0, 6)
	);
}
