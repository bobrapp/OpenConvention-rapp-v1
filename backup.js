'use strict';
(() => {
  const identifier = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(value) && !['__proto__', 'constructor', 'prototype'].includes(value);
  function validateIds(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Backup must be an object');
    let count = 0;
    function walk(value, depth) {
      if (++count > 100000 || depth > 30) throw new Error('Backup is too complex');
      if (!value || typeof value !== 'object') return;
      if (Array.isArray(value)) {
        const seen = new Set();
        value.forEach(item => {
          if (item && typeof item === 'object' && Object.hasOwn(item, 'id')) {
            if (!identifier(item.id) || seen.has(item.id)) throw new Error('Invalid or duplicate backup identifier');
            seen.add(item.id);
          }
        });
      }
      Object.entries(value).forEach(([key, item]) => {
        if (['__proto__', 'constructor', 'prototype'].includes(key) || (key === 'id' && !identifier(item))) throw new Error('Invalid backup identifier');
        walk(item, depth + 1);
      });
    }
    walk(data, 0);
    return data;
  }
  window.R4_BACKUP = { validateIds };
})();
