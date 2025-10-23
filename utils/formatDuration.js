/**
 * Format a duration in minutes into hours using the configured format.
 * @param {number} minutes Duration in minutes.
 * @param {{ compact?: boolean }} [options]
 * @returns {string}
 */
export function formatDuration(minutes, options = {}) {
  const totalMinutes = Number.isFinite(minutes) ? Math.max(minutes, 0) : 0;
  const compact = Boolean(options.compact);

  if (compact) {
    const safeMinutes = Math.round(totalMinutes);
    const hours = Math.floor(safeMinutes / 60);
    const remainingMinutes = safeMinutes % 60;
    const paddedMinutes = String(remainingMinutes).padStart(2, '0');
    return `${hours}:${paddedMinutes} h`;
  }

  const roundedHours = Math.round(totalMinutes / 6) / 10;
  return `${roundedHours.toFixed(1)} h`;
}

export function formatDurationWithMinutes(minutes, options = {}) {
  const base = formatDuration(minutes, options);
  return `${base} (${Math.round(Math.max(minutes, 0))} min)`;
}
