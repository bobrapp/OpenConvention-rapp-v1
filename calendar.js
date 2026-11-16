'use strict';
(() => {
  function parse(text) {
    if (typeof text !== 'string' || text.length > 2 * 1024 * 1024) throw new Error('Calendar exceeds 2 MiB');
    const lines = text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
    if (lines.includes('BEGIN:VTIMEZONE')) throw new Error('VTIMEZONE definitions are unsupported. Export UTC times or IANA TZIDs without custom definitions.');
    const events = []; let current = null;
    for (const line of lines) {
      if (line === 'BEGIN:VEVENT') current = {};
      else if (line === 'END:VEVENT') {
        if (current) events.push(current);
        if (events.length > 1000) throw new Error('Calendar exceeds 1000 events');
        current = null;
      } else if (current) {
        const colon = line.indexOf(':'); if (colon < 0) continue;
        const [name, ...params] = line.slice(0, colon).split(';');
        if (!Object.hasOwn(current, name)) current[name] = { value: line.slice(colon + 1), params: params.join(';') };
      }
    }
    const formatters = new Map();
    function date(field) {
      if (!field) throw new Error('Timed events require DTSTART and DTEND');
      const m = field.value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
      if (!m) throw new Error('Unsupported calendar date-time: use YYYYMMDDTHHMMSS with optional Z');
      const [year, month, day, hour, minute, second] = m.slice(1, 7).map(Number);
      const wall = Date.UTC(year, month - 1, day, hour, minute, second), nominal = new Date(wall);
      if (nominal.getUTCFullYear() !== year || nominal.getUTCMonth() !== month - 1 || nominal.getUTCDate() !== day || hour > 23 || minute > 59 || second > 59) throw new Error('Invalid calendar date-time');
      const tzid = field.params.match(/(?:^|;)TZID=(?:"([^"]+)"|([^;]+))/i);
      if (m[7]) { if (tzid) throw new Error('UTC calendar times must not specify TZID'); return nominal; }
      const zone = tzid ? tzid[1] || tzid[2] : Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (!formatters.has(zone)) {
        try { formatters.set(zone, new Intl.DateTimeFormat('en-US', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })); }
        catch { throw new Error('Unsupported calendar TZID: ' + zone + '. Export UTC or an IANA timezone.'); }
      }
      const parts = instant => Object.fromEntries(formatters.get(zone).formatToParts(new Date(instant)).filter(p => p.type !== 'literal').map(p => [p.type, Number(p.value)]));
      const offsets = new Set(), matches = new Set();
      for (let hours = -36; hours <= 36; hours += 6) {
        const instant = wall + hours * 3600000, p = parts(instant);
        offsets.add(Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - instant);
      }
      for (const offset of offsets) {
        const instant = wall - offset, p = parts(instant);
        if (p.year === year && p.month === month && p.day === day && p.hour === hour && p.minute === minute && p.second === second) matches.add(instant);
      }
      if (matches.size !== 1) throw new Error('Ambiguous or nonexistent calendar time in ' + zone + '. Export this event in UTC.');
      return new Date([...matches][0]);
    }
    const unescape = value => value.replace(/\\([,;\\])/g, '$1').replace(/\\n/gi, ' ');
    return events.flatMap(event => {
      if (/VALUE=DATE(?:;|$)/i.test(event.DTSTART?.params || '') || /^\d{8}$/.test(event.DTSTART?.value || '')) return [];
      if (['RRULE', 'RDATE', 'EXDATE', 'RECURRENCE-ID'].some(key => Object.hasOwn(event, key))) throw new Error('Recurring events are unsupported. Export expanded, individual events.');
      const start = date(event.DTSTART), end = date(event.DTEND);
      if (end <= start) throw new Error('Calendar event end must follow its start');
      return [{ title: unescape(event.SUMMARY?.value || 'busy'), start, end, location: unescape(event.LOCATION?.value || '') }];
    });
  }
  window.R4_CALENDAR = { parse };
})();
