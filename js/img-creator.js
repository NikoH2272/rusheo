/* ─── img-creator.js — Generador de imágenes de resultados ─── */
/* Llamado desde admin-panel.js después del cálculo con IA      */

const _IC = (() => {
  const W = 1080;
  const GOLD  = '#FFC21A';
  const LIME  = '#B6FF00';
  const BG    = '#08090B';
  const GRAY  = '#A8ADB6';
  const WHITE = '#F4F5F7';

  function score(r, pts) {
    return (r.kills || 0) * (pts || 1) + (r.placement || 0) - (r.penalty || 0);
  }
  function sorted(rows, pts) {
    return [...rows].sort((a, b) => score(b, pts) - score(a, pts));
  }
  function download(canvas, name) {
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = name; a.click();
  }
  function loadLogo(serial) {
    return new Promise(res => {
      if (!serial) { res(null); return; }
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = () => res(null);
      img.src = `assets/teams/${String(serial).padStart(3, '0')}.png`;
    });
  }
  function rRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }
  function circle(ctx, cx, cy, r, logo, fallback, color) {
    if (logo) {
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
      ctx.drawImage(logo, cx - r, cy - r, r * 2, r * 2);
      ctx.restore();
    } else {
      ctx.fillStyle = color + '22';
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = color;
      ctx.font = `700 ${Math.round(r * 0.5)}px "Barlow Condensed", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(fallback.slice(0, 3).toUpperCase(), cx, cy + Math.round(r * 0.18));
    }
  }

  /* ─── Tabla General ─── */
  async function tabla(group, rows, pts) {
    const list = sorted(rows, pts);
    const ROW = 74, HEAD = 188, FOOT = 64;
    const H = HEAD + ROW * list.length + FOOT;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const c = cv.getContext('2d');

    c.fillStyle = BG; c.fillRect(0, 0, W, H);

    const g = c.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, GOLD); g.addColorStop(1, LIME);
    c.fillStyle = g; c.fillRect(0, 0, W, 4);

    c.fillStyle = WHITE;
    c.font = '800 54px "Barlow Condensed", sans-serif';
    c.textAlign = 'center';
    c.fillText((group.title || 'Resultados').toUpperCase(), W / 2, 72);
    c.fillStyle = GOLD;
    c.font = '600 26px "Barlow Condensed", sans-serif';
    c.fillText((group.phase || '').toUpperCase(), W / 2, 108);

    c.fillStyle = '#2a2e36'; c.fillRect(40, 120, W - 80, 1);

    const cx = { pos: 54, logo: 112, name: 176, kills: 660, place: 800, total: 940 };
    c.fillStyle = GRAY;
    c.font = '600 20px "Inter", sans-serif';
    c.textAlign = 'left';
    c.fillText('#', cx.pos, 152);
    c.fillText('EQUIPO', cx.name, 152);
    c.textAlign = 'center';
    c.fillText('KILLS', cx.kills + 44, 152);
    c.fillText('P.POS', cx.place + 44, 152);
    c.fillText('TOTAL', cx.total + 44, 152);
    c.fillStyle = '#2a2e36'; c.fillRect(40, 162, W - 80, 1);

    const logos = await Promise.all(list.map(r => loadLogo(r.logo_serial)));

    for (let i = 0; i < list.length; i++) {
      const r = list[i];
      const y = HEAD + i * ROW;
      const sc = score(r, pts);

      if (i === 0) {
        const rg = c.createLinearGradient(0, y, W, y);
        rg.addColorStop(0, 'rgba(255,194,26,.12)'); rg.addColorStop(1, 'transparent');
        c.fillStyle = rg;
      } else {
        c.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,.025)' : 'transparent';
      }
      c.fillRect(0, y, W, ROW);

      const my = y + ROW / 2;
      const rankClr = [GOLD, '#C0C0C0', '#CD7F32'][i] || WHITE;
      c.fillStyle = rankClr;
      c.font = `800 ${i < 3 ? 32 : 26}px "Barlow Condensed", sans-serif`;
      c.textAlign = 'center';
      c.fillText(String(i + 1), cx.pos, my + 10);

      circle(c, cx.logo + 22, my, 23, logos[i], r.team || '?', rankClr);

      c.fillStyle = i === 0 ? GOLD : WHITE;
      c.font = `${i === 0 ? 700 : 600} ${i === 0 ? 30 : 26}px "Barlow Condensed", sans-serif`;
      c.textAlign = 'left';
      const nm = (r.team || '').toUpperCase();
      c.fillText(nm.length > 24 ? nm.slice(0, 24) + '…' : nm, cx.name, my + 10);

      c.textAlign = 'center';
      c.fillStyle = i === 0 ? GOLD : WHITE;
      c.font = '700 26px "Barlow Condensed", sans-serif';
      c.fillText(String(r.kills || 0),     cx.kills + 44, my + 10);
      c.fillText(String(r.placement || 0), cx.place + 44, my + 10);
      c.fillStyle = i === 0 ? LIME : WHITE;
      c.font = '800 30px "Barlow Condensed", sans-serif';
      c.fillText(String(sc), cx.total + 44, my + 10);
    }

    c.fillStyle = '#2a2e36'; c.fillRect(40, H - FOOT, W - 80, 1);
    c.fillStyle = GRAY;
    c.font = '400 18px "Inter", sans-serif';
    c.textAlign = 'center';
    c.fillText('QUALIFER RUSHEO', W / 2, H - 18);

    return cv;
  }

  /* ─── Top 3 ─── */
  async function top3(group, rows, pts) {
    const list = sorted(rows, pts).slice(0, 3);
    while (list.length < 3) list.push({ team: '—', kills: 0, placement: 0, penalty: 0, logo_serial: '' });

    const H = 1350;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const c = cv.getContext('2d');

    c.fillStyle = BG; c.fillRect(0, 0, W, H);

    const bg = c.createRadialGradient(W/2, H*0.5, 0, W/2, H*0.5, W*0.7);
    bg.addColorStop(0, 'rgba(255,194,26,.04)'); bg.addColorStop(1, 'transparent');
    c.fillStyle = bg; c.fillRect(0, 0, W, H);

    const grd = c.createLinearGradient(0, 0, W, 0);
    grd.addColorStop(0, GOLD); grd.addColorStop(1, LIME);
    c.fillStyle = grd; c.fillRect(0, 0, W, 4);

    c.fillStyle = WHITE;
    c.font = '900 80px "Barlow Condensed", sans-serif';
    c.textAlign = 'center';
    c.fillText('TOP 3', W / 2, 100);
    c.fillStyle = GOLD;
    c.font = '600 30px "Barlow Condensed", sans-serif';
    c.fillText((group.title || '').toUpperCase(), W / 2, 140);

    const logos = await Promise.all(list.map(r => loadLogo(r.logo_serial)));

    const cfg = [
      { i: 1, x: W * 0.21, podioY: 1060, podioH: 220, clr: '#C0C0C0', rank: '2°', rFS: 68 },
      { i: 0, x: W * 0.50, podioY: 1000, podioH: 280, clr: GOLD,      rank: '1°', rFS: 88 },
      { i: 2, x: W * 0.79, podioY: 1090, podioH: 190, clr: '#CD7F32', rank: '3°', rFS: 60 },
    ];

    for (const p of cfg) {
      const r = list[p.i];
      const sc = score(r, pts);
      const cx = p.x;
      const pw = 230, ph = p.podioH, px = cx - pw / 2;

      const pg = c.createLinearGradient(px, p.podioY, px, p.podioY + ph);
      pg.addColorStop(0, p.clr + '33'); pg.addColorStop(1, p.clr + '11');
      c.fillStyle = pg;
      rRect(c, px, p.podioY, pw, ph, 8); c.fill();
      c.strokeStyle = p.clr + '55'; c.lineWidth = 1.5;
      rRect(c, px, p.podioY, pw, ph, 8); c.stroke();

      c.fillStyle = p.clr;
      c.font = `900 ${p.rFS}px "Barlow Condensed", sans-serif`;
      c.textAlign = 'center';
      c.fillText(p.rank, cx, p.podioY + ph / 2 + p.rFS * 0.33);

      const logoR = p.i === 0 ? 78 : 64;
      const logoY = p.podioY - logoR - 16;
      circle(c, cx, logoY, logoR, logos[p.i], r.team || '?', p.clr);
      c.strokeStyle = p.clr; c.lineWidth = 3;
      c.beginPath(); c.arc(cx, logoY, logoR + 5, 0, Math.PI * 2); c.stroke();

      c.fillStyle = WHITE;
      c.font = `700 ${p.i === 0 ? 34 : 28}px "Barlow Condensed", sans-serif`;
      c.textAlign = 'center';
      const nm = (r.team || '').toUpperCase();
      c.fillText(nm.length > 15 ? nm.slice(0, 15) + '…' : nm, cx, logoY - logoR - 16);

      c.fillStyle = p.clr;
      c.font = `800 ${p.i === 0 ? 46 : 36}px "Barlow Condensed", sans-serif`;
      c.fillText(sc + ' pts', cx, logoY - logoR - 52);
    }

    c.fillStyle = '#2a2e36'; c.fillRect(40, H - 58, W - 80, 1);
    c.fillStyle = GRAY;
    c.font = '400 20px "Inter", sans-serif';
    c.textAlign = 'center';
    c.fillText('QUALIFER RUSHEO', W / 2, H - 20);

    return cv;
  }

  /* ─── Campeón ─── */
  async function campeon(group, rows, pts) {
    const list = sorted(rows, pts);
    const r = list[0] || { team: '—', kills: 0, placement: 0, penalty: 0, logo_serial: '' };
    const sc = score(r, pts);

    const cv = document.createElement('canvas');
    cv.width = W; cv.height = W;
    const c = cv.getContext('2d');

    c.fillStyle = BG; c.fillRect(0, 0, W, W);

    const bg = c.createRadialGradient(W/2, W/2, 0, W/2, W/2, W * 0.65);
    bg.addColorStop(0, 'rgba(255,194,26,.09)'); bg.addColorStop(1, 'transparent');
    c.fillStyle = bg; c.fillRect(0, 0, W, W);

    // Corner brackets
    const m = 44, ll = 88;
    c.strokeStyle = GOLD + '44'; c.lineWidth = 2.5;
    [[m, m+ll, m, m, m+ll, m], [W-m-ll, m, W-m, m, W-m, m+ll],
     [m, W-m-ll, m, W-m, m+ll, W-m], [W-m-ll, W-m, W-m, W-m, W-m, W-m-ll]]
      .forEach(([x1,y1,x2,y2,x3,y3]) => { c.beginPath(); c.moveTo(x1,y1); c.lineTo(x2,y2); c.lineTo(x3,y3); c.stroke(); });

    // CAMPEON watermark
    c.font = '900 148px "Barlow Condensed", sans-serif';
    c.fillStyle = GOLD + '14'; c.textAlign = 'center';
    c.fillText('CAMPEÓN', W / 2, W / 2 + 60);

    // Trophy (simple)
    const tx = W / 2, ty = 160;
    c.fillStyle = GOLD;
    c.beginPath();
    c.moveTo(tx - 58, ty); c.quadraticCurveTo(tx - 78, ty + 82, tx - 28, ty + 108);
    c.lineTo(tx - 18, ty + 130); c.lineTo(tx + 18, ty + 130); c.lineTo(tx + 28, ty + 108);
    c.quadraticCurveTo(tx + 78, ty + 82, tx + 58, ty); c.closePath(); c.fill();
    c.fillRect(tx - 64, ty - 12, 128, 18);
    c.fillRect(tx - 28, ty + 130, 56, 10);
    c.fillRect(tx - 44, ty + 140, 88, 14);

    // Logo
    const logo = await loadLogo(r.logo_serial);
    const lr = 108, ly = 498;
    circle(c, W/2, ly, lr, logo, r.team || '?', GOLD);
    c.strokeStyle = GOLD; c.lineWidth = 5;
    c.beginPath(); c.arc(W/2, ly, lr + 8, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = LIME + '55'; c.lineWidth = 2;
    c.beginPath(); c.arc(W/2, ly, lr + 22, 0, Math.PI * 2); c.stroke();

    // Name
    c.fillStyle = WHITE;
    c.font = '900 90px "Barlow Condensed", sans-serif';
    c.textAlign = 'center';
    const nm = (r.team || '').toUpperCase();
    c.fillText(nm.length > 17 ? nm.slice(0, 17) + '…' : nm, W / 2, 682);

    c.fillStyle = GOLD;
    c.font = '600 30px "Barlow Condensed", sans-serif';
    c.fillText((group.title || '').toUpperCase(), W / 2, 720);

    c.fillStyle = LIME;
    c.font = '800 74px "Barlow Condensed", sans-serif';
    c.fillText(sc + ' pts', W / 2, 816);

    c.fillStyle = GRAY;
    c.font = '500 24px "Inter", sans-serif';
    c.fillText(`${r.kills} kills · ${r.placement} pts posición`, W / 2, 856);

    const bg2 = c.createLinearGradient(0, 0, W, 0);
    bg2.addColorStop(0, GOLD); bg2.addColorStop(1, LIME);
    c.fillStyle = bg2; c.fillRect(0, W - 6, W, 6);

    c.fillStyle = GRAY;
    c.font = '500 20px "Inter", sans-serif';
    c.textAlign = 'center';
    c.fillText('QUALIFER RUSHEO', W / 2, W - 18);

    return cv;
  }

  /* ─── UI de descarga dentro del ia-panel ─── */
  async function generar(gi, data) {
    const group = data.results[gi];
    if (!group) return;
    const panel = document.getElementById(`ia-panel-${gi}`);
    if (!panel) return;

    // Si ya existe la sección, solo actualizar estado
    let sec = panel.querySelector('.ia-img-section');
    if (!sec) {
      sec = document.createElement('div');
      sec.className = 'ia-img-section';
      sec.style.cssText = 'margin-top:12px;padding-top:12px;border-top:1px solid var(--border)';
      sec.innerHTML = `
        <p style="font-size:.74rem;color:var(--gray);margin:0 0 8px">📸 Imágenes listas:</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="hbtn gold" data-img="tabla" style="letter-spacing:.05em">↓ Tabla</button>
          <button class="hbtn dim"  data-img="top3"  style="letter-spacing:.05em">↓ Top 3</button>
          <button class="hbtn dim"  data-img="campeon" style="letter-spacing:.05em">↓ Campeón</button>
        </div>
        <p class="ia-img-st" style="font-size:.73rem;color:var(--gray);margin:5px 0 0;min-height:16px"></p>`;
      panel.appendChild(sec);

      sec.querySelector('div').addEventListener('click', async e => {
        const btn = e.target.closest('[data-img]');
        if (!btn) return;
        const type = btn.dataset.img;
        const st = sec.querySelector('.ia-img-st');
        btn.disabled = true;
        st.textContent = 'Generando imagen…'; st.style.color = 'var(--gray)';
        try {
          const g2 = data.results[gi];
          const r2 = (g2.rows || []).filter(r => r.team);
          const pts = parseInt(panel.querySelector('.ia-pts')?.value) || 1;
          let cv;
          if (type === 'tabla')   cv = await tabla(g2, r2, pts);
          else if (type === 'top3') cv = await top3(g2, r2, pts);
          else                    cv = await campeon(g2, r2, pts);
          const slug = (g2.title || 'grupo').toLowerCase().replace(/[^a-z0-9]+/g, '-');
          download(cv, `rusheo-${type}-${slug}.png`);
          st.textContent = '✔ Descargado'; st.style.color = '#B6FF00';
        } catch (err) {
          st.style.color = '#FCA5A5'; st.textContent = 'Error: ' + err.message;
        } finally { btn.disabled = false; }
      });
    }

    const st = sec.querySelector('.ia-img-st');
    st.textContent = 'Datos actualizados — descargá las imágenes.';
    st.style.color = '#B6FF00';
  }

  return { generar };
})();
