(() => {
  const id = new URLSearchParams(location.search).get('demo');
  const people = { maya: ['Maya Torres', 'social first-timer', 8], diego: ['Diego Alvarez', 'sales networker', 10], priya: ['Dr. Priya Natarajan', 'academic researcher', 8] };
  if (!people[id]) return;
  const [name, descriptor, count] = people[id], key = `r4companion.v1-demo-${id}`;
  if (!localStorage.getItem(key)) {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem(key, JSON.stringify({
      settings: { event: 'r4', start: today, days: 3, me: name, team: id === 'maya' ? 'Slalom Denver' : id === 'diego' ? 'Slalom Chicago' : 'University of Washington Information School', topics: ['ai governance', 'community', 'org change'], brand: 'slalom' },
      people: Array.from({ length: count }, (_, i) => ({ id: `demo-${id}-${i}`, name: `${['Avery','Lina','Marco','Nora','Sam','Tess','Jordan','Riley','Casey','Robin'][i]} ${['Brooks','Chen','Ruiz','Patel','Wilson','Morgan','Lee','Adams','Stone','Park'][i]}`, company: 'r4 community', role: 'practitioner', status: i < 3 ? 'target' : 'met', topics: ['ai governance', 'org change'], note: 'Demo notes', fu: { text: 'Follow up after the event', due: 'week', done: false }, day: 0 })),
      sessions: [{ id: `demo-${id}-keynote`, title: 'Oprah keynote', type: 'keynote', day: 0, start: '09:00', end: '10:00', room: 'Main hall', going: true, notes: 'Protect the headliner.', takeaways: ['Make room for human connection'] }],
      blocks: [{ id: `demo-${id}-writing`, title: 'Writing focus block', day: 0, start: '14:00', end: '15:00' }],
      goals: [{ id: `demo-${id}-goal`, text: 'Meet useful practitioners', target: 4, count: 2 }],
      pitches: [{ id: `demo-${id}-pitch`, name, topic: 'Responsible AI in practice', status: 'queued', sparked: false }],
    }));
    location.reload(); return;
  }
  const steps = ['Quick capture and AI parsing', 'People and goals', 'Agenda and focus block', 'Connection web', 'Pitch and report', 'Receipts and trust', 'Design and accessibility'];
  const mount = () => {
    if (document.querySelector('[data-demo-banner]')) return;
    const banner = document.createElement('div');
    banner.dataset.demoBanner = 'true'; banner.setAttribute('role', 'region'); banner.setAttribute('aria-label', 'demo mode');
    const exitUrl = new URL(location.href); exitUrl.searchParams.delete('demo');
    banner.innerHTML = `<b>demo · ${name}</b><span> · ${descriptor} · tour <b data-demo-progress>0/${steps.length}</b></span><button data-demo-tour>tour</button><a href="${exitUrl.pathname}${exitUrl.search}${exitUrl.hash}" data-demo-exit>exit demo</a>`;
    Object.assign(banner.style, { position: 'sticky', top: '0', zIndex: '40', display: 'flex', gap: '8px', flexWrap: 'wrap', padding: '8px 12px', background: 'var(--blue)', color: 'white' });
    document.body.prepend(banner);
    banner.querySelector('[data-demo-tour]').onclick = () => {
      const dialog = document.createElement('section'); dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'true'); dialog.dataset.demoTour = '';
      dialog.innerHTML = `<div style="position:fixed;inset:0;z-index:100;background:var(--bg);padding:20px;overflow:auto"><h2>${name} — ${descriptor}</h2><ol>${steps.map((s, i) => `<li><b>${s}</b><p>Why it matters for ${name}: practical event outcomes without losing focus.</p><button data-demo-show="${i}">show me</button><span data-demo-done="${i}"></span></li>`).join('')}</ol><button data-demo-reset>reset this demo</button><button data-demo-close>close tour</button></div>`;
      document.body.append(dialog);
      dialog.querySelectorAll('[data-demo-show]').forEach(b => b.onclick = () => { const i = +b.dataset.demoShow, tabs = [...document.querySelectorAll('[data-tab],[data-act="tab"]')]; tabs[i % Math.max(1, tabs.length)]?.click(); dialog.querySelector(`[data-demo-done="${i}"]`).textContent = ' ✓'; banner.querySelector('[data-demo-progress]').textContent = `${i + 1}/${steps.length}`; });
      dialog.querySelector('[data-demo-close]').onclick = () => dialog.remove();
      dialog.querySelector('[data-demo-reset]').onclick = () => { if (confirm('Reset this persona demo?')) { localStorage.removeItem(key); indexedDB.deleteDatabase(`r4-beacon-claude-demo-${id}`); location.reload(); } };
    };
    if (!sessionStorage.getItem(`r4-demo-tour-${id}`)) { sessionStorage.setItem(`r4-demo-tour-${id}`, '1'); setTimeout(() => banner.querySelector('[data-demo-tour]').click(), 300); }
  };
  addEventListener('load', mount); setTimeout(mount, 250);
})();
