/* 안쪽: 이어 붙인 장들
   - 보는 건 누구나. 놓는 건 초대 링크(#k=…)를 받은 사람만.
   - 맨 끝 장은 아래 가장자리 한 줄만 받아온다(서버가 전체를 내주지 않음). */
(function(){
  const SB = 'https://esxwkzsvxlacymduuncw.supabase.co';
  const PK = 'sb_publishable_nP5mWJBUMS1bJ_sSWAIlow_rBq3FKGy';
  const NS = 'http://www.w3.org/2000/svg';
  const IND = 'rgb(40,62,104)';
  const app = document.getElementById('app');
  const chain = document.getElementById('chain');

  async function rpc(fn, body){
    const r = await fetch(`${SB}/rest/v1/rpc/${fn}`, {
      method:'POST', headers:{apikey:PK, 'Content-Type':'application/json'}, body:JSON.stringify(body||{})
    });
    const j = await r.json().catch(()=>null);
    if(!r.ok) throw new Error((j && (j.message||j.hint)) || ('http '+r.status));
    return j;
  }

  // 초대 열쇠: 링크 끝 #k=… 를 한 번 받으면 이 폰이 기억한다
  let key = null, canPlace = false;
  try{
    const m = location.hash.match(/k=([\w-]+)/);
    if(m){ localStorage.setItem('nn-key', m[1]); history.replaceState(null, '', location.pathname); }
    key = localStorage.getItem('nn-key');
  }catch(e){}

  // board = { open: {id,size,sheets:[…]} | null, closed: [{id,size,title,from,to,sheets}] }
  let board = {open:null, closed:[]}, rows = [], size = null, lastId = null, lifting = new Set();

  const pad2 = n => String(n).padStart(2,'0');
  const esc = t => String(t||'').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const cnt = document.querySelector('.bar .cnt');

  // 안쪽은 규칙: 꽉 찬 장, 번호·제목·시각, 1px 선. 기울임·흐림·느린 등장 없음.
  function sheetItem(row, folded){
    const it = document.createElement('section'); it.className = 'item';
    it.innerHTML = `<div class="label"><span>${pad2(row.n)}</span><em>${esc(row.title)}</em><time>${esc(row.at)}</time></div>`;
    const s = document.createElement('div'); s.className = 'sheet' + (folded ? ' last' : '');
    const im = new Image(); im.decoding = 'async'; im.src = row.img; im.alt = '';
    im.className = folded ? 'strip' : 'pic';
    s.appendChild(im);
    if(folded){ const f = document.createElement('div'); f.className = 'fold'; s.appendChild(f); }
    if(lifting.has(row.id)){                                     // 방금 펼쳐진 장
      const f = document.createElement('div'); f.className = 'fold'; s.appendChild(f);
      setTimeout(()=>f.classList.add('lift'), 350); setTimeout(()=>f.remove(), 900);
    }
    it.appendChild(s);
    return it;
  }
  function render(){
    chain.innerHTML = '';
    // 진행 중인 폭
    const no = (board.closed.length ? board.closed[0].id : 0) + 1;
    const head = document.createElement('div'); head.className = 'roll current';
    head.innerHTML = `<span>폭 ${pad2(board.open ? board.open.id : no)}</span><em></em><time>${size ? pad2(rows.length)+' / '+pad2(size) : ''}</time>`;
    chain.appendChild(head);
    rows.forEach((row, i) => chain.appendChild(sheetItem(row, i === rows.length-1)));
    cnt.textContent = size ? `${pad2(rows.length)} / ${pad2(size)}` : '';
    const it = document.createElement('section'); it.className = 'item';
    it.innerHTML = `<div class="label"><span>${pad2(rows.length+1)}</span><em></em><time></time></div>`;
    const next = document.createElement('div'); next.className = 'next';
    if(canPlace){                                                // 바늘이 빈 자리로 늘어져 있다
      next.innerHTML = `<svg viewBox="0 0 40 170"><path d="M20 0 Q12 70 26 120" fill="none" stroke="${IND}" stroke-width="1.15" stroke-linecap="round"/>`+
        `<line x1="22" y1="112" x2="29" y2="150" stroke="#a9aeb3" stroke-width="1.3" stroke-linecap="round"/></svg>`;
    }
    next.addEventListener('click', ()=>{
      if(canPlace) return openCompose();
      if(DEMO){                                                  // 예시: 다음 장이 놓인 순간처럼 마지막 장을 펼친다
        const ls = chain.querySelector('.sheet.last'); if(!ls) return;
        ls.querySelector('img').className = 'pic';
        const f = ls.querySelector('.fold'); f && f.classList.add('lift');
      }
    });
    it.appendChild(next); chain.appendChild(it);
    // 닫힌 폭들 — 누구나 본다. 모두 펼쳐진 채로.
    board.closed.forEach(r => {
      const h = document.createElement('div'); h.className = 'roll';
      h.innerHTML = `<span>폭 ${pad2(r.id)}</span><em>${esc(r.title)}</em><time>${esc(r.from)} — ${esc((r.to||'').slice(5))} · ${r.size}장</time>`;
      chain.appendChild(h);
      (r.sheets||[]).forEach(row => chain.appendChild(sheetItem(row, false)));
    });
  }

  /* 물러서서 전체 보기: 두 손가락으로 오므리면 한 폭으로, 벌리거나 한 장을 누르면 다시 가까이 */
  function farScale(){
    const H = chain.scrollHeight - parseFloat(getComputedStyle(chain).paddingBottom);
    return Math.max(.06, Math.min(1, (innerHeight - 44 - 24) / H));
  }
  function setFar(on){
    if(on){ chain.style.setProperty('--fs', farScale()); app.scrollTo({top:0}); }
    document.body.classList.toggle('far', on);
  }
  let pinch0 = 0;
  const dist = t => Math.hypot(t[0].clientX-t[1].clientX, t[0].clientY-t[1].clientY);
  app.addEventListener('touchstart', e=>{ if(e.touches.length===2) pinch0 = dist(e.touches); }, {passive:true});
  app.addEventListener('touchmove', e=>{
    if(e.touches.length!==2 || !pinch0) return;
    const k = dist(e.touches)/pinch0;
    if(k < .78 && !document.body.classList.contains('far')){ setFar(true); pinch0 = 0; }
    else if(k > 1.25 && document.body.classList.contains('far')){ setFar(false); pinch0 = 0; }
  }, {passive:true});
  chain.addEventListener('click', e=>{
    if(!document.body.classList.contains('far')) return;
    const it = e.target.closest('.item');
    e.stopPropagation(); setFar(false);
    if(it) setTimeout(()=>it.scrollIntoView({block:'start'}), 520);
  }, true);

  /* 한 장만: 가까이서 한 장을 누르면 그 장 혼자 선다. 번호와 날짜만 곁에. */
  const solo = document.createElement('div'); solo.id = 'solo';
  solo.innerHTML = '<img alt=""><div class="meta"><span></span><time></time></div>';
  document.body.appendChild(solo);
  chain.addEventListener('click', e=>{
    if(document.body.classList.contains('far')) return;
    const s = e.target.closest('.sheet'); if(!s || s.classList.contains('last')) return;
    const im = s.querySelector('img.pic'); if(!im) return;
    const lab = s.parentElement.querySelector('.label');
    solo.querySelector('img').src = im.src;
    solo.querySelector('.meta span').textContent = lab.querySelector('span').textContent + (lab.querySelector('em').textContent ? '   ' + lab.querySelector('em').textContent : '');
    solo.querySelector('.meta time').textContent = lab.querySelector('time').textContent;
    document.body.classList.add('solo');
  });
  solo.addEventListener('click', ()=>document.body.classList.remove('solo'));

  const DEMO = /[?&]demo/.test(location.search) && window.NN_DEMO;
  async function load(){
    if(DEMO){ board = DEMO; canPlace = false; }
    else {
      try{ board = await rpc('board') || {open:null, closed:[]}; board.closed = board.closed || []; }
      catch(e){ board = {open:null, closed:[]}; }
    }
    rows = board.open ? board.open.sheets || [] : [];
    size = board.open ? board.open.size : null;
    lastId = rows.length ? rows[rows.length-1].id : null;
    render();
  }

  /* ── 한 장 놓기 ── */
  const cp = document.getElementById('compose');
  const cStrip = cp.querySelector('.cstrip'), paper = cp.querySelector('.cpaper');
  const photoEl = cp.querySelector('.cphoto'), ink = cp.querySelector('.cink');
  const note = cp.querySelector('.cnote'), file = cp.querySelector('input[type=file]');
  const ictx = ink.getContext('2d');
  let photo = null, inked = false, busy = false;
  let strokes = [], t0 = 0, stroke = null, pick = 6;     // 책을 위해: 획의 순서·좌표·시간을 그대로
  const cTitle = cp.querySelector('.ctitle'), cRoll = cp.querySelector('.crolltitle'), cNo = cp.querySelector('.cno');
  cp.querySelectorAll('.csize b').forEach(b => b.addEventListener('click', ()=>{
    cp.querySelectorAll('.csize b').forEach(x => x.classList.toggle('on', x === b)); pick = +b.dataset.n;
  }));

  function sizeInk(){
    const rc = paper.getBoundingClientRect(), d = Math.min(3, devicePixelRatio||1);
    ink.width = Math.round(rc.width*d); ink.height = Math.round(rc.height*d);
    ictx.setTransform(d,0,0,d,0,0);
    ictx.lineCap = ictx.lineJoin = 'round'; ictx.strokeStyle = '#44474c'; ictx.lineWidth = 1.8;
  }
  function clearAll(){
    ictx.save(); ictx.setTransform(1,0,0,1,0,0); ictx.clearRect(0,0,ink.width,ink.height); ictx.restore();
    photo = null; photoEl.removeAttribute('src'); photoEl.style.display = 'none'; inked = false; file.value = '';
    strokes = []; stroke = null;                      // 지운 시도는 남기지 않는다
  }
  function openCompose(){
    note.textContent = '';
    const prev = rows[rows.length-1];
    if(prev){ cStrip.src = prev.img; cStrip.style.display = ''; } else { cStrip.removeAttribute('src'); cStrip.style.display = 'none'; }
    const first = !board.open, n = rows.length + 1, total = first ? pick : size;
    cp.classList.toggle('first', first);
    cp.classList.toggle('final', !first && n === size);
    cNo.textContent = pad2(n); cTitle.value = ''; cRoll.value = ''; t0 = performance.now();
    document.body.classList.add('composing');
    requestAnimationFrame(()=>{ sizeInk(); clearAll(); });
  }
  function closeCompose(){ document.body.classList.remove('composing'); }
  cp.querySelector('.cclose').addEventListener('click', closeCompose);
  cp.querySelector('.cclear').addEventListener('click', clearAll);

  let last = null;
  const pos = e => { const rc = ink.getBoundingClientRect(); return [e.clientX-rc.left, e.clientY-rc.top]; };
  const rec = p => { const rc = ink.getBoundingClientRect();
    stroke && stroke.p.push([+(p[0]/rc.width).toFixed(4), +(p[1]/rc.height).toFixed(4), Math.round(performance.now()-t0)]); };
  ink.addEventListener('pointerdown', e=>{ ink.setPointerCapture(e.pointerId); last = pos(e);
    stroke = {p:[]}; strokes.push(stroke); rec(last); });
  ink.addEventListener('pointermove', e=>{
    if(!last) return;
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for(const ev of evs){
      const p = pos(ev);
      ictx.beginPath(); ictx.moveTo(last[0],last[1]);
      ictx.quadraticCurveTo(last[0],last[1],(last[0]+p[0])/2,(last[1]+p[1])/2);
      ictx.lineTo(p[0],p[1]); ictx.stroke(); last = p; inked = true; rec(p);
    }
  });
  const up = ()=>{ last = null; stroke = null; };
  ink.addEventListener('pointerup', up); ink.addEventListener('pointercancel', up);

  file.addEventListener('change', ()=>{
    const f = file.files && file.files[0]; if(!f) return;
    const url = URL.createObjectURL(f), im = new Image();
    im.onload = ()=>{ photo = im; photoEl.src = url; photoEl.style.display = ''; };
    im.src = url;
  });

  // 사진 원본(책용): 긴 변 1600px, 자르지 않고 그대로
  function original(){
    if(!photo) return null;
    const k = Math.min(1, 1600 / Math.max(photo.naturalWidth, photo.naturalHeight));
    const c = document.createElement('canvas'); c.width = Math.round(photo.naturalWidth*k); c.height = Math.round(photo.naturalHeight*k);
    c.getContext('2d').drawImage(photo, 0, 0, c.width, c.height);
    let q = .86, u; do { u = c.toDataURL('image/jpeg', q); q -= .08; } while(u.length > 1350000 && q > .4);
    return u;
  }
  function compose(q){
    const W = 750, H = 1000, c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d');
    x.fillStyle = '#f7f8f6'; x.fillRect(0,0,W,H);
    if(photo){
      const s = Math.max(W/photo.naturalWidth, H/photo.naturalHeight);
      const w = photo.naturalWidth*s, h = photo.naturalHeight*s;
      x.drawImage(photo, (W-w)/2, (H-h)/2, w, h);
    }
    x.drawImage(ink, 0, 0, W, H);
    const sc = document.createElement('canvas'); sc.width = W; sc.height = 120;
    sc.getContext('2d').drawImage(c, 0, H-120, W, 120, 0, 0, W, 120);
    return {img: c.toDataURL('image/jpeg', q), strip: sc.toDataURL('image/jpeg', .8)};
  }

  cp.querySelector('.cplace').addEventListener('click', async ()=>{
    if(busy || (!inked && !photo)) return;
    busy = true; note.textContent = '';
    let out, q = .82;
    do { out = compose(q); q -= .1; } while(out.img.length > 680000 && q > .3);
    try{
      const prev = lastId;
      const res = await rpc('place2', {
        k:key, after_id:lastId, pimg:out.img, pstrip:out.strip,
        ptitle: cTitle.value.trim() || null,
        psize: board.open ? null : pick,
        proll: cp.classList.contains('final') ? (cRoll.value.trim() || null) : null,
        pstrokes: strokes.length ? strokes : null,
        pphoto: original()
      });
      navigator.vibrate && navigator.vibrate(res && res.closed ? [15,60,15] : 15);
      lifting = new Set([prev, res && res.closed ? res.id : null]);
      closeCompose(); await load();
      setTimeout(()=>{ lifting = new Set(); }, 50);
      setTimeout(()=>{                                   // 방금 펼쳐진 장으로 (폭이 닫혔으면 그 폭 머리로)
        const t = res && res.closed ? chain.querySelector('.roll:not(.current)') : [...chain.querySelectorAll('.item')].slice(-3)[0];
        t && t.scrollIntoView({block:'start'});
      }, 60);
    }catch(e){
      const m = String(e.message||'');
      if(m.includes('moved')){
        note.textContent = '그새 누군가 이어 놓았어요';
        await load(); openStripOnly();
      } else if(m.includes('no key')){
        note.textContent = '이 링크로는 놓을 수 없어요';
        try{ localStorage.removeItem('nn-key'); }catch(_){}
        canPlace = false;
      } else {
        note.textContent = '잠시 뒤에 다시';
      }
    }
    busy = false;
  });
  function openStripOnly(){
    const prev = rows[rows.length-1];
    if(prev){ cStrip.src = prev.img; cStrip.style.display = ''; }
  }

  

  (async ()=>{
    if(key && !DEMO){ try{ canPlace = !!(await rpc('can_place', {k:key})); }catch(e){ canPlace = false; } }
    load();
  })();
})();
