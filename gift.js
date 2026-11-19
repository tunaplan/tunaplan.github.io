/* 보상: 놓는 순간 내 장이 번호 매긴 엽서가 되어 돌아온다.
   - 앞: 내 장 + `폭 03 · 07/10` (에디션 번호)
   - 뒤: 내가 본 한 줄 · 보낸 소인 · 받는 이 n.n. · (다음 사람이 이으면) 받음 소인
   - 저장: 스토리 이미지(9:16) · 실물 엽서 1장 인쇄
   - 폭이 닫히면: 완성본 속 내 칸에만 남색 홈질 테두리 — 스토리 이미지로 */
window.NN_GIFT = (function(){
  const IND = 'rgb(40,62,104)', INK = '#44474c', FAINT = '#a2a7ac', PAPER = '#f2f3f1', SHEET = '#f7f8f6';
  const pad2 = n => String(n).padStart(2,'0');
  const esc = t => String(t||'').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  // ── 내 장 기억 (이 폰에만) ──
  const mine = {
    ids(){ try{ return JSON.parse(localStorage.getItem('nn-mine') || '[]'); }catch(e){ return []; } },
    add(id){ try{ const a = mine.ids(); if(!a.includes(id)) a.push(id); localStorage.setItem('nn-mine', JSON.stringify(a.slice(-200))); }catch(e){} },
    has(id){ return mine.ids().includes(id); },
    keep(id, d){ try{ // 내 장 원본은 최근 3장만 폰에 (서버는 맨 끝 장 전체를 내주지 않으므로)
      const k = JSON.parse(localStorage.getItem('nn-mine-keep') || '[]').filter(x => x.id !== id);
      k.push({id, ...d}); while(k.length > 3) k.shift();
      localStorage.setItem('nn-mine-keep', JSON.stringify(k)); }catch(e){} },
    kept(id){ try{ return JSON.parse(localStorage.getItem('nn-mine-keep') || '[]').find(x => x.id === id); }catch(e){ return null; } }
  };

  // ── 소인: 이중 원, 날짜·시각, 살짝 기울고 잉크가 고르지 않게 ──
  function postmark(label, at, rot){
    const [d, t] = String(at||'').split(' ');
    return `<svg class="pm" viewBox="0 0 60 60" style="transform:rotate(${rot||-8}deg)" aria-hidden="true">
      <defs><filter id="pmr${label}"><feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="1" seed="${label.length*7}"/>
        <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.2 1.6"/><feComposite in="SourceGraphic" operator="in"/></filter></defs>
      <g filter="url(#pmr${label})" fill="none" stroke="#6b7075" stroke-width=".8">
        <circle cx="30" cy="30" r="27"/><circle cx="30" cy="30" r="22"/>
        <text x="30" y="17" text-anchor="middle" fill="#6b7075" stroke="none" font-size="5" letter-spacing="1" font-family="Noto Serif KR">${label}</text>
        <text x="30" y="32" text-anchor="middle" fill="#6b7075" stroke="none" font-size="6.4" letter-spacing=".3" font-family="Noto Serif KR">${esc(d||'')}</text>
        <text x="30" y="41" text-anchor="middle" fill="#6b7075" stroke="none" font-size="5.4" letter-spacing=".6" font-family="Noto Serif KR">${esc(t||'')}</text>
      </g></svg>`;
  }

  // ── 엽서 한 장 (화면) ──
  let cur = null;
  const el = document.createElement('div'); el.id = 'gift';
  el.innerHTML = `<div class="g-stage"><div class="g-pc"><div class="g-face g-front"></div><div class="g-face g-back"></div></div></div>
    <div class="g-tools"><button class="g-save">저장</button><button class="g-print">엽서</button><button class="g-close">닫기</button></div>
    <div class="g-hint"></div>`;
  document.body.appendChild(el);
  const front = el.querySelector('.g-front'), back = el.querySelector('.g-back'), pc = el.querySelector('.g-pc');
  pc.addEventListener('click', () => pc.classList.toggle('flip'));
  el.querySelector('.g-close').addEventListener('click', () => document.body.classList.remove('gifting'));

  function open(d){
    cur = d;
    front.innerHTML = `<div class="g-pic"><img src="${d.img}" alt=""></div>
      <div class="g-cap"><span>폭 ${d.rollNo} · ${pad2(d.n)}${d.size ? '/' + pad2(d.size) : ''}</span><em>${esc(d.title)}</em><time>${esc(d.at)}</time></div>`;
    const W = d.whole ? window.NN_EDGE.whole(d.whole.sheets, d.whole.size || d.whole.sheets.length, d.whole.form, d.id, 'var(--mm)') : '';
    back.innerHTML = `${W}
      <div class="g-rule"></div>
      <div class="g-rec"><b>${pad2(d.n)}${d.size ? `<small>/${pad2(d.size)}</small>` : ''}</b>${esc(d.title) ? esc(d.title) + '<br>' : ''}<span>폭 ${d.rollNo}</span></div>
      <div class="g-pms">${postmark('보냄', d.at, -8)}${d.got ? postmark('받음', d.got, 11) : '<i class="g-stamp"></i>'}</div>
      <div class="g-to"><span>받는 이</span> n.n.</div>`;
    pc.classList.remove('flip');
    el.querySelector('.g-hint').textContent = d.got ? '' : '다음 사람이 이으면, 뒷면에 받음 소인이 찍혀요';
    document.body.classList.add('gifting');
  }

  // ── 캔버스 도우미 ──
  const load = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src; });
  async function fontReady(){ try{ await document.fonts.load('300 20px "Noto Serif KR"'); await document.fonts.load('200 20px "Noto Serif KR"'); }catch(e){} }
  function cover(x, im, dx, dy, dw, dh){
    if(!im) return;
    const s = Math.max(dw/im.naturalWidth, dh/im.naturalHeight), w = im.naturalWidth*s, h = im.naturalHeight*s;
    x.save(); x.beginPath(); x.rect(dx, dy, dw, dh); x.clip(); x.drawImage(im, dx+(dw-w)/2, dy+(dh-h)/2, w, h); x.restore();
  }
  function grain(x, W, H){
    const g = x.getImageData(0, 0, W, H), a = g.data;
    for(let i = 0; i < a.length; i += 4){ const n = (Math.random()-.5)*7; a[i]+=n; a[i+1]+=n; a[i+2]+=n; }
    x.putImageData(g, 0, 0);
  }
  function stitch(x, x0, y0, x1, y1){
    x.save(); x.strokeStyle = 'rgba(40,62,104,.7)'; x.lineWidth = 3; x.setLineDash([11, 6]);
    x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke(); x.restore();
  }
  function text(x, s, X, Y, size, color, weight, align, spacing){
    x.save(); x.fillStyle = color; x.textAlign = align || 'left';
    x.font = `${weight||300} ${size}px "Noto Serif KR", serif`;
    if('letterSpacing' in x) x.letterSpacing = (spacing||0) + 'px';
    x.fillText(s, X, Y); x.restore();
  }
  const blobOf = c => new Promise(r => c.toBlob(r, 'image/png'));
  async function share(blob, name){
    const f = new File([blob], name, {type:'image/png'});
    if(navigator.canShare && navigator.canShare({files:[f]})){ try{ await navigator.share({files:[f]}); return; }catch(e){ if(e && e.name === 'AbortError') return; } }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
  }

  // ── 스토리(9:16): 가운데 내 엽서, 위엔 내가 본 가장자리, 아래엔 아직 비어 있는 다음 자리 ──
  async function storyCard(d){
    await fontReady();
    const W = 1080, H = 1920, c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d'); x.fillStyle = PAPER; x.fillRect(0, 0, W, H);
    const cw = 760, ch = cw*1.48, cx = (W-cw)/2, cy = 300;
    // 위: 내가 본 한 줄
    if(d.seen){ const s = await load(d.seen); const sh = cw*.86*120/750; x.globalAlpha = .85; cover(x, s, cx + cw*.07, cy - sh - 46, cw*.86, sh); x.globalAlpha = 1;
      stitch(x, cx + cw*.07, cy - 46, cx + cw*.93, cy - 46); }
    // 엽서
    x.save(); x.shadowColor = 'rgba(68,71,76,.16)'; x.shadowBlur = 30; x.shadowOffsetY = 8; x.fillStyle = SHEET; x.fillRect(cx, cy, cw, ch); x.restore();
    const pw = cw*.86, ph = pw*4/3, px = cx + cw*.07, py = cy + cw*.14;
    cover(x, await load(d.img), px, py, pw, ph);
    x.strokeStyle = 'rgba(68,71,76,.12)'; x.lineWidth = 1; x.strokeRect(px, py, pw, ph);
    const capY = cy + ch - cw*.08;
    text(x, `폭 ${d.rollNo} · ${pad2(d.n)}${d.size ? '/' + pad2(d.size) : ''}`, px, capY, 26, INK, 300, 'left', 4);
    if(d.title) text(x, d.title, px + 250, capY, 26, INK, 300, 'left', 1);
    text(x, d.at || '', px + pw, capY, 22, FAINT, 300, 'right', 2);
    // 모서리 구멍
    x.fillStyle = PAPER; x.beginPath(); x.arc(cx + cw*.07, cy + cw*.07, cw*.02, 0, 7); x.fill();
    // 아래: 다음 자리 (비어 있음)
    x.save(); x.strokeStyle = 'rgba(162,167,172,.6)'; x.setLineDash([8, 8]); x.lineWidth = 2;
    x.strokeRect(cx + cw*.07, cy + ch + 46, cw*.86, cw*.86*120/750); x.restore();
    // 서명
    text(x, 'n.n.', 120, H - 150, 34, INK, 200, 'left', 10);
    text(x, 'tunaplan.github.io', W - 120, H - 150, 22, FAINT, 300, 'right', 3);
    grain(x, W, H);
    return blobOf(c);
  }

  // ── 완성본(9:16): 폭 전체, 내 칸에만 남색 홈질 테두리 ──
  async function storyRoll(r, mineIds, rno){
    await fontReady();
    const E = window.NN_EDGE, W = 1080, H = 1920, c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d'); x.fillStyle = PAPER; x.fillRect(0, 0, W, H);
    const ss = r.sheets || [], snake = (r.form || 'line') === 'snake';
    const cols = snake ? 2 : 1, rows = snake ? Math.ceil(ss.length/2) : ss.length;
    const top = 250, bottom = 330, gap = 3;
    let cw = (W - 240 - gap*(cols-1)) / cols, chh = cw*4/3;
    const maxH = H - top - bottom; if(rows*chh + gap*(rows-1) > maxH){ chh = (maxH - gap*(rows-1)) / rows; cw = chh*3/4; }
    const gw = cols*cw + gap*(cols-1), gx = (W - gw)/2;
    const imgs = await Promise.all(ss.map(s => load(s.img)));
    const pos = s => snake ? E.cellOf(s.n) : {r: s.n-1, col: 0};
    ss.forEach((s, i) => { const p = pos(s), X = gx + p.col*(cw+gap), Y = top + p.r*(chh+gap);
      x.fillStyle = SHEET; x.fillRect(X, Y, cw, chh); cover(x, imgs[i], X, Y, cw, chh); });
    ss.forEach(s => { if(!mineIds.includes(s.id)) return; const p = pos(s), X = gx + p.col*(cw+gap), Y = top + p.r*(chh+gap);
      stitch(x, X, Y, X+cw, Y); stitch(x, X+cw, Y, X+cw, Y+chh); stitch(x, X+cw, Y+chh, X, Y+chh); stitch(x, X, Y+chh, X, Y); });
    text(x, `폭 ${rno}`, 120, 150, 28, INK, 300, 'left', 6);
    text(x, `${r.size}장`, W - 120, 150, 24, FAINT, 300, 'right', 4);
    text(x, r.title || '', 120, H - 230, 40, INK, 200, 'left', 2);
    text(x, `${r.from} — ${r.to}`, 120, H - 180, 22, FAINT, 300, 'left', 3);
    text(x, 'n.n.', 120, H - 110, 30, INK, 200, 'left', 10);
    text(x, 'tunaplan.github.io', W - 120, H - 110, 22, FAINT, 300, 'right', 3);
    grain(x, W, H);
    return blobOf(c);
  }

  el.querySelector('.g-save').addEventListener('click', async () => {
    if(!cur) return; const b = await storyCard(cur); share(b, `n.n.-${cur.rollNo}-${pad2(cur.n)}.png`);
  });
  el.querySelector('.g-print').addEventListener('click', () => {
    if(!cur) return;
    try{ localStorage.setItem('nn-print', JSON.stringify(cur)); }catch(e){}
    window.open('print.html?card', '_blank');
  });

  return {open, mine, storyCard, storyRoll, share, postmark};
})();
