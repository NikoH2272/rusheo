(async () => {
  /* ── Helpers ── */
  const $ = (s, p = document) => p.querySelector(s);
  const $$ = (s, p = document) => [...p.querySelectorAll(s)];
  const esc = PYROCORE.esc;
  const { total, sortRows, hasTeam, generalRows, groupTag, getRules, safeUrl, ICONS } = PYROCORE;

  /* ── Logo serial → path ──────────────────────────
     Logos de equipos en assets/teams/{serial}.png
     Si no existe, se muestra la inicial del equipo.
  ──────────────────────────────────────────────── */
  const teamLogoPath = (serial) =>
    serial ? `assets/teams/${String(serial).padStart(3,'0')}.png` : null;

  /* ── Status labels ── */
  const STATUS_LABELS = {
    abierto:    { text: 'Inscripciones abiertas', cls: 'tag-green' },
    cerrado:    { text: 'Inscripciones cerradas', cls: 'tag-dim' },
    en_juego:   { text: 'En clasificación',       cls: 'tag-gold' },
    finalizado: { text: 'Finalizado',             cls: 'tag-dim' },
  };

  /* ── Countdown ── */
  let cdInterval = null;
  const countdown = (target, container) => {
    if (!target || isNaN(target.getTime()) || target < new Date()) return;
    const update = () => {
      const diff = target - new Date();
      if (diff <= 0) { clearInterval(cdInterval); container.innerHTML = ''; return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      container.innerHTML = [[d,'días'],[h,'hrs'],[m,'min'],[s,'seg']].map(([v,l]) =>
        `<div class="cd-block"><span class="cd-num">${String(v).padStart(2,'0')}</span><span class="cd-label">${l}</span></div>`
      ).join('');
    };
    update();
    cdInterval = setInterval(update, 1000);
  };

  /* ── Date formatting ── */
  const fmtDate = (d) => {
    if (!d) return '';
    const dt = new Date(d + 'T00:00:00');
    return dt.toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' });
  };
  const fmtDay = (d) => {
    if (!d) return { day: '—', mon: '' };
    const dt = new Date(d + 'T00:00:00');
    return { day: dt.getDate(), mon: dt.toLocaleDateString('es', { month: 'short' }).replace('.','') };
  };
  const fmtTime = (t) => {
    if (!t) return '';
    const [h,m] = t.split(':').map(Number);
    if (isNaN(h)) return t;
    return `${h % 12 || 12}:${String(m||0).padStart(2,'0')} ${h < 12 ? 'AM' : 'PM'} MX`;
  };

  /* ── Load data ── */
  let data = null;
  try {
    data = await PYROCORE.loadData();
  } catch (e) {
    const banner = $('#error-banner');
    banner.textContent = 'No se pudo cargar la información del torneo. Intenta más tarde.';
    banner.style.display = 'block';
    data = { tournament:{}, links:{}, prizes:[], schedule:[], results:[], sponsors:[] };
  }

  const t   = data.tournament || {};
  const lnk = data.links      || {};
  const sc  = (data.schedule  || []).filter(m => m.visible !== false);
  const res = data.results     || [];
  const spo = data.sponsors    || [];

  /* ══════════════════════════════════════════════
     HERO
  ════════════════════════════════════════════════ */
  const st = STATUS_LABELS[t.state] || STATUS_LABELS.abierto;
  const heroStatusEl = $('#hero-status');
  heroStatusEl.textContent = st.text;
  heroStatusEl.className = `tag ${st.cls}`;

  if (t.description) $('#hero-desc').textContent = t.description;
  if (t.startDate) {
    $('#hero-date').textContent = `Inicio: ${fmtDate(t.startDate)}`;
    const target = new Date(t.startDate + 'T' + (t.startTime || '00:00'));
    const cdEl = $('#hero-countdown');
    cdEl.style.display = '';
    countdown(target, cdEl);
  }

  /* ══════════════════════════════════════════════
     STATS
  ════════════════════════════════════════════════ */
  const allTeams = new Set();
  res.forEach(g => g.rows?.filter(hasTeam).forEach(r => allTeams.add(r.team.trim().toLowerCase())));
  const qualifiedTeams = new Set();
  res.forEach(g => {
    if (!g.qualify || g.kind === 'general') return;
    sortRows(g.rows.filter(hasTeam)).slice(0, g.qualify).forEach(r => qualifiedTeams.add(r.team.trim().toLowerCase()));
  });
  const nextMatch = sc.find(m => m.status === 'proximo' || m.status === 'envivo');
  const totalPrize = Array.isArray(data.prizes) ? data.prizes.reduce((s,p) => s + (Number(p.amount)||0), 0) : 0;

  $('#stat-teams').textContent    = allTeams.size    || (t.teamCount ? t.teamCount : '—');
  $('#stat-qualified').textContent= qualifiedTeams.size || '—';
  $('#stat-next').textContent     = nextMatch ? fmtDate(nextMatch.date) || 'Por anunciar' : '—';
  $('#stat-prize').textContent    = totalPrize ? `$${totalPrize.toLocaleString()}` : (t.prizePool || '—');

  /* ══════════════════════════════════════════════
     FORMAT / BRACKET
  ════════════════════════════════════════════════ */
  const PHASE_CONFIG = t.phases || [
    { name: 'Clasificatoria', teams: '32 equipos', status: 'active' },
    { name: 'Octavos',        teams: '16 equipos', status: 'pending' },
    { name: 'Cuartos',        teams: '8 equipos',  status: 'pending' },
    { name: 'Semifinal',      teams: '4 equipos',  status: 'pending' },
    { name: 'Gran Final',     teams: '2 equipos',  status: 'pending' },
  ];
  if (t.formatDescription) $('#format-desc').textContent = t.formatDescription;

  const bracket = $('#bracket');
  bracket.innerHTML = PHASE_CONFIG.map((ph, i) => {
    const cls = ph.status === 'done' ? 'done' : ph.status === 'active' ? 'active' : '';
    return `<div class="bracket-col" role="listitem">
      <div class="bracket-phase-label">${esc(ph.name)}</div>
      <div class="bracket-card ${cls}">
        <div class="bracket-card-name">${esc(ph.name)}</div>
        <div class="bracket-card-info">
          ${ph.teams ? `<span>${esc(ph.teams)}</span><br>` : ''}
          ${ph.date ? `<span>${fmtDate(ph.date)}</span><br>` : ''}
          ${ph.criteria ? `<span style="color:var(--gold)">${esc(ph.criteria)}</span>` : ''}
        </div>
      </div>
    </div>`;
  }).join('');

  /* ══════════════════════════════════════════════
     CALENDAR
  ════════════════════════════════════════════════ */
  const streamUrl = safeUrl(lnk.stream || lnk.youtube || lnk.twitch || '');
  const phases = [...new Set(sc.map(m => m.phase).filter(Boolean))];
  let activePhase = 'all';

  const filtersEl = $('#cal-filters');
  const calList   = $('#cal-list');
  const calEmpty  = $('#cal-empty');

  const renderCal = () => {
    const filtered = activePhase === 'all' ? sc : sc.filter(m => m.phase === activePhase);
    calList.innerHTML = '';
    if (!filtered.length) { calEmpty.hidden = false; return; }
    calEmpty.hidden = true;

    filtered.forEach(m => {
      const { day, mon } = fmtDay(m.date);
      const statusTag = m.status === 'envivo'
        ? `<span class="tag tag-gold" style="animation:pulse-border 1.5s infinite">EN VIVO</span>`
        : m.status === 'finalizado'
        ? `<span class="tag tag-dim">Finalizado</span>`
        : `<span class="tag tag-dim">Próximo</span>`;
      const li = document.createElement('div');
      li.className = `match-card status-${m.status}`;
      li.setAttribute('role', 'listitem');
      li.innerHTML = `
        <div class="mc-date">
          <div class="mc-date-day">${esc(String(day))}</div>
          <div class="mc-date-mon">${esc(mon)}</div>
        </div>
        <div class="mc-info">
          <div class="mc-info-phase">${esc(m.phase||'')}</div>
          <div class="mc-info-group">${esc(m.group||'Jornada')}</div>
          <div class="mc-info-meta">
            ${m.time ? `<span>${fmtTime(m.time)}</span>` : ''}
            ${m.rooms > 1 ? `<span>${m.rooms} salas</span>` : ''}
            ${m.note ? `<span>${esc(m.note)}</span>` : ''}
          </div>
        </div>
        <div class="mc-status">
          ${statusTag}
          ${m.rooms ? `<span class="mc-rooms">${m.rooms} sala${m.rooms>1?'s':''}</span>` : ''}
          ${streamUrl && m.status !== 'finalizado' ? `<a href="${esc(streamUrl)}" class="mc-link" target="_blank" rel="noopener">▶ Ver</a>` : ''}
        </div>`;
      calList.appendChild(li);
    });
  };

  if (phases.length) {
    const allBtn = document.createElement('button');
    allBtn.className = 'cal-filter-btn active'; allBtn.textContent = 'Todas';
    allBtn.addEventListener('click', () => {
      activePhase = 'all';
      $$('.cal-filter-btn').forEach(b => b.classList.remove('active'));
      allBtn.classList.add('active');
      renderCal();
    });
    filtersEl.appendChild(allBtn);
    phases.forEach(ph => {
      const btn = document.createElement('button');
      btn.className = 'cal-filter-btn'; btn.textContent = ph;
      btn.addEventListener('click', () => {
        activePhase = ph;
        $$('.cal-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderCal();
      });
      filtersEl.appendChild(btn);
    });
  }
  renderCal();

  /* ══════════════════════════════════════════════
     NEXT MATCH
  ════════════════════════════════════════════════ */
  const nmWrap = $('#next-match-wrap');
  if (nextMatch) {
    const nTarget = nextMatch.date ? new Date(nextMatch.date + 'T' + (nextMatch.time || '00:00')) : null;
    nmWrap.innerHTML = `<div class="next-card">
      <div class="next-kicker">Próxima jornada</div>
      <div class="next-title">${esc(nextMatch.phase || '')} · ${esc(nextMatch.group || 'Jornada')}</div>
      <div class="next-meta">
        ${nextMatch.date ? fmtDate(nextMatch.date) : ''}
        ${nextMatch.time ? ' · ' + fmtTime(nextMatch.time) : ''}
        ${nextMatch.rooms > 1 ? ` · ${nextMatch.rooms} salas` : ''}
      </div>
      <div id="next-countdown-wrap"></div>
      <div class="next-actions">
        <a href="#calendario" class="btn-primary">Ver calendario</a>
        ${streamUrl ? `<a href="${esc(streamUrl)}" class="btn-secondary" target="_blank" rel="noopener">▶ Transmisión</a>` : ''}
      </div>
    </div>`;
    if (nTarget && nTarget > new Date()) countdown(nTarget, $('#next-countdown-wrap'));
  } else {
    nmWrap.innerHTML = `<p style="color:var(--gray-dim)">No hay jornadas próximas programadas.</p>`;
  }

  /* ══════════════════════════════════════════════
     TEAMS
  ════════════════════════════════════════════════ */
  const teamsGrid = $('#teams-grid');
  const allTeamsList = [];
  res.forEach(g => {
    if (g.kind === 'general') return;
    g.rows?.filter(hasTeam).forEach(r => {
      if (!allTeamsList.find(x => x.team.toLowerCase() === r.team.trim().toLowerCase())) {
        allTeamsList.push({ team: r.team.trim(), group: g.title, phase: g.phase, logo_serial: r.logo_serial });
      }
    });
  });

  const teamGroups = [...new Set(allTeamsList.map(x => x.group).filter(Boolean))];
  const tfEl = $('#teams-filters');
  let activeGroup = 'all';

  const renderTeams = () => {
    const list = activeGroup === 'all' ? allTeamsList : allTeamsList.filter(x => x.group === activeGroup);
    teamsGrid.innerHTML = '';
    if (!list.length) {
      teamsGrid.innerHTML = `<div id="teams-empty" role="listitem">Sin equipos registrados aún.</div>`;
      return;
    }
    list.forEach(tm => {
      const logoPath = teamLogoPath(tm.logo_serial);
      const initial = (tm.team || '?')[0].toUpperCase();
      const card = document.createElement('div');
      card.className = 'team-card'; card.setAttribute('role', 'listitem');
      card.innerHTML = `
        <div class="team-logo-wrap">
          ${logoPath
            ? `<img src="${esc(logoPath)}" alt="${esc(tm.team)}" loading="lazy" onerror="this.parentElement.innerHTML='<span class=team-logo-initial>${initial}</span>'">`
            : `<span class="team-logo-initial">${initial}</span>`}
        </div>
        <div class="team-name">${esc(tm.team)}</div>
        ${tm.group ? `<div class="team-group">${esc(tm.group)}</div>` : ''}
        ${qualifiedTeams.has(tm.team.toLowerCase()) ? `<span class="tag tag-green" style="font-size:.58rem">Clasificado</span>` : ''}`;
      teamsGrid.appendChild(card);
    });
  };

  if (teamGroups.length) {
    const allBtn = document.createElement('button');
    allBtn.className = 'cal-filter-btn active'; allBtn.textContent = 'Todos';
    allBtn.addEventListener('click', () => {
      activeGroup = 'all';
      $$('#teams-filters .cal-filter-btn').forEach(b => b.classList.remove('active'));
      allBtn.classList.add('active');
      renderTeams();
    });
    tfEl.appendChild(allBtn);
    teamGroups.forEach(gr => {
      const btn = document.createElement('button');
      btn.className = 'cal-filter-btn'; btn.textContent = gr;
      btn.addEventListener('click', () => {
        activeGroup = gr;
        $$('#teams-filters .cal-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderTeams();
      });
      tfEl.appendChild(btn);
    });
  }
  renderTeams();

  /* ══════════════════════════════════════════════
     STANDINGS
  ════════════════════════════════════════════════ */
  const standingsTabs = $('#standings-tabs');
  const standingsWrap = $('#standings-wrap');
  const standingsEmpty = $('#standings-empty');
  let activeGroup2 = null;

  const renderStandings = (groupId) => {
    const group = res.find(g => g.id === groupId);
    if (!group) { standingsEmpty.hidden = false; return; }
    standingsEmpty.hidden = true;

    let rows;
    if (group.kind === 'general') {
      const genRows = generalRows(res, group.phase);
      rows = genRows.map((r,i) => ({ ...r, team: r.team || r.name, pos: i+1 }));
    } else {
      rows = sortRows(group.rows.filter(hasTeam)).map((r,i) => ({ ...r, pos: i+1 }));
    }

    const q = group.qualify || 0;
    const updatedAt = group.updated ? `<p class="standings-meta">Última actualización: ${group.updated}</p>` : '';
    const tableHtml = `
      <table class="standings" role="grid">
        <thead>
          <tr>
            <th>#</th>
            <th>Equipo</th>
            <th title="Kills">Kills</th>
            <th title="Puntos de posición">P.Pos</th>
            <th title="Penalización">Pen.</th>
            <th title="Total">Total</th>
          </tr>
        </thead>
        <tbody>
          ${rows.length ? rows.map(r => {
            const tot = total(r);
            const qCls = q && r.pos <= q ? 'qualify' : '';
            return `<tr class="${qCls}">
              <td><span class="pos-num">${r.pos}</span></td>
              <td>${esc(r.team)}</td>
              <td>${r.kills}</td>
              <td>${r.placement}</td>
              <td>${r.penalty ? `-${r.penalty}` : '0'}</td>
              <td style="font-weight:700;color:var(--gold)">${tot}</td>
            </tr>`;
          }).join('') : `<tr><td colspan="6" style="color:var(--gray-dim);text-align:center;padding:32px">Sin datos.</td></tr>`}
        </tbody>
      </table>
      ${updatedAt}`;

    const prev = standingsWrap.querySelector('table');
    if (prev) prev.remove();
    const pm = standingsWrap.querySelector('.standings-meta');
    if (pm) pm.remove();
    standingsWrap.insertAdjacentHTML('afterbegin', tableHtml);
  };

  if (res.length) {
    const standingsGroups = res.filter(g => g.rows?.filter(hasTeam).length > 0);
    if (!standingsGroups.length) { standingsEmpty.hidden = false; }
    else {
      standingsGroups.forEach((g, i) => {
        const btn = document.createElement('button');
        btn.className = `standings-tab${i===0?' active':''}`;
        btn.textContent = g.title || g.phase;
        btn.setAttribute('role', 'tab');
        btn.addEventListener('click', () => {
          $$('.standings-tab').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          renderStandings(g.id);
        });
        standingsTabs.appendChild(btn);
      });
      renderStandings(standingsGroups[0].id);
    }
  } else {
    standingsEmpty.hidden = false;
  }

  /* ══════════════════════════════════════════════
     PRIZES
  ════════════════════════════════════════════════ */
  const prizesEl = $('#prizes-content');
  const prizes = Array.isArray(data.prizes) ? data.prizes.filter(p => p.position || p.amount || p.description) : [];
  if (prizes.length >= 2) {
    $('#prizes-pending').remove();
    const sorted = [...prizes].sort((a,b) => (a.position||99)-(b.position||99));
    const medals = ['🥇','🥈','🥉'];
    const posLabel = ['1er Lugar','2do Lugar','3er Lugar'];
    const main3 = sorted.slice(0,3);
    const rest  = sorted.slice(3);
    const cards = main3.map((p,i) => {
      const isFst = i===0;
      return `<div class="prize-card ${isFst?'first':''}">
        <div class="prize-medal">${medals[i]||'🏆'}</div>
        <div class="prize-pos">${posLabel[i]}</div>
        <div class="prize-amount">${esc(p.amount ? `$${Number(p.amount).toLocaleString()}` : p.label || '—')}</div>
        ${p.description ? `<div class="prize-detail">${esc(p.description)}</div>` : ''}
      </div>`;
    }).join('');
    prizesEl.innerHTML = `<div class="prizes-grid">${
      main3.length===1 ? cards+`<div></div><div></div>` :
      main3.length===2 ? cards+`<div></div>` : cards
    }</div>`;
    if (rest.length) {
      prizesEl.insertAdjacentHTML('beforeend', `<div style="margin-top:20px;display:flex;gap:12px;flex-wrap:wrap">
        ${rest.map(p=>`<div class="prize-card" style="flex:1;min-width:160px">
          <div class="prize-pos">Puesto ${p.position||'—'}</div>
          <div class="prize-amount" style="font-size:1.4rem">${esc(p.amount?`$${Number(p.amount).toLocaleString()}`:p.label||'—')}</div>
          ${p.description?`<div class="prize-detail">${esc(p.description)}</div>`:''}
        </div>`).join('')}
      </div>`);
    }
  }

  /* ══════════════════════════════════════════════
     RULES
  ════════════════════════════════════════════════ */
  const rules = getRules(t);
  const rulesList  = $('#rules-list');
  const rulesExtra = $('#rules-extra');
  const rulesNote  = $('#rules-note');

  rulesList.innerHTML = rules.rules.map((r,i) => `
    <div class="accordion-item">
      <button class="accordion-btn" aria-expanded="false" data-acc="${i}">
        <span>${r.title ? `<strong>${esc(r.title)}</strong>` : `Regla ${i+1}`}</span>
        <span class="acc-icon">+</span>
      </button>
      <div class="accordion-body" id="acc-r-${i}">${r.title ? `<p>${esc(r.text)}</p>` : `<p>${esc(r.text)}</p>`}</div>
    </div>`).join('');

  const prohibBlock = rules.prohibited.length ? `<div class="accordion-item">
    <button class="accordion-btn" aria-expanded="false" data-acc="proh">
      <span>Prohibiciones</span><span class="acc-icon">+</span>
    </button>
    <div class="accordion-body" id="acc-proh">
      <ul class="acc-list">${rules.prohibited.map(p=>`<li>${esc(p)}</li>`).join('')}</ul>
    </div>
  </div>` : '';
  const clarBlock = rules.clarifications.length ? `<div class="accordion-item">
    <button class="accordion-btn" aria-expanded="false" data-acc="clar">
      <span>Aclaraciones</span><span class="acc-icon">+</span>
    </button>
    <div class="accordion-body" id="acc-clar">
      <ul class="acc-list">${rules.clarifications.map(c=>`<li>${esc(c)}</li>`).join('')}</ul>
    </div>
  </div>` : '';
  rulesExtra.innerHTML = prohibBlock + clarBlock;
  if (rules.note) rulesNote.textContent = `⚠ ${rules.note}`;

  document.addEventListener('click', e => {
    const btn = e.target.closest('.accordion-btn');
    if (!btn) return;
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!expanded));
    const body = btn.nextElementSibling;
    if (body?.classList.contains('accordion-body')) body.classList.toggle('open', !expanded);
  });

  /* ══════════════════════════════════════════════
     STREAM
  ════════════════════════════════════════════════ */
  if (streamUrl) {
    $('#stream-wrap').classList.remove('stream-hidden');
    $('#stream-empty').style.display = 'none';
    $('#stream-link').href = streamUrl;
    const isLive = sc.some(m => m.status === 'envivo');
    if (isLive) $('#stream-thumb').insertAdjacentHTML('afterbegin', `<div class="stream-live-dot">EN VIVO</div>`);
  }

  if (streamUrl) {
    const ns = $('#nav-stream-btn');
    ns.href = streamUrl; ns.hidden = false;
    const ms = $('#mobile-stream-btn');
    ms.href = streamUrl; ms.hidden = false;
  }

  /* ══════════════════════════════════════════════
     FAQ
  ════════════════════════════════════════════════ */
  const faqItems = [
    { q: '¿Cómo puedo participar?',           a: lnk.register ? `Inscríbete a través del enlace oficial: <a href="${safeUrl(lnk.register)}" target="_blank" rel="noopener" style="color:var(--gold)">Formulario de inscripción</a>` : 'Las inscripciones se anunciarán por los canales oficiales de Rusheo.' },
    { q: '¿Cuándo se juega el torneo?',        a: t.startDate ? `El torneo inicia el ${fmtDate(t.startDate)}. Consulta el calendario para ver todas las jornadas.` : 'Las fechas se publicarán próximamente. Sigue nuestras redes oficiales.' },
    { q: '¿Cómo consulto los resultados?',      a: 'Los resultados se actualizan en la sección Clasificación de esta misma página después de cada jornada.' },
    { q: '¿Cómo funciona la puntuación?',       a: 'La puntuación suma kills + puntos de posición, descontando penalizaciones. Consulta el reglamento para la fórmula oficial.' },
    { q: '¿Dónde consulto las reglas?',         a: 'En la sección Reglas de esta página encontrarás el reglamento completo y las aclaraciones.' },
    { q: '¿Cómo reportar una incidencia?',      a: lnk.discord ? `Repórtala en el servidor oficial de Discord: <a href="${safeUrl(lnk.discord)}" target="_blank" rel="noopener" style="color:var(--gold)">Acceder al Discord</a>` : 'Comunícate por los canales oficiales de Rusheo.' },
  ];
  $('#faq-list').innerHTML = faqItems.map((f,i) => `
    <div class="accordion-item">
      <button class="accordion-btn" aria-expanded="false" data-acc="faq-${i}">
        <span>${esc(f.q)}</span><span class="acc-icon">+</span>
      </button>
      <div class="accordion-body">${f.a}</div>
    </div>`).join('');

  /* ══════════════════════════════════════════════
     SOCIAL FOOTER
  ════════════════════════════════════════════════ */
  const ICON_YT     = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="14" rx="3"/><path d="m10 9 5 3-5 3V9z" fill="currentColor" stroke="none"/></svg>`;
  const ICON_TIKTOK = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.28 8.28 0 0 0 4.83 1.55V6.79a4.85 4.85 0 0 1-1.06-.1z"/></svg>`;
  const socials = [
    { key: 'instagram', icon: ICONS.instagram, label: 'Instagram' },
    { key: 'discord',   icon: ICONS.discord,   label: 'Discord' },
    { key: 'tiktok',    icon: ICON_TIKTOK,     label: 'TikTok' },
    { key: 'youtube',   icon: ICON_YT,         label: 'YouTube' },
    { key: 'whatsapp',  icon: ICONS.whatsapp,  label: 'WhatsApp' },
  ];
  const footerSocial = $('#footer-social');
  socials.forEach(s => {
    const url = safeUrl(lnk[s.key] || '');
    if (!url) return;
    footerSocial.insertAdjacentHTML('beforeend',
      `<a href="${esc(url)}" target="_blank" rel="noopener" aria-label="${esc(s.label)}">${s.icon}</a>`);
  });

  /* ══════════════════════════════════════════════
     PRÓXIMOS EVENTOS
  ════════════════════════════════════════════════ */
  const eventosGrid  = $('#eventos-grid');
  const eventosEmpty = $('#eventos-empty');
  const eventos = Array.isArray(t.eventos) ? t.eventos : [];
  if (eventos.length) {
    eventosEmpty.hidden = true;
    eventosGrid.innerHTML = eventos.map(ev => `
      <div class="evento-card">
        <div class="evento-card-top">
          <div class="evento-tag">${esc(ev.type || 'Evento')}</div>
          <div class="evento-name">${esc(ev.name)}</div>
          <div class="evento-date">${ev.date ? fmtDate(ev.date) : ''}${ev.time ? ' · ' + fmtTime(ev.time) : ''}</div>
        </div>
        <div class="evento-card-body">
          ${ev.description ? `<div class="evento-desc">${esc(ev.description)}</div>` : ''}
          ${safeUrl(ev.link) ? `<a href="${esc(safeUrl(ev.link))}" class="evento-card-link" target="_blank" rel="noopener">Ver más →</a>` : ''}
        </div>
      </div>`).join('');
  } else {
    eventosEmpty.hidden = false;
  }

  /* ══════════════════════════════════════════════
     ENTRENAMIENTOS
  ════════════════════════════════════════════════ */
  const trainLink = safeUrl(lnk.entrenamientos || lnk.training || '');
  const trainEl   = $('#train-link');
  if (trainLink) {
    trainEl.href = trainLink;
  } else {
    trainEl.style.display = 'none';
  }
  if (t.trainDescription) $('#train-desc').textContent = t.trainDescription;

  /* ══════════════════════════════════════════════
     NAVBAR ACTIVE + MOBILE MENU
  ════════════════════════════════════════════════ */
  const menuToggle = $('#menu-toggle');
  const mobileMenu = $('#mobile-menu');
  menuToggle.addEventListener('click', () => {
    const open = mobileMenu.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.textContent = open ? '✕' : '☰';
    document.body.style.overflow = open ? 'hidden' : '';
  });
  $$('.menu-close-trigger').forEach(a => a.addEventListener('click', () => {
    mobileMenu.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.textContent = '☰';
    document.body.style.overflow = '';
  }));

  const sections = $$('section[id]');
  const navLinks = $$('#navbar .nav-links a');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#'+e.target.id));
      }
    });
  }, { threshold: .35 });
  sections.forEach(s => observer.observe(s));

  /* ── Hide loader ── */
  const loader = $('#page-loader');
  loader.classList.add('fade');
  setTimeout(() => loader.remove(), 500);

})();
