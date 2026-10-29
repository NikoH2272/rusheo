/* ─── Admin frontend — Qualifer Rusheo ─── */
(async () => {
  const { esc, sb, must, PHASES, STATES, getRules, DEFAULT_RULES } = PYROCORE;
  const $ = s => document.querySelector(s);
  const $$ = (s,p=document) => [...p.querySelectorAll(s)];
  const uuid = () => crypto.randomUUID();

  /* ── Toast ── */
  const toast = (msg, err=false) => {
    const el = document.createElement('div');
    el.className = `toast ${err?'err':''}`;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), err ? 5500 : 3000);
  };

  /* ── Dirty state ── */
  let dirty = false;
  const TOKEN_KEY = 'prc_staff_token';
  let token = null;
  try { token = localStorage.getItem(TOKEN_KEY); } catch(_) {}

  const markDirty = () => {
    dirty = true;
    $('#save-state').textContent = 'Cambios sin guardar';
    $('#save-state').style.color = '#ffb547';
    $('#save-btn').disabled = false;
    $('#savebar').style.display = 'flex';
  };
  const markClean = () => {
    dirty = false;
    $('#save-state').textContent = 'Guardado';
    $('#save-state').style.color = '#22c55e';
    $('#save-btn').disabled = true;
    $('#savebar').style.display = 'none';
  };

  addEventListener('beforeunload', e => { if(dirty){e.preventDefault();e.returnValue='';} });

  /* ── RPC ── */
  const rpc = async (fn, args={}) => must(await sb.rpc(fn, {p_token:token,...args}));

  /* ── Auth ── */
  let meData = null;
  const showLogin = msg => {
    $('#login-view').style.display = 'flex';
    $('#admin-view').style.display = 'none';
    $('#savebar').style.display = 'none';
    $('#logout').hidden = true;
    $('#change-pw').hidden = true;
    $('#who').textContent = '';
    if(msg) { $('#pending-msg').hidden=false; $('#pending-msg').textContent=msg; }
  };
  const showAdmin = (user) => {
    meData = user;
    $('#login-view').style.display = 'none';
    $('#admin-view').style.display = 'block';
    $('#logout').hidden = false;
    $('#who').textContent = user.display_name || user.username;
    loadData();
  };

  /* Auto-login */
  if(token && sb) {
    try { showAdmin(await rpc('staff_me')); }
    catch(_) { token=null; try{localStorage.removeItem(TOKEN_KEY);}catch(__){} showLogin(); }
  } else { showLogin(); }

  $('#li-btn').addEventListener('click', async () => {
    const u = $('#li-user').value.trim();
    const p = $('#li-pass').value;
    if(!u||!p){ toast('Completa los campos',true); return; }
    try {
      const res = await must(await sb.rpc('staff_login',{p_username:u,p_password:p}));
      token = res.token;
      try { localStorage.setItem(TOKEN_KEY,token); } catch(_){}
      $('#pending-msg').hidden = true;
      showAdmin(res.user);
    } catch(e){ toast(e.message,true); }
  });
  $('#li-pass').addEventListener('keydown', e => { if(e.key==='Enter') $('#li-btn').click(); });
  $('#logout').addEventListener('click', async () => {
    try { await rpc('staff_logout'); } catch(_){}
    token=null; try{localStorage.removeItem(TOKEN_KEY);}catch(__){} showLogin();
  });

  /* ── Tabs ── */
  $$('.admin-tab').forEach(btn => btn.addEventListener('click', () => {
    $$('.admin-tab').forEach(b=>b.classList.remove('active'));
    $$('.tab-panel').forEach(p=>p.classList.remove('active'));
    btn.classList.add('active');
    $(`#tab-${btn.dataset.tab}`).classList.add('active');
  }));

  /* ═══════════════════════════════════════════════
     DATA
  ════════════════════════════════════════════════ */
  let data = null;
  const normalize = d => {
    d.tournament ??= {}; d.links ??= {};
    d.prizes ??= []; d.schedule ??= []; d.results ??= []; d.sponsors ??= [];
    d.tournament.eventos ??= [];
    ['rulesText','clarificationsText','prohibitedText','rulesNote'].forEach(k => {
      if(typeof d.tournament[k] !== 'string') d.tournament[k] = DEFAULT_RULES[k];
    });
    return d;
  };

  async function loadData() {
    try {
      const raw = await PYROCORE.loadData();
      data = normalize(raw);
      fillForm();
      markClean();
    } catch(e) { toast('Error al cargar datos: '+e.message, true); }
  }

  /* ─── Fill form ─── */
  function fillForm() {
    const t = data.tournament || {};
    const lnk = data.links    || {};

    const tFields = ['name','edition','description','state','startDate','startTime','prizePool','teamCount','trainDescription','formatDescription'];
    tFields.forEach(k => { const el = $(`#t-${k}`); if(el) el.value = t[k] || ''; });

    const lFields = ['instagram','discord','tiktok','youtube','whatsapp','stream','entrenamientos','register','rules'];
    lFields.forEach(k => { const el = $(`#lnk-${k}`); if(el) el.value = lnk[k] || ''; });

    $('#r-rulesText').value          = t.rulesText          || DEFAULT_RULES.rulesText;
    $('#r-clarificationsText').value = t.clarificationsText || DEFAULT_RULES.clarificationsText;
    $('#r-prohibitedText').value     = t.prohibitedText     || DEFAULT_RULES.prohibitedText;
    $('#r-rulesNote').value          = t.rulesNote          || DEFAULT_RULES.rulesNote;

    renderSchedule();
    renderEventos();
    renderResults();
    renderPrizes();
    renderSponsors();
    loadUsers();
    renderIAKeySection();
  }

  /* ─── Collect form → data ─── */
  function collectForm() {
    const t   = data.tournament;
    const lnk = data.links;

    ['name','edition','description','state','startDate','startTime','prizePool','teamCount','trainDescription','formatDescription'].forEach(k => {
      const el = $(`#t-${k}`); if(el) t[k] = el.value.trim();
    });
    ['instagram','discord','tiktok','youtube','whatsapp','stream','entrenamientos','register','rules'].forEach(k => {
      const el = $(`#lnk-${k}`); if(el) lnk[k] = el.value.trim();
    });
    t.rulesText          = $('#r-rulesText').value;
    t.clarificationsText = $('#r-clarificationsText').value;
    t.prohibitedText     = $('#r-prohibitedText').value;
    t.rulesNote          = $('#r-rulesNote').value;
  }

  /* ── Auto-dirty on any input ── */
  document.addEventListener('input', e => {
    if(e.target.closest('#admin-view')) markDirty();
  });

  /* ═══════════════════════════════════════════════
     SCHEDULE
  ════════════════════════════════════════════════ */
  const STATUS_OPT = [['proximo','Próximo'],['envivo','En vivo'],['finalizado','Finalizado']];
  const PHASE_OPT  = ['Clasificatoria','Octavos de final','Cuartos de final','Semifinal','Gran Final'];

  function renderSchedule() {
    const list = $('#sch-list');
    list.innerHTML = '';
    (data.schedule || []).forEach((m,i) => {
      const row = document.createElement('div');
      row.className = 'schedule-item';
      const teamLines = (m.teams||'').split('\n').filter(s=>s.trim()).length;
      const hasTeams = teamLines > 0;
      row.innerHTML = `
        <div class="sch-row-main">
          <span class="sch-pos">${i+1}</span>
          <input type="text" placeholder="Fase" value="${esc(m.phase||'')}" data-si="${i}" data-k="phase" list="phase-list">
          <input type="text" placeholder="Grupo" value="${esc(m.group||'')}" data-si="${i}" data-k="group">
          <input type="date" value="${esc(m.date||'')}" data-si="${i}" data-k="date">
          <input type="time" value="${esc(m.time||'')}" data-si="${i}" data-k="time">
          <input type="number" placeholder="Salas" value="${m.rooms||1}" min="1" style="width:70px" data-si="${i}" data-k="rooms">
          <select data-si="${i}" data-k="status">${STATUS_OPT.map(([v,l])=>`<option value="${v}"${m.status===v?' selected':''}>${l}</option>`).join('')}</select>
          <div class="sch-vis"><label><input type="checkbox" data-si="${i}" data-k="visible"${m.visible?' checked':''}> Visible</label></div>
          <button class="btn-rm" data-rm-sch="${i}">✕</button>
        </div>
        <button class="sch-teams-toggle${hasTeams?' has-teams':''}" data-toggle-teams="${i}">
          <i class="ti ti-users"></i>
          <span class="sch-teams-toggle-label">Equipos del grupo${hasTeams?` · ${teamLines} equipos`:''}</span>
          <i class="ti ti-chevron-${hasTeams?'up':'down'} sch-teams-chevron"></i>
        </button>
        <div class="sch-teams-panel" id="sch-teams-${i}"${hasTeams?'':' hidden'}>
          <textarea class="sch-teams-ta" placeholder="Nombre Equipo 1&#10;Nombre Equipo 2&#10;…" data-si="${i}" data-k="teams" rows="5">${esc(m.teams||'')}</textarea>
        </div>`;
      list.appendChild(row);
    });
    if(!list.querySelector('datalist')) {
      const dl = document.createElement('datalist'); dl.id='phase-list';
      PHASE_OPT.forEach(p=>{ const o=document.createElement('option'); o.value=p; dl.appendChild(o); });
      list.appendChild(dl);
    }
  }
  $('#sch-list').addEventListener('change', e => {
    const el = e.target; const i = Number(el.dataset.si); const k = el.dataset.k;
    if(k===undefined||isNaN(i)) return;
    data.schedule[i][k] = el.type==='checkbox' ? el.checked : (k==='rooms' ? Number(el.value)||1 : el.value);
  });
  $('#sch-list').addEventListener('input', e => {
    const el = e.target; const i = Number(el.dataset.si); const k = el.dataset.k;
    if(k===undefined||isNaN(i)) return;
    data.schedule[i][k] = el.value;
    markDirty();
  });
  $('#sch-list').addEventListener('click', e => {
    const toggle = e.target.closest('[data-toggle-teams]');
    if(toggle) {
      const panel = document.getElementById(`sch-teams-${toggle.dataset.toggleTeams}`);
      if(panel) {
        panel.hidden = !panel.hidden;
        const chevron = toggle.querySelector('.sch-teams-chevron');
        if(chevron) { chevron.className = `ti ti-chevron-${panel.hidden?'down':'up'} sch-teams-chevron`; }
      }
      return;
    }
    const rm = e.target.closest('[data-rm-sch]');
    if(rm) { data.schedule.splice(Number(rm.dataset.rmSch),1); renderSchedule(); markDirty(); }
  });
  $('#sch-add').addEventListener('click', () => {
    data.schedule.push({id:uuid(),phase:'',group:'',date:'',time:'',rooms:1,status:'proximo',visible:false,note:'',teams:''});
    renderSchedule(); markDirty();
  });

  /* ═══════════════════════════════════════════════
     EVENTOS
  ════════════════════════════════════════════════ */
  function renderEventos() {
    const list = $('#eventos-adm-list');
    list.innerHTML = '';
    const eventos = data.tournament.eventos || [];
    eventos.forEach((ev,i) => {
      const item = document.createElement('div');
      item.className = 'evento-adm-item';
      item.innerHTML = `
        <div class="evento-adm-head">
          <span>Evento ${i+1}</span>
          <button class="btn-rm" data-rm-ev="${i}">✕ Eliminar</button>
        </div>
        <div class="field-grid">
          <div class="field"><label>Nombre del evento</label><input type="text" value="${esc(ev.name||'')}" data-ev="${i}" data-k="name"></div>
          <div class="field"><label>Tipo (ej. Torneo, Scrimmage…)</label><input type="text" value="${esc(ev.type||'')}" data-ev="${i}" data-k="type"></div>
          <div class="field"><label>Fecha</label><input type="date" value="${esc(ev.date||'')}" data-ev="${i}" data-k="date"></div>
          <div class="field"><label>Hora (MX)</label><input type="time" value="${esc(ev.time||'')}" data-ev="${i}" data-k="time"></div>
          <div class="field full"><label>Descripción</label><textarea data-ev="${i}" data-k="description">${esc(ev.description||'')}</textarea></div>
          <div class="field full"><label>Link (opcional)</label><input type="url" value="${esc(ev.link||'')}" data-ev="${i}" data-k="link" placeholder="https://..."></div>
        </div>`;
      list.appendChild(item);
    });
  }
  $('#eventos-adm-list').addEventListener('input', e => {
    const el = e.target; const i = Number(el.dataset.ev); const k = el.dataset.k;
    if(k===undefined||isNaN(i)) return;
    (data.tournament.eventos||[])[i][k] = el.value;
  });
  $('#eventos-adm-list').addEventListener('click', e => {
    const rm = e.target.closest('[data-rm-ev]');
    if(rm){ data.tournament.eventos.splice(Number(rm.dataset.rmEv),1); renderEventos(); markDirty(); }
  });
  $('#evento-add').addEventListener('click', () => {
    data.tournament.eventos ??= [];
    data.tournament.eventos.push({id:uuid(),name:'',type:'',date:'',time:'',description:'',link:''});
    renderEventos(); markDirty();
  });

  /* ═══════════════════════════════════════════════
     RESULTS
  ════════════════════════════════════════════════ */
  const touchedGroups = new Set();
  const IA_URL = 'https://eckbiitvamusgvkhiylu.supabase.co/functions/v1/calcular_resultados';
  const normTeam = s => String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');

  function rrTotal(r) { return (r.kills||0) + (r.placement||0) - (r.penalty||0); }

  function renderResults() {
    const list = $('#results-list');
    list.innerHTML = '';
    (data.results||[]).forEach((g,gi) => {
      const div = document.createElement('div');
      div.className = 'result-group';
      const sorted = (g.rows||[]).slice().sort((a,b) => rrTotal(b) - rrTotal(a));
      const rowsHtml = sorted.map((r,ri) => `
        <div class="result-row">
          <span class="rr-pos">${ri+1}</span>
          <input type="text" value="${esc(r.team||'')}" placeholder="Equipo" data-gi="${gi}" data-rid="${r.id}" data-k="team">
          <input type="text" value="${esc(r.logo_serial||'')}" placeholder="Logo" style="width:54px" title="Serial logo (ej: 001)" data-gi="${gi}" data-rid="${r.id}" data-k="logo_serial">
          <input type="number" value="${r.kills||0}" min="0" placeholder="Kills" data-gi="${gi}" data-rid="${r.id}" data-k="kills">
          <input type="number" value="${r.placement||0}" min="0" placeholder="P.Pos" data-gi="${gi}" data-rid="${r.id}" data-k="placement">
          <input type="number" value="${r.penalty||0}" min="0" placeholder="Pen." data-gi="${gi}" data-rid="${r.id}" data-k="penalty">
          <span class="rr-total" title="Total = Kills + P.Pos − Penalización">${rrTotal(r)}</span>
        </div>`).join('');
      div.innerHTML = `
        <div class="rg-head">
          <div class="rg-head-left">
            <span class="rg-index">${gi + 1}</span>
            <div class="rg-meta">
              <input class="rg-title-input" type="text" value="${esc(g.title||'')}" placeholder="Nombre del grupo" data-gi="${gi}" data-k="title">
              <div class="rg-selects">
                <select class="rg-select" data-gi="${gi}" data-k="phase">${PHASES.map(p=>`<option${g.phase===p?' selected':''}>${p}</option>`).join('')}</select>
                <label class="rg-qualify-wrap" title="Equipos que clasifican">
                  <i class="ti ti-trophy" aria-hidden="true"></i>
                  <input type="number" class="rg-qualify-input" value="${g.qualify||0}" min="0" data-gi="${gi}" data-k="qualify">
                </label>
              </div>
            </div>
          </div>
          <div class="rg-head-actions">
            <button class="rg-btn rg-btn-ia" data-ia-group="${gi}" title="Extraer con IA"><i class="ti ti-cpu" aria-hidden="true"></i> IA</button>
            <button class="rg-btn rg-btn-png" data-png-group="${gi}" title="Exportar PNG"><i class="ti ti-download" aria-hidden="true"></i></button>
            <button class="rg-btn rg-btn-rm" data-rm-group="${gi}" title="Eliminar grupo"><i class="ti ti-trash" aria-hidden="true"></i></button>
          </div>
        </div>
        <div class="ia-panel" id="ia-panel-${gi}" hidden>
          <div class="iag-section">
            <p class="iag-section-label">Lobby — capturas de slots</p>
            <label class="iag-file-btn">
              <i class="ti ti-upload" aria-hidden="true"></i> Seleccionar lobby
              <input type="file" class="iag-lobby-input" accept="image/*" multiple data-gi="${gi}" style="display:none">
            </label>
            <div class="ia-thumbs" id="iag-lobby-${gi}" style="margin-top:6px"></div>
          </div>
          <div class="iag-section">
            <p class="iag-section-label">Capturas de resultados por partida</p>
            <div id="iag-partidas-${gi}"></div>
          </div>
          <div class="iag-actions">
            <button class="hbtn dim" data-iag-add="${gi}"><i class="ti ti-plus" aria-hidden="true"></i> Partida</button>
            <button class="hbtn gold" data-iag-extract="${gi}">Extraer con IA</button>
            <button class="hbtn dim" data-ia-close="${gi}">Cerrar</button>
          </div>
          <p class="ia-status" style="font-size:.75rem;margin:8px 0 0;min-height:18px"></p>
        </div>
        <div class="result-rows" data-rows="${gi}">
          ${rowsHtml}
          <button class="btn-add" data-add-row="${gi}" style="margin-top:8px">+ Fila</button>
        </div>`;
      list.appendChild(div);
    });
    // Reabrir paneles que estaban abiertos antes del re-render
    grpIaOpen.forEach(gi => {
      const panel = document.getElementById(`ia-panel-${gi}`);
      if(panel){ panel.hidden = false; grpIaRenderPartidas(gi); }
    });
  }
  $('#results-list').addEventListener('input', e => {
    const el = e.target; const gi = Number(el.dataset.gi); const k = el.dataset.k;
    if(k===undefined||isNaN(gi)) return;
    const rid = el.dataset.rid;
    if(rid !== undefined) {
      const row = data.results[gi].rows.find(r => r.id === rid);
      if(!row) return;
      row[k] = (k==='team'||k==='logo_serial') ? el.value : (Number(el.value)||0);
      touchedGroups.add(data.results[gi].id);
      if(k==='kills'||k==='placement'||k==='penalty') renderResults();
    } else {
      data.results[gi][k] = k==='qualify'?Number(el.value)||0:el.value;
    }
    markDirty();
  });
  $('#results-list').addEventListener('click', async e => {
    const rm = e.target.closest('[data-rm-group]');
    if(rm){ data.results.splice(Number(rm.dataset.rmGroup),1); renderResults(); markDirty(); return; }
    const pngBtn = e.target.closest('[data-png-group]');
    if(pngBtn){ generateResultPNG(Number(pngBtn.dataset.pngGroup)); return; }
    const ar = e.target.closest('[data-add-row]');
    if(ar){
      const gi=Number(ar.dataset.addRow);
      data.results[gi].rows.push({id:uuid(),team:'',logo_serial:'',kills:0,placement:0,penalty:0});
      touchedGroups.add(data.results[gi].id);
      renderResults(); markDirty();
    }
    // IA panel toggle
    const iabtn = e.target.closest('[data-ia-group]');
    if(iabtn){
      const gi = iabtn.dataset.iaGroup;
      const panel = document.getElementById(`ia-panel-${gi}`);
      if(panel){
        panel.hidden = !panel.hidden;
        if(!panel.hidden){ grpIaOpen.add(gi); grpIaRenderPartidas(gi); }
        else grpIaOpen.delete(gi);
      }
    }
    // IA close
    const iaclose = e.target.closest('[data-ia-close]');
    if(iaclose){ const panel=document.getElementById(`ia-panel-${iaclose.dataset.iaClose}`); if(panel) panel.hidden=true; }
    // Agregar partida al grupo
    const iagAdd = e.target.closest('[data-iag-add]');
    if(iagAdd){ const gi=iagAdd.dataset.iagAdd; grpIaAddPartida(gi); }
    // Extraer con IA para grupo
    const iagEx = e.target.closest('[data-iag-extract]');
    if(iagEx) await grpIaExtract(Number(iagEx.dataset.iagExtract), iagEx);
    // Quitar partida del grupo
    const iagRmP = e.target.closest('[data-iag-rm-partida]');
    if(iagRmP){
      const { gi, pi } = iagRmP.dataset;
      if(grpIaState[gi]){ grpIaState[gi].partidas.splice(Number(pi),1); grpIaRenderPartidas(gi); }
    }
  });

  // Estado por grupo: lobby[], partidas[][], paneles abiertos
  const grpIaState = {};
  const grpIaOpen = new Set();
  function grpIaEnsure(gi){ if(!grpIaState[gi]) grpIaState[gi]={lobby:[],partidas:[[]]}; }

  function grpIaRenderPartidas(gi){
    grpIaEnsure(gi);
    const st = grpIaState[gi];
    const lobbyThumb = document.getElementById(`iag-lobby-${gi}`);
    if(lobbyThumb) lobbyThumb.innerHTML = st.lobby.map(f=>`<img class="ia-thumb" src="${URL.createObjectURL(f)}">`).join('');
    const container = document.getElementById(`iag-partidas-${gi}`);
    if(!container) return;
    container.innerHTML = st.partidas.map((files,pi)=>`
      <div class="iag-partida-row">
        <span class="iag-label">P${pi+1}</span>
        <label class="iag-file-btn">
          <i class="ti ti-photo-up" aria-hidden="true"></i>
          <input type="file" class="iag-result-input" accept="image/*" multiple data-gi="${gi}" data-pi="${pi}" style="display:none">
          ${files.length ? `${files.length} imagen${files.length>1?'es':''}` : '1–2 caps'}
        </label>
        <div class="ia-thumbs" style="margin:0">${files.map(f=>`<img class="ia-thumb" src="${URL.createObjectURL(f)}">`).join('')}</div>
        ${pi>0?`<button class="btn-rm" data-iag-rm-partida data-gi="${gi}" data-pi="${pi}"><i class="ti ti-x" aria-hidden="true"></i></button>`:''}
      </div>`).join('');
  }

  function grpIaAddPartida(gi){
    grpIaEnsure(gi);
    grpIaState[gi].partidas.push([]);
    grpIaRenderPartidas(gi);
  }

  $('#results-list').addEventListener('change', e => {
    const lobbyIn = e.target.closest('.iag-lobby-input');
    if(lobbyIn){
      const gi = lobbyIn.dataset.gi;
      grpIaEnsure(gi);
      grpIaState[gi].lobby = Array.from(lobbyIn.files);
      grpIaRenderPartidas(gi);
    }
    const resultIn = e.target.closest('.iag-result-input');
    if(resultIn){
      const gi = resultIn.dataset.gi, pi = Number(resultIn.dataset.pi);
      grpIaEnsure(gi);
      grpIaState[gi].partidas[pi] = Array.from(resultIn.files);
      grpIaRenderPartidas(gi);
    }
  });

  async function grpIaCallClaude(apiKey, rows, lobby, partidas) {
    const teamsList = rows
      .map((r, i) => r.team?.trim() ? `Slot ${i + 1}: ${r.team.trim()}` : null)
      .filter(Boolean)
      .join('\n');
    const content = [];
    content.push({ type: 'text', text: `EQUIPOS DEL GRUPO (slot = número de casilla en el lobby):\n${teamsList}` });
    content.push({ type: 'text', text: '--- LOBBY (identifica qué jugadores pertenecen a cada slot) ---' });
    for (const f of lobby) {
      content.push({ type: 'image', source: { type: 'base64', media_type: f.type || 'image/jpeg', data: await iaFileToB64(f) } });
    }
    for (let i = 0; i < partidas.length; i++) {
      content.push({ type: 'text', text: `--- RESULTADO PARTIDA_${i + 1} ---` });
      for (const f of partidas[i]) {
        content.push({ type: 'image', source: { type: 'base64', media_type: f.type || 'image/jpeg', data: await iaFileToB64(f) } });
      }
    }
    const system = `Eres un extractor de resultados de salas personalizadas de Free Fire.
Paso 1 — Lobby: identifica qué jugadores pertenecen a cada slot usando las capturas del lobby.
Paso 2 — Resultados: para cada partida, encuentra la posición final (#1, #2…) y los kills TOTALES del equipo (suma de kills de todos sus jugadores visibles en esa partida).
Trabaja a nivel de EQUIPO/SLOT, no por jugador individual.
Para equipos no visibles en ninguna captura de resultado: posicion=0, kills=0.
Nunca inventes datos.
Responde ÚNICAMENTE con JSON válido, sin texto adicional:
{"partidas":[{"partida":1,"equipos":[{"slot":1,"posicion":3,"kills":5}]}]}`;

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({ model: 'claude-haiku-5-5', max_tokens: 16384, system, messages: [{ role: 'user', content }] }),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error?.message || `API HTTP ${resp.status}`);
    }
    const body = await resp.json();
    const textBlock = (body.content || []).find(b => b.type === 'text');
    const txt = (textBlock?.text || '').trim();
    if (!txt) throw new Error(`Respuesta vacía. stop_reason: ${body.stop_reason}`);
    const jsonMatch = txt.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('JSON no encontrado. Respuesta: ' + txt.slice(0, 300));
    return JSON.parse(jsonMatch[0]);
  }

  async function grpIaExtract(gi, btn) {
    grpIaEnsure(gi);
    const st = grpIaState[gi];
    const setStatus = (txt, color = 'var(--gray)') => {
      const s = document.getElementById(`ia-panel-${gi}`)?.querySelector('.ia-status');
      if (s) { s.textContent = txt; s.style.color = color; }
    };
    if (!st.lobby.length) { toast('Sube las capturas del lobby (slots)', true); return; }
    if (!st.partidas.some(p => p.length)) { toast('Sube al menos 1 captura de resultado', true); return; }

    btn.disabled = true; btn.textContent = 'Extrayendo…';
    setStatus('Obteniendo clave IA…');
    try {
      const apiKey = await rpc('staff_get_anthropic_key');
      if (!apiKey) throw new Error('No hay clave IA guardada. Configurala en la pestaña Usuarios.');

      setStatus('Analizando capturas…');
      const rows = data.results[gi]?.rows || [];
      const extracted = await grpIaCallClaude(apiKey, rows, st.lobby, st.partidas.filter(p => p.length));

      // Acumular kills y posiciones por slot across todas las partidas
      const agg = {};
      (extracted.partidas || []).forEach(partida => {
        (partida.equipos || []).forEach(eq => {
          agg[eq.slot] ??= { kills: 0, pos: [] };
          if (eq.kills !== null && !isNaN(+eq.kills)) agg[eq.slot].kills += +eq.kills;
          if (eq.posicion > 0) agg[eq.slot].pos.push(eq.posicion);
        });
      });

      let aplicados = 0;
      rows.forEach((r, ri) => {
        if (!r.team?.trim()) {
          r.kills = 0; r.placement = 0; r.penalty = 0;
          return;
        }
        const info = agg[ri + 1];
        if (!info) return;
        r.kills = info.kills;
        r.placement = info.pos.reduce((acc, p) => acc + bPts(p), 0);
        aplicados++;
      });

      touchedGroups.add(data.results[gi].id);
      grpIaOpen.add(String(gi));
      renderResults(); markDirty();
      setStatus(`${aplicados} de ${rows.length} equipos actualizados — revisá y guarda`, '#B6FF00');
      grpIaRenderPartidas(gi);
      if (typeof _IC !== 'undefined') _IC.generar(gi, data);
    } catch (err) {
      setStatus('Error: ' + err.message, '#FCA5A5');
      toast('Error IA: ' + err.message, true);
    } finally {
      btn.disabled = false; btn.textContent = 'Extraer con IA';
    }
  }

  $('#results-add-group').addEventListener('click', () => {
    data.results.push({id:uuid(),phase:PHASES[0],title:'Grupo '+String.fromCharCode(65+data.results.length),kind:'grupo',qualify:0,rows:[
      {id:uuid(),team:'',logo_serial:'',kills:0,placement:0,penalty:0}
    ]});
    renderResults(); markDirty();
  });

  // Bulk import
  const bulkPanel = $('#bulk-panel');
  const bulkPhaseEl = $('#bulk-phase');
  const bulkTitleEl = $('#bulk-title');
  PHASES.forEach(p => { const o=document.createElement('option'); o.value=o.textContent=p; bulkPhaseEl.appendChild(o); });

  function bulkRefreshGroups() {
    const schWithTeams = (data.schedule||[])
      .map((m,si)=>({m,si}))
      .filter(({m})=>(m.teams||'').trim());
    const schOpts = schWithTeams.length
      ? `<optgroup label="Desde cronograma">${schWithTeams.map(({m,si})=>{
          const n = (m.teams||'').split('\n').filter(s=>s.trim()).length;
          return `<option value="sch:${si}">${esc(m.phase||'')} · ${esc(m.group||'')} (${n} equipos)</option>`;
        }).join('')}</optgroup>`
      : '';
    bulkTitleEl.innerHTML =
      '<option value="__new__">— Crear grupo nuevo —</option>' +
      (data.results||[]).map((g,i)=>`<option value="${i}">${esc(g.title||'Grupo '+(i+1))} · ${esc(g.phase||'')}</option>`).join('') +
      schOpts;
  }
  bulkTitleEl.addEventListener('change', () => {
    const sel = bulkTitleEl.value;
    if(sel.startsWith('sch:')) {
      const m = data.schedule[Number(sel.slice(4))];
      if(m?.teams?.trim()) $('#bulk-names').value = m.teams.trim();
    }
  });

  $('#results-bulk-toggle').addEventListener('click', () => {
    bulkPanel.hidden = !bulkPanel.hidden;
    if(!bulkPanel.hidden){ bulkRefreshGroups(); $('#bulk-names').focus(); }
  });
  $('#bulk-cancel').addEventListener('click', () => { bulkPanel.hidden=true; });
  $('#bulk-create').addEventListener('click', () => {
    const names = ($('#bulk-names').value||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
    if(!names.length){ toast('Escribe al menos un equipo',true); return; }
    const rows = names.map(t=>({id:uuid(),team:t,logo_serial:'',kills:0,placement:0,penalty:0}));
    const sel = bulkTitleEl.value;
    if(sel === '__new__' || sel.startsWith('sch:')) {
      let phase = bulkPhaseEl.value || PHASES[0];
      let title = 'Grupo ' + String.fromCharCode(65 + data.results.length);
      if(sel.startsWith('sch:')) {
        const m = data.schedule[Number(sel.slice(4))];
        if(m){ phase = m.phase || phase; title = m.group || title; }
      }
      const g = {id:uuid(),phase,title,kind:'grupo',qualify:0,rows};
      data.results.push(g);
      touchedGroups.add(g.id);
      toast(`Grupo "${title}" creado con ${rows.length} equipos`);
    } else {
      const gi = Number(sel);
      const g = data.results[gi];
      if(!g){ toast('Grupo no encontrado',true); return; }
      g.rows = rows;
      touchedGroups.add(g.id);
      toast(`${rows.length} equipos cargados en "${g.title||'Grupo '+(gi+1)}"`);
    }
    renderResults(); markDirty();
    $('#bulk-names').value='';
    bulkPanel.hidden=true;
  });

  /* ═══════════════════════════════════════════════
     PRIZES
  ════════════════════════════════════════════════ */
  function renderPrizes() {
    const list = $('#prizes-adm-list');
    list.innerHTML = '';
    (data.prizes||[]).forEach((p,i) => {
      const div = document.createElement('div');
      div.style.cssText='display:grid;grid-template-columns:60px 1fr 120px 1fr auto;gap:8px;align-items:center;margin-bottom:8px';
      div.innerHTML=`
        <div class="field"><label>Pos.</label><input type="number" value="${p.position||i+1}" min="1" data-pi="${i}" data-k="position"></div>
        <div class="field"><label>Etiqueta (1er lugar…)</label><input type="text" value="${esc(p.label||'')}" data-pi="${i}" data-k="label" placeholder="1er Lugar"></div>
        <div class="field"><label>Monto ($)</label><input type="number" value="${p.amount||''}" min="0" data-pi="${i}" data-k="amount"></div>
        <div class="field"><label>Descripción</label><input type="text" value="${esc(p.description||'')}" data-pi="${i}" data-k="description"></div>
        <button class="btn-rm" data-rm-prize="${i}" style="align-self:flex-end;margin-bottom:0">✕</button>`;
      list.appendChild(div);
    });
  }
  $('#prizes-adm-list').addEventListener('input', e => {
    const el=e.target; const i=Number(el.dataset.pi); const k=el.dataset.k;
    if(k===undefined||isNaN(i)) return;
    data.prizes[i][k] = k==='amount'||k==='position'?Number(el.value)||0:el.value;
    markDirty();
  });
  $('#prizes-adm-list').addEventListener('click', e => {
    const rm=e.target.closest('[data-rm-prize]');
    if(rm){ data.prizes.splice(Number(rm.dataset.rmPrize),1); renderPrizes(); markDirty(); }
  });
  $('#prizes-add').addEventListener('click', () => {
    data.prizes.push({position:data.prizes.length+1,label:'',amount:0,description:''});
    renderPrizes(); markDirty();
  });

  /* ═══════════════════════════════════════════════
     SPONSORS
  ════════════════════════════════════════════════ */
  const SPONSOR_SLOTS = 12;
  function renderSponsors() {
    while(data.sponsors.length < SPONSOR_SLOTS) data.sponsors.push({id:uuid(),name:'',logo_url:'',url:''});
    const list = $('#sponsor-list');
    list.innerHTML = '';
    data.sponsors.forEach((s,i) => {
      const div=document.createElement('div'); div.className='sponsor-item';
      div.innerHTML=`
        <div class="field"><label>Nombre</label><input type="text" value="${esc(s.name||'')}" data-spi="${i}" data-k="name" placeholder="Sponsor"></div>
        <div class="field"><label>URL logo</label><input type="url" value="${esc(s.logo_url||s.logo||'')}" data-spi="${i}" data-k="logo_url" placeholder="https://..."></div>
        <div class="field"><label>Link</label><input type="url" value="${esc(s.url||'')}" data-spi="${i}" data-k="url" placeholder="https://..."></div>`;
      list.appendChild(div);
    });
  }
  $('#sponsor-list').addEventListener('input', e => {
    const el=e.target; const i=Number(el.dataset.spi); const k=el.dataset.k;
    if(k===undefined||isNaN(i)) return;
    data.sponsors[i][k]=el.value; markDirty();
  });

  /* ═══════════════════════════════════════════════
     USERS
  ════════════════════════════════════════════════ */
  async function loadUsers() {
    try {
      const users = await rpc('staff_list_users');
      const list = $('#users-list');
      list.innerHTML = '';
      (users||[]).forEach(u => {
        const row=document.createElement('div');
        row.style.cssText='display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)';
        row.innerHTML=`
          <span style="flex:1;font-weight:600">${esc(u.display_name||u.username)}</span>
          <span style="color:var(--gray);font-size:.75rem">@${esc(u.username)}</span>
          <span class="tag" style="background:var(--bg-c);border:1px solid var(--border);color:var(--gray);font-size:.6rem;padding:3px 8px">${u.role}</span>
          ${meData?.role==='admin'&&meData?.id!==u.id?`<button class="btn-rm" data-del-user="${u.id}">Eliminar</button>`:''}`;
        list.appendChild(row);
      });
      list.addEventListener('click', async e => {
        const rm=e.target.closest('[data-del-user]');
        if(!rm) return;
        if(!confirm('¿Eliminar usuario?')) return;
        try { await rpc('staff_delete_user',{p_id:rm.dataset.delUser}); toast('Usuario eliminado'); loadUsers(); }
        catch(e){ toast(e.message,true); }
      });
    } catch(e){ /* not admin */ }
  }
  $('#nu-btn').addEventListener('click', async () => {
    try {
      await rpc('staff_create_user',{p_username:$('#nu-user').value,p_password:$('#nu-pass').value,p_display_name:$('#nu-name').value,p_role:$('#nu-role').value});
      toast('Usuario creado'); ['nu-user','nu-pass','nu-name'].forEach(id=>$(`#${id}`).value=''); loadUsers();
    } catch(e){ toast(e.message,true); }
  });
  $('#cp-btn').addEventListener('click', async () => {
    try {
      await rpc('staff_change_password',{p_old:$('#cp-old').value,p_new:$('#cp-new').value});
      toast('Contraseña actualizada'); $('#cp-old').value=''; $('#cp-new').value='';
    } catch(e){ toast(e.message,true); }
  });

  // Mostrar sección de clave IA solo a admins
  function renderIAKeySection() {
    const sec = $('#ia-key-section');
    if (sec) sec.hidden = meData?.role !== 'admin';
  }

  $('#ia-key-save')?.addEventListener('click', async () => {
    const key = $('#ia-key-input')?.value.trim();
    if (!key) { toast('Escribe la clave antes de guardar', true); return; }
    const statusEl = $('#ia-key-status');
    try {
      await rpc('staff_set_anthropic_key', { p_key: key });
      $('#ia-key-input').value = '';
      statusEl.textContent = '✓ Clave guardada en la base de datos';
      statusEl.style.color = '#22c55e';
      setTimeout(() => { statusEl.textContent = ''; }, 4000);
    } catch(e) { toast(e.message, true); }
  });

  /* ═══════════════════════════════════════════════
     SAVE
  ════════════════════════════════════════════════ */
  const doSave = async () => {
    collectForm();
    try {
      await rpc('staff_save', {
        p_data: {
          tournament: data.tournament,
          links:      data.links,
          prizes:     data.prizes,
          schedule:   data.schedule,
          results:    data.results,
          sponsors:   data.sponsors,
          touched:    [...touchedGroups],
        }
      });
      touchedGroups.clear();
      toast('Guardado correctamente ✓');
      markClean();
    } catch(e){ toast('Error al guardar: '+e.message, true); }
  };

  $('#save-btn').addEventListener('click', doSave);
  $('#savebar-save').addEventListener('click', doSave);
  $('#savebar-discard').addEventListener('click', () => { if(confirm('¿Descartar cambios?')){ loadData(); } });

  /* ═══════════════════════════════════════════════
     EXTRACTOR IA
  ════════════════════════════════════════════════ */
  // Puntos de posición BR estándar (posición 1-12)
  const BR_PTS = [12, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0, 0];
  const bPts = pos => (pos >= 1 && pos <= 12) ? BR_PTS[pos - 1] : 0;

  let iaLobby = [];      // File[] — las 3 caps del lobby (compartido)
  let iaPartidas = [];   // File[][] — caps de resultado por partida (1-2 c/u)
  let iaExtracted = null;

  // Lobby global
  $('#ia-lobby-input')?.addEventListener('change', e => {
    iaLobby = [...e.target.files];
    const thumbs = $('#ia-lobby-thumbs');
    if (thumbs) thumbs.innerHTML = iaLobby.map(f => `<img src="${URL.createObjectURL(f)}" class="ia-thumb" alt="">`).join('');
  });

  function renderIAPartidas() {
    const list = $('#ia-partidas-list');
    if (!list) return;
    list.innerHTML = '';
    iaPartidas.forEach((files, i) => {
      const div = document.createElement('div');
      div.className = 'ia-partida-item';
      div.innerHTML = `
        <div class="ia-partida-head">
          <span>Partida ${i + 1}</span>
          <button class="btn-rm" data-rm-iap="${i}">✕</button>
        </div>
        <div class="field">
          <label>🏆 Capturas del resultado (1 o 2)</label>
          <input type="file" accept="image/*" multiple data-iap="${i}">
        </div>
        <div class="ia-thumbs" id="ia-thumbs-${i}"></div>`;
      list.appendChild(div);
    });

    $$('[data-iap]', list).forEach(inp => {
      inp.addEventListener('change', () => {
        const pi = +inp.dataset.iap;
        iaPartidas[pi] = [...inp.files];
        iaRenderThumbs(pi);
      });
    });

    list.addEventListener('click', e => {
      const rm = e.target.closest('[data-rm-iap]');
      if (rm) { iaPartidas.splice(+rm.dataset.rmIap, 1); renderIAPartidas(); }
    });
  }

  function iaRenderThumbs(pi) {
    const row = $(`#ia-thumbs-${pi}`);
    if (!row) return;
    row.innerHTML = (iaPartidas[pi] || []).map(f => `<img src="${URL.createObjectURL(f)}" class="ia-thumb" alt="">`).join('');
  }

  $('#ia-add-partida')?.addEventListener('click', () => {
    iaPartidas.push([]);
    renderIAPartidas();
  });

  $('#ia-extract-btn')?.addEventListener('click', async () => {
    const teamsRaw = $('#ia-teams')?.value.trim();
    if (!teamsRaw) { toast('Escribe los nombres de equipos en orden de slot', true); return; }
    if (!iaLobby.length) { toast('Sube las capturas del lobby (sección 02)', true); return; }
    if (!iaPartidas.some(p => p.length)) { toast('Agrega al menos una partida con capturas', true); return; }

    const btn = $('#ia-extract-btn');
    const status = $('#ia-status');
    btn.disabled = true; btn.textContent = '⏳ Obteniendo clave...';
    status.textContent = 'Autenticando...';
    status.style.color = 'var(--gray)';
    $('#ia-preview').hidden = true;

    try {
      const apiKey = await rpc('staff_get_anthropic_key');
      if (!apiKey) throw new Error('No hay clave de Anthropic configurada. Configúrala en el tab Usuarios.');

      btn.textContent = '⏳ Analizando capturas...';
      status.textContent = 'Enviando imágenes a Claude Vision...';

      iaExtracted = await iaCallClaude(apiKey, teamsRaw, iaPartidas);
      iaRenderPreview(iaExtracted, teamsRaw);
      status.textContent = '✓ Extracción completada. Revisá y aplicá al grupo.';
      status.style.color = '#B6FF00';
    } catch (e) {
      status.textContent = '✗ Error: ' + e.message;
      status.style.color = '#FCA5A5';
      toast('Error IA: ' + e.message, true);
    } finally {
      btn.disabled = false; btn.textContent = '⚡ Extraer con IA';
    }
  });

  async function iaFileToB64(file) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result.split(',')[1]);
      r.onerror = rej;
      r.readAsDataURL(file);
    });
  }

  async function iaCallClaude(apiKey, teamsRaw, partidas) {
    const content = [];
    const slots = teamsRaw.split('\n').map((n, i) => n.trim() ? `Slot ${i + 1}: ${n.trim()}` : null).filter(Boolean);

    // 1. Equipos
    content.push({ type: 'text', text: `EQUIPOS (en orden de slot):\n${slots.join('\n')}` });

    // 2. Lobby — 3 capturas compartidas para todas las partidas
    content.push({ type: 'text', text: '\n--- LOBBY ---' });
    for (const f of iaLobby) {
      content.push({ type: 'image', source: { type: 'base64', media_type: f.type || 'image/jpeg', data: await iaFileToB64(f) } });
    }

    // 3. Resultado de cada partida (1-2 caps c/u)
    for (let i = 0; i < partidas.length; i++) {
      const files = partidas[i];
      if (!files.length) continue;
      content.push({ type: 'text', text: `\n--- PARTIDA_${i + 1} ---` });
      for (const f of files) {
        content.push({ type: 'image', source: { type: 'base64', media_type: f.type || 'image/jpeg', data: await iaFileToB64(f) } });
      }
    }

    const system = `Eres un extractor de datos de salas personalizadas de Free Fire. Lees capturas y devuelves SOLO un objeto JSON válido, sin texto adicional, sin markdown.
Tu salida se guarda directamente en una base de datos: no calcules puntos, totales ni rankings.
Del lobby extrae nombre de sala, ID, mapa y modo. Por cada slot, sus jugadores y nombre oficial según EQUIPOS.
En cada partida identifica la posición de cada equipo comparando jugadores con el lobby.
Por cada jugador visible crea un registro con sus kills (campo "Eliminaciones").
Si un jugador no estaba en el lobby: es_suplente = true.
Si un equipo no aparece en la partida: agrégalo a no_visibles.
Si un jugador está cortado o su número no se lee: kills = null y agrega un aviso.
Nunca inventes datos.
Responde ÚNICAMENTE con JSON, sin texto adicional:
{"sala":{"nombre":"","id":"","mapa":"","modo":""},"equipos":[{"slot":1,"equipo":"","tag":"","jugadores":[]}],"posiciones":[{"partida":1,"slot":1,"posicion":1}],"kills_jugadores":[{"partida":1,"slot":1,"jugador":"","es_suplente":false,"kills":5}],"no_visibles":[{"partida":1,"slots":[]}],"avisos":[]}`;

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-haiku-5-5',
        max_tokens: 16384,
        system,
        messages: [{ role: 'user', content }],
      }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error?.message || `API HTTP ${resp.status}`);
    }
    const body = await resp.json();
    const textBlock = (body.content || []).find(b => b.type === 'text');
    const txt = (textBlock?.text || '').trim();
    if (!txt) throw new Error(`Respuesta vacía. stop_reason: ${body.stop_reason}`);
    const jsonMatch = txt.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('La IA no devolvió JSON válido. Respuesta: ' + txt.slice(0, 300));
    return JSON.parse(jsonMatch[0]);
  }

  function iaRenderPreview(extracted, teamsRaw) {
    const teamNames = {};
    teamsRaw.split('\n').forEach((n, i) => { if (n.trim()) teamNames[i + 1] = n.trim(); });
    (extracted.equipos || []).forEach(eq => { if (eq.slot && eq.equipo) teamNames[eq.slot] = eq.equipo; });

    const agg = {};
    (extracted.kills_jugadores || []).forEach(kj => {
      agg[kj.slot] ??= { kills: 0, pos: [] };
      if (kj.kills !== null && !isNaN(+kj.kills)) agg[kj.slot].kills += +kj.kills;
    });
    (extracted.posiciones || []).forEach(p => {
      agg[p.slot] ??= { kills: 0, pos: [] };
      agg[p.slot].pos.push(p.posicion);
    });

    const rows = Object.entries(teamNames).map(([slot, nombre]) => {
      const s = +slot;
      const info = agg[s] || { kills: 0, pos: [] };
      const ptsPos = info.pos.reduce((acc, p) => acc + bPts(p), 0);
      return { slot: s, nombre, kills: info.kills, pos: info.pos, ptsPos };
    }).sort((a, b) => (b.kills + b.ptsPos) - (a.kills + a.ptsPos));

    const sala = extracted.sala;
    let html = sala?.nombre ? `<div class="ia-sala-info">🎮 <strong>${esc(sala.nombre)}</strong> · ${esc(sala.mapa || '')} · ${esc(sala.modo || '')}</div>` : '';

    html += `<div class="ia-table-wrap"><table class="ia-table">
      <thead><tr><th>#</th><th>Equipo</th><th>Kills</th><th>Posiciones</th><th>Pts pos.</th><th>Total</th></tr></thead>
      <tbody>${rows.map(r => `<tr>
        <td class="ia-tc">${r.slot}</td>
        <td>${esc(r.nombre)}</td>
        <td class="ia-tc"><strong>${r.kills}</strong></td>
        <td class="ia-tc" style="color:var(--gray-dim)">${r.pos.map(p => `#${p}`).join(' ') || '—'}</td>
        <td class="ia-tc">${r.ptsPos}</td>
        <td class="ia-tc"><strong style="color:var(--gold)">${r.kills + r.ptsPos}</strong></td>
      </tr>`).join('')}</tbody>
    </table></div>`;

    if ((extracted.avisos || []).length)
      html += `<div class="ia-avisos">⚠️ ${extracted.avisos.map(a => esc(String(a))).join(' · ')}</div>`;

    $('#ia-preview-content').innerHTML = html;

    const sel = $('#ia-apply-group');
    sel.innerHTML = '<option value="">— Seleccionar grupo —</option>';
    (data.results || []).forEach((g, gi) => {
      sel.innerHTML += `<option value="${gi}">${esc(g.title || 'Sin título')} (${esc(g.phase || '')})</option>`;
    });

    $('#ia-preview').hidden = false;
  }

  $('#ia-apply-btn')?.addEventListener('click', () => {
    if (!iaExtracted) { toast('Primero extraé los resultados', true); return; }
    const giVal = $('#ia-apply-group')?.value;
    if (giVal === '' || giVal === undefined) { toast('Seleccioná un grupo', true); return; }

    const teamsRaw = $('#ia-teams')?.value.trim() || '';
    const teamNames = {};
    teamsRaw.split('\n').forEach((n, i) => { if (n.trim()) teamNames[i + 1] = n.trim(); });
    (iaExtracted.equipos || []).forEach(eq => { if (eq.slot && eq.equipo) teamNames[eq.slot] = eq.equipo; });

    const agg = {};
    (iaExtracted.kills_jugadores || []).forEach(kj => {
      agg[kj.slot] ??= { kills: 0, pos: [] };
      if (kj.kills !== null && !isNaN(+kj.kills)) agg[kj.slot].kills += +kj.kills;
    });
    (iaExtracted.posiciones || []).forEach(p => {
      agg[p.slot] ??= { kills: 0, pos: [] };
      agg[p.slot].pos.push(p.posicion);
    });

    const group = data.results[+giVal];
    const existingRows = group.rows || [];

    group.rows = Object.entries(teamNames).map(([slot, nombre]) => {
      const s = +slot;
      const info = agg[s] || { kills: 0, pos: [] };
      const ptsPos = info.pos.reduce((acc, p) => acc + bPts(p), 0);
      const ex = existingRows.find(r => r.team === nombre) || {};
      return { id: ex.id || uuid(), team: nombre, logo_serial: ex.logo_serial || '', kills: info.kills, placement: ptsPos, penalty: ex.penalty || 0 };
    }).sort((a, b) => (b.kills + b.placement) - (a.kills + a.placement));

    touchedGroups.add(group.id);
    renderResults(); markDirty();
    toast(`✓ ${group.rows.length} equipo(s) aplicados a "${group.title || 'grupo'}" — revisá y guardá`);
  });

  // Init
  renderIAPartidas();

  // ── Generador de PNG de resultados ────────────────────────────
  async function generateResultPNG(gi) {
    const g = data.results[gi];
    if (!g) return;
    toast('Generando imagen…');

    const W = 750, H = 1060;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    // Cargar fondo
    const bg = await new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = rej;
      img.src = 'base/tablaresultados.png';
    });
    ctx.drawImage(bg, 0, 0, W, H);

    // Overlay oscuro en zona de tabla
    const tableY = 360, rowH = 46, padX = 32;
    const rows = (g.rows || []).slice().sort((a,b) => rrTotal(b) - rrTotal(a));
    const tableH = rowH * rows.length + 60;
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.roundRect(padX, tableY - 50, W - padX * 2, tableH + 50, 8);
    ctx.fill();

    // Fase
    ctx.font = '500 14px "Barlow Condensed", sans-serif';
    ctx.fillStyle = 'rgba(255,194,26,0.6)';
    ctx.textAlign = 'center';
    ctx.fillText((g.phase || '').toUpperCase(), W / 2, tableY - 40);
    // Título del grupo
    ctx.font = 'bold 32px "Barlow Condensed", sans-serif';
    ctx.fillStyle = '#FFC21A';
    ctx.textAlign = 'center';
    ctx.fillText((g.title || 'RESULTADOS').toUpperCase(), W / 2, tableY - 14);

    // Cabecera de tabla
    const cols = { pos: padX + 18, team: padX + 68, kills: W - 210, pts: W - 130, total: W - 50 };
    ctx.font = 'bold 13px "Barlow Condensed", sans-serif';
    ctx.fillStyle = 'rgba(255,194,26,0.7)';
    ctx.textAlign = 'left';
    ctx.fillText('#', cols.pos, tableY + 4);
    ctx.fillText('EQUIPO', cols.team, tableY + 4);
    ctx.textAlign = 'center';
    ctx.fillText('KILLS', cols.kills, tableY + 4);
    ctx.fillText('P.POS', cols.pts, tableY + 4);
    ctx.fillText('TOTAL', cols.total, tableY + 4);

    // Línea separadora
    ctx.strokeStyle = 'rgba(255,194,26,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(padX, tableY + 10); ctx.lineTo(W - padX, tableY + 10); ctx.stroke();

    // Filas
    rows.forEach((r, i) => {
      const y = tableY + 14 + rowH * i + rowH;
      const total = rrTotal(r);
      const isTop = i < (g.qualify || 0);

      // Fondo fila alternada / top
      if (isTop) {
        ctx.fillStyle = 'rgba(255,194,26,0.10)';
        ctx.fillRect(padX, y - rowH + 8, W - padX * 2, rowH - 2);
      } else if (i % 2 === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.03)';
        ctx.fillRect(padX, y - rowH + 8, W - padX * 2, rowH - 2);
      }

      // Posición
      ctx.font = `bold 20px "Barlow Condensed", sans-serif`;
      ctx.fillStyle = i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : '#888';
      ctx.textAlign = 'center';
      ctx.fillText(`${i + 1}`, cols.pos + 10, y);

      // Nombre equipo
      ctx.font = `${isTop ? 'bold' : '600'} 18px "Barlow Condensed", sans-serif`;
      ctx.fillStyle = isTop ? '#ffffff' : '#cccccc';
      ctx.textAlign = 'left';
      const name = (r.team || '—').toUpperCase();
      ctx.fillText(name.length > 22 ? name.slice(0, 21) + '…' : name, cols.team, y);

      // Stats
      ctx.font = '16px "Barlow Condensed", sans-serif';
      ctx.fillStyle = '#aaa';
      ctx.textAlign = 'center';
      ctx.fillText(r.kills || 0, cols.kills, y);
      ctx.fillText(r.placement || 0, cols.pts, y);

      // Total
      ctx.font = 'bold 18px "Barlow Condensed", sans-serif';
      ctx.fillStyle = isTop ? '#FFC21A' : '#fff';
      ctx.fillText(total, cols.total, y);
    });

    // Descarga
    const a = document.createElement('a');
    a.download = `resultados-${(g.title||'grupo').replace(/\s+/g,'-').toLowerCase()}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
    toast('PNG descargado');
  }

})();
