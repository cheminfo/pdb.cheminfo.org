import { MISSING_VALUE } from 'react-cheminfo/core';

const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const relativeFormatter = new Intl.RelativeTimeFormat('en-US', {
  numeric: 'auto',
});

/**
 * Format an ISO timestamp as a short, locale-aware date+time, e.g.
 * `Apr 12, 2026, 14:23`. Returns an en-dash when the input is missing or
 * unparseable.
 * @param value - ISO timestamp.
 * @returns Formatted date+time, or `–`.
 */
export function formatDateTime(value: string | undefined): string {
  if (!value) return MISSING_VALUE;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return MISSING_VALUE;
  return dateTimeFormatter.format(date);
}

/**
 * Format the gap between an ISO timestamp and now as a human-readable
 * relative phrase such as "5 hours ago" or "yesterday". Returns an empty
 * string when the input is missing or unparseable.
 * @param value - ISO timestamp.
 * @returns Relative phrase ("5 hours ago", "yesterday", "in 3 days", …).
 */
export function formatRelative(value: string | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = date.getTime() - Date.now();
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 365 * 24 * 3600 * 1000],
    ['month', 30 * 24 * 3600 * 1000],
    ['day', 24 * 3600 * 1000],
    ['hour', 3600 * 1000],
    ['minute', 60 * 1000],
  ];
  for (const [unit, ms] of units) {
    if (Math.abs(diffMs) >= ms) {
      return relativeFormatter.format(Math.round(diffMs / ms), unit);
    }
  }
  return relativeFormatter.format(Math.round(diffMs / 1000), 'second');
}
