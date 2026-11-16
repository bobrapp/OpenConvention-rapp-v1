import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const context = vm.createContext({ window: {}, Intl });
vm.runInContext(fs.readFileSync(new URL('../calendar.js', import.meta.url), 'utf8'), context);
const parse = context.window.R4_CALENDAR.parse;
const event = (start, end, extra = '') => `BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nDTSTART${start}\r\nDTEND${end}\r\nSUMMARY:Synthetic\\, meeting\r\n${extra}END:VEVENT\r\nEND:VCALENDAR`;
assert.equal(parse(event(':20261114T090000Z', ':20261114T100000Z'))[0].start.toISOString(), '2026-11-14T09:00:00.000Z');
assert.equal(parse(event(':20261114T090000', ':20261114T100000'))[0].start.toISOString(), new Date(2026, 10, 14, 9).toISOString());
assert.equal(parse(event(';TZID=America/New_York:20261114T090000', ';TZID=America/New_York:20261114T100000'))[0].start.toISOString(), '2026-11-14T14:00:00.000Z');
assert.equal(parse(event(';TZID="Asia/Kathmandu":20261114T090000', ';TZID="Asia/Kathmandu":20261114T100000'))[0].start.toISOString(), '2026-11-14T03:15:00.000Z');
assert.equal(parse(event(';TZID=America/New_York:20260308T033000', ';TZID=America/New_York:20260308T043000'))[0].start.toISOString(), '2026-03-08T07:30:00.000Z');
assert.equal(parse(event(';TZID=America/New_York:20261101T023000', ';TZID=America/New_York:20261101T033000'))[0].start.toISOString(), '2026-11-01T07:30:00.000Z');
assert.equal(parse(event(';VALUE=DATE:20261114', ';VALUE=DATE:20261115')).length, 0);
assert.equal(parse('BEGIN:VCALENDAR\nEND:VCALENDAR').length, 0);
for (const value of [
  event(';TZID=America/New_York:20260308T023000', ';TZID=America/New_York:20260308T040000'),
  event(';TZID=America/New_York:20261101T013000', ';TZID=America/New_York:20261101T030000'),
  event(';TZID=Unknown/Zone:20261114T090000', ':20261114T100000Z'),
  event(':20260230T090000Z', ':20260301T100000Z'),
  event(':20261114T090000Z', ':20261114T080000Z'),
  event(':20261114T090000Z', ':20261114T100000Z', 'RRULE:FREQ=DAILY\r\n'),
  'BEGIN:VTIMEZONE\nEND:VTIMEZONE',
  event(':not-a-date', ':20261114T100000Z')
]) assert.throws(() => parse(value));
console.log('calendar: UTC, floating, IANA, fractional offsets, DST transitions, empty and unsupported cases passed (' + Intl.DateTimeFormat().resolvedOptions().timeZone + ')');
