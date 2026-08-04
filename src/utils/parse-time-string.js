/**
 * Parse a time string like "11:50PM", "11:50 PM", or "23:50".
 *
 * @param {string} input
 * @returns {{ hours: number, minutes: number }}
 */
export function parseTimeString(input) {
  if (typeof input !== 'string' || !input.trim()) {
    throw new Error('Time is required');
  }

  const trimmed = input.trim().toUpperCase();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/);

  if (!match) {
    throw new Error(`Invalid time format: "${input}". Use formats like 11:50PM or 23:50`);
  }

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3];

  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    throw new Error(`Invalid time: "${input}"`);
  }

  if (minutes < 0 || minutes > 59) {
    throw new Error(`Invalid minutes in time: "${input}"`);
  }

  if (meridiem) {
    if (hours < 1 || hours > 12) {
      throw new Error(`Invalid 12-hour time: "${input}"`);
    }

    if (meridiem === 'AM') {
      hours = hours === 12 ? 0 : hours;
    } else {
      hours = hours === 12 ? 12 : hours + 12;
    }
  } else if (hours < 0 || hours > 23) {
    throw new Error(`Invalid 24-hour time: "${input}"`);
  }

  return { hours, minutes };
}
