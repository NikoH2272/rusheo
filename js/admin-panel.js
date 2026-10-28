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
      row.innerHTML = `
        <span class="sch-pos">${i+1}</span>
        <input type="text" placeholder="Fase" value="${esc(m.phase||'')}" data-si="${i}" data-k="phase" list="phase-list">
        <input type="text" placeholder="Grupo" value="${esc(m.group||'')}" data-si="${i}" data-k="group">
        <input type="date" value="${esc(m.date||'')}" data-si="${i}" data-k="date">
        <input type="time" value="${esc(m.time||'')}" data-si="${i}" data-k="time">
        <input type="number" placeholder="Salas" value="${m.rooms||1}" min="1" style="width:70px" data-si="${i}" data-k="rooms">
        <select data-si="${i}" data-k="status">${STATUS_OPT.map(([v,l])=>`<option value="${v}"${m.status===v?' selected':''}>${l}</option>`).join('')}</select>
        <div class="sch-vis"><label><input type="checkbox" data-si="${i}" data-k="visible"${m.visible?' checked':''}> Visible</label></div>
        <button class="btn-rm" data-rm-sch="${i}">✕</button>`;
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
  });
  $('#sch-list').addEventListener('click', e => {
    const rm = e.target.closest('[data-rm-sch]');
    if(rm) { data.schedule.splice(Number(rm.dataset.rmSch),1); renderSchedule(); markDirty(); }
  });
  $('#sch-add').addEventListener('click', () => {
    data.schedule.push({id:uuid(),phase:'',group:'',date:'',time:'',rooms:1,status:'proximo',visible:false,note:''});
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

  function renderResults() {
    const list = $('#results-list');
    list.innerHTML = '';
    (data.results||[]).forEach((g,gi) => {
      const div = document.createElement('div');
      div.className = 'result-group';
      const rowsHtml = (g.rows||[]).map((r,ri) => `
        <div class="result-row">
          <span class="rr-pos">${ri+1}</span>
          <input type="text" value="${esc(r.team||'')}" placeholder="Equipo" data-gi="${gi}" data-ri="${ri}" data-k="team">
          <input type="text" value="${esc(r.logo_serial||'')}" placeholder="Logo" style="width:54px" title="Serial logo (ej: 001)" data-gi="${gi}" data-ri="${ri}" data-k="logo_serial">
          <input type="number" value="${r.kills||0}" min="0" placeholder="Kills" data-gi="${gi}" data-ri="${ri}" data-k="kills">
          <input type="number" value="${r.placement||0}" min="0" placeholder="P.Pos" data-gi="${gi}" data-ri="${ri}" data-k="placement">
          <input type="number" value="${r.penalty||0}" min="0" placeholder="Pen." data-gi="${gi}" data-ri="${ri}" data-k="penalty">
        </div>`).join('');
      div.innerHTML = `
        <div class="result-group-head">
          <input type="text" value="${esc(g.title||'')}" placeholder="Título del grupo" data-gi="${gi}" data-k="title" style="flex:1">
          <select data-gi="${gi}" data-k="phase">${PHASES.map(p=>`<option${g.phase===p?' selected':''}>${p}</option>`).join('')}</select>
          <input type="number" value="${g.qualify||0}" min="0" style="width:70px" title="Equipos que clasifican" data-gi="${gi}" data-k="qualify">
          <button class="hbtn-ia" data-ia-group="${gi}" title="Llenar con IA (Haiku)">⚡ IA</button>
          <button class="btn-rm" data-rm-group="${gi}">✕</button>
        </div>
        <div class="ia-panel" id="ia-panel-${gi}" hidden>
          <p style="font-size:.75rem;color:var(--gray);margin:0 0 8px">Pegá los resultados en bruto. La IA (Haiku) detecta kills y puntos de posición para cada equipo del grupo.</p>
          <textarea class="ia-raw" placeholder="Sala 1: PUMAS GG 5 kills pos2, RED WINE 3 kills pos1…&#10;Sala 2: …" style="width:100%;min-height:80px;background:var(--surface);border:1px solid var(--border);color:var(--light);padding:8px;font-size:.82rem;resize:vertical"></textarea>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px">
            <label style="font-size:.75rem;color:var(--gray)">Salas: <input type="number" class="ia-salas" value="1" min="1" max="6" style="width:48px;padding:4px 6px;background:var(--surface);border:1px solid var(--border);color:var(--light)"></label>
            <label style="font-size:.75rem;color:var(--gray)">Pts/Kill: <input type="number" class="ia-pts" value="1" min="0" max="99" style="width:48px;padding:4px 6px;background:var(--surface);border:1px solid var(--border);color:var(--light)"></label>
            <button class="hbtn gold ia-call" data-ia-call="${gi}">⚡ Calcular con IA</button>
            <button class="hbtn dim ia-close" data-ia-close="${gi}">Cerrar</button>
          </div>
          <p class="ia-status" style="font-size:.75rem;margin:6px 0 0;min-height:18px"></p>
        </div>
        <div class="result-rows" data-rows="${gi}">
          ${rowsHtml}
          <button class="btn-add" data-add-row="${gi}" style="margin-top:8px">+ Fila</button>
        </div>`;
      list.appendChild(div);
    });
  }
  $('#results-list').addEventListener('input', e => {
    const el = e.target; const gi = Number(el.dataset.gi); const k = el.dataset.k;
    if(k===undefined||isNaN(gi)) return;
    const ri = Number(el.dataset.ri);
    if(!isNaN(ri) && el.dataset.ri!==undefined) {
      data.results[gi].rows[ri][k] = (k==='team'||k==='logo_serial') ? el.value : (Number(el.value)||0);
      touchedGroups.add(data.results[gi].id);
    } else {
      data.results[gi][k] = k==='qualify'?Number(el.value)||0:el.value;
    }
    markDirty();
  });
  $('#results-list').addEventListener('click', async e => {
    const rm = e.target.closest('[data-rm-group]');
    if(rm){ data.results.splice(Number(rm.dataset.rmGroup),1); renderResults(); markDirty(); return; }
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
      const gi=iabtn.dataset.iaGroup;
      const panel=document.getElementById(`ia-panel-${gi}`);
      if(panel){ panel.hidden=!panel.hidden; if(!panel.hidden) panel.querySelector('.ia-raw').focus(); }
    }
    // IA close
    const iaclose = e.target.closest('[data-ia-close]');
    if(iaclose){ const panel=document.getElementById(`ia-panel-${iaclose.dataset.iaClose}`); if(panel) panel.hidden=true; }
    // IA call
    const iacall = e.target.closest('[data-ia-call]');
    if(iacall) await callIA(Number(iacall.dataset.iaCall), iacall);
  });

  async function callIA(gi, btn) {
    const panel = document.getElementById(`ia-panel-${gi}`);
    if(!panel) return;
    const rawText = panel.querySelector('.ia-raw').value.trim();
    if(!rawText){ toast('Pegá los resultados primero', true); return; }
    const numSalas = parseInt(panel.querySelector('.ia-salas').value)||1;
    const ptsKill  = parseInt(panel.querySelector('.ia-pts').value)||1;
    const status   = panel.querySelector('.ia-status');
    const teams    = (data.results[gi]?.rows||[]).map(r=>r.team).filter(Boolean);

    btn.disabled=true; status.textContent='Consultando IA…'; status.style.color='var(--gray)';
    try {
      const res = await fetch(IA_URL, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ raw_text:rawText, num_salas:numSalas, pts_kill:ptsKill, teams })
      });
      if(!res.ok){ const e=await res.text(); throw new Error(`API ${res.status}: ${e}`); }
      const { equipos } = await res.json();
      if(!equipos?.length) throw new Error('La IA no detectó equipos');

      let aplicados=0;
      equipos.forEach(eq => {
        const ri = data.results[gi].rows.findIndex(r => normTeam(r.team)===normTeam(eq.nombre));
        if(ri<0) return;
        const totalKills = eq.kills.slice(0,numSalas).reduce((a,b)=>a+(+b||0),0);
        const totalTop   = eq.top.slice(0,numSalas).reduce((a,b)=>a+(+b||0),0);
        data.results[gi].rows[ri].kills     = totalKills;
        data.results[gi].rows[ri].placement = totalTop;
        aplicados++;
      });
      touchedGroups.add(data.results[gi].id);
      renderResults(); markDirty();
      status.textContent=`✔ ${aplicados} equipo(s) actualizados. Revisá y guardá.`;
      status.style.color='#B6FF00';
      if(typeof _IC !== 'undefined') _IC.generar(gi, data);
    } catch(err) {
      status.textContent='Error: '+err.message;
      status.style.color='#FCA5A5';
    } finally { btn.disabled=false; }
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
  PHASES.forEach(p => { const o=document.createElement('option'); o.value=o.textContent=p; bulkPhaseEl.appendChild(o); });
  $('#results-bulk-toggle').addEventListener('click', () => {
    bulkPanel.hidden = !bulkPanel.hidden;
    if(!bulkPanel.hidden) $('#bulk-title').focus();
  });
  $('#bulk-cancel').addEventListener('click', () => { bulkPanel.hidden=true; });
  $('#bulk-create').addEventListener('click', () => {
    const names = ($('#bulk-names').value||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
    if(!names.length){ toast('Escribe al menos un equipo',true); return; }
    const title = ($('#bulk-title').value||'').trim() || 'Grupo '+String.fromCharCode(65+data.results.length);
    const phase = bulkPhaseEl.value || PHASES[0];
    const rows = names.map(t=>({id:uuid(),team:t,logo_serial:'',kills:0,placement:0,penalty:0}));
    const g = {id:uuid(),phase,title,kind:'grupo',qualify:0,rows};
    data.results.push(g);
    touchedGroups.add(g.id);
    renderResults(); markDirty();
    $('#bulk-names').value=''; $('#bulk-title').value='';
    bulkPanel.hidden=true;
    toast(`Grupo "${title}" creado con ${rows.length} equipos`);
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

})();
