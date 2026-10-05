'use strict';

function toMinutes(hhmm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || '').trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** Minutes since midnight in the given IANA time zone. */
function minutesInZone(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const h = Number(parts.find((p) => p.type === 'hour').value);
  const m = Number(parts.find((p) => p.type === 'minute').value);
  return h * 60 + m;
}

/** True if `date` falls inside [start, end), handling windows that cross midnight. */
function isQuietTime(settings, timeZone, date = new Date()) {
  if (!settings.quiet_enabled) return false;
  const start = toMinutes(settings.quiet_start);
  const end = toMinutes(settings.quiet_end);
  if (start == null || end == null || start === end) return false;
  const now = minutesInZone(date, timeZone);
  return start < end ? now >= start && now < end : now >= start || now < end;
}

module.exports = { isQuietTime, toMinutes, minutesInZone };
