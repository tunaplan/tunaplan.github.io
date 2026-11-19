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
  const rno = id => pad2(Math.max(0, id - 1));   // 폭 번호는 00부터: 첫 폭(두 사람이 만드는 폭 00)
  const esc = t => String(t||'').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const cnt = {set textContent(v){}};
  // 메뉴 셋: 만들기(진행 중인 폭) · 만들어진 것(닫힌 폭들) · 책처럼(책장)
  let view = 'make';
  const navs = [...document.querySelectorAll('.bar nav a')];
  navs.forEach(a => a.addEventListener('click', ()=>{ view = a.dataset.v; document.body.classList.remove('far'); render(); app.scrollTo({top:0}); }));

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
    navs.forEach(a => a.classList.toggle('on', a.dataset.v === view));
    if(view === 'made') return renderMade();
    if(view === 'book') return renderShelf();
    // 진행 중인 폭
    const no = (board.closed.length && !board.closed[0].example ? board.closed[0].id : 0) + 1;   // 다음 폭의 id
    const head = document.createElement('div'); head.className = 'roll current';
    head.innerHTML = `<span>폭 ${board.open ? rno(board.open.id) : rno(no)}</span><em></em><time>${size ? pad2(rows.length)+' / '+pad2(size) : ''}</time>`;
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
  }
  // 만들어진 것: 닫힌 폭들 — 누구나 본다. 모두 펼쳐진 채로.
  function renderMade(){
    if(!board.closed.length){ chain.innerHTML = '<div class="empty">아직 닫힌 폭이 없어요</div>'; return; }
    board.closed.forEach(r => {
      const h = document.createElement('div'); h.className = 'roll closed';
      h.innerHTML = `<span>폭 ${rno(r.id)}</span><em>${esc(r.title)}</em><time>${esc(r.from)} — ${esc((r.to||'').slice(5))} · ${r.size}장</time><span class="bk">엮음</span>`;
      h.addEventListener('click', ()=>openBook(r));
      chain.appendChild(h);
      (r.sheets||[]).forEach(row => chain.appendChild(sheetItem(row, false)));
    });
  }
  // 책처럼: 판지 표지들이 꽂힌 책장. 누르면 책으로.
  function renderShelf(){
    if(!board.closed.length){ chain.innerHTML = '<div class="empty">아직 엮인 책이 없어요</div>'; return; }
    const sh = document.createElement('div'); sh.className = 'shelf';
    sh.innerHTML = board.closed.map((r,i) => `<div class="bk-item" data-i="${i}"><div class="pc cover">
        <div class="face front board"><div class="t deboss" style="left:calc(var(--mm)*12);top:calc(var(--mm)*14)">n.n.</div>
          <div class="t deboss cv-name">${esc(r.title) || '&nbsp;'}</div>
          <div class="t deboss" style="right:calc(var(--mm)*12);bottom:calc(var(--mm)*12)">폭 ${rno(r.id)}</div><i class="hole"></i></div>${RING}</div>
        <div class="meta">폭 ${rno(r.id)}  ${esc(r.title)}<br><span>${esc(r.from)} — ${esc((r.to||'').slice(5))} · ${r.size}장</span></div></div>`).join('');
    sh.querySelectorAll('.bk-item').forEach(el => el.addEventListener('click', ()=>openBook(board.closed[+el.dataset.i])));
    chain.appendChild(sh);
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

  /* 책: 표지 → (본 것 · 그린 것) × 장 수 → 판권. 엽서 크기, 흑백, 한 쪽씩 옆으로 */
  const book = document.getElementById('book'), pages = book.querySelector('.pages'), pn = book.querySelector('.pn');
  const KOR = ['','하나','둘','셋','넷','다섯','여섯','일곱','여덟','아홉','열'];
  // 링: 무광 은색 금속(=잠금 화면의 바늘) + 남색 실 매듭(=실). 구멍을 지나, 카드 뒤로 넘어가는 반쪽은 카드에 가려진다.
  const RING = `<svg class="ring" viewBox="0 0 30 30" aria-hidden="true">
    <defs>
      <linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7c838a"/><stop offset=".35" stop-color="#eef0f1"/>
        <stop offset=".55" stop-color="#b9bec3"/><stop offset=".8" stop-color="#f4f5f6"/><stop offset="1" stop-color="#868d94"/></linearGradient>
      <mask id="behind"><rect width="30" height="30" fill="#fff"/><rect x="12" y="12" width="30" height="30" fill="#000"/></mask>
      <filter id="rs" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation=".45"/></filter>
    </defs>
    <!-- 카드 뒤로 지나가는 반쪽: 카드 밖에서만 보인다 -->
    <path d="M19.1 19.1 A11 4 45 0 0 3.6 3.6" fill="none" stroke="#5f666c" stroke-width="1.5" mask="url(#behind)" opacity=".9"/>
    <path d="M19.1 19.1 A11 4 45 0 0 3.6 3.6" fill="none" stroke="url(#rg)" stroke-width="1.1" mask="url(#behind)"/>
    <!-- 카드 위로 지나가는 반쪽 + 종이에 드리운 그림자 -->
    <path d="M3.6 3.6 A11 4 45 0 0 19.1 19.1" fill="none" stroke="rgba(40,44,52,.22)" stroke-width="1.4" filter="url(#rs)" transform="translate(.5 .9)"/>
    <path d="M3.6 3.6 A11 4 45 0 0 19.1 19.1" fill="none" stroke="#5f666c" stroke-width="1.5"/>
    <path d="M3.6 3.6 A11 4 45 0 0 19.1 19.1" fill="none" stroke="url(#rg)" stroke-width="1.1"/>
    <path d="M3.6 3.6 A11 4 45 0 0 19.1 19.1" fill="none" stroke="rgba(255,255,255,.7)" stroke-width=".25" transform="translate(-.25 -.2)"/>
    <!-- 남색 실 매듭: 링에 두 번 감기고 짧은 꼬리 -->
    <g stroke="${IND}" stroke-linecap="round" fill="none">
      <path d="M6.6 11.2 l1.6 -1.9" stroke-width=".7"/><path d="M7.5 11.9 l1.6 -1.9" stroke-width=".7"/>
      <path d="M8 11.6 q.6 2.4 -.6 4.6 q-.5 1 .2 2" stroke-width=".45"/>
      <path d="M7.6 18.2 l.5 .7 M7.6 18.2 l-.3 .8" stroke-width=".2" opacity=".7"/>
    </g>
  </svg>`;
  const card = (front, back, cls='') => `<div class="pg"><div class="pc ${cls}">
      <div class="face front ${cls==='cover'?'board':''}">${front}<i class="hole"></i></div>
      <div class="face back">${back}<i class="hole"></i></div>${RING}</div></div>`;
  const postBack = (rec) => `<div class="pcrule"></div>${rec}
      <i class="stamp"></i>${[0,1,2].map(i=>`<i class="addr" style="top:calc(var(--mm)*${78+i*12})"></i>`).join('')}`;
  function openBook(r){
    const ss = r.sheets || [], no = rno(r.id);
    const period = `${esc(r.from)} — ${esc(r.to)}`;
    // 표지 엽서: 앞 = 눌러 찍은 이름 / 뒤 = 각자가 본 한 줄들
    let html = card(
      `<div class="t deboss" style="left:calc(var(--mm)*12);top:calc(var(--mm)*14)">n.n.</div>
       <div class="t deboss cv-name">${esc(r.title) || '&nbsp;'}</div>
       <div class="t deboss" style="right:calc(var(--mm)*12);bottom:calc(var(--mm)*12)">폭 ${no}</div>`,
      `<div class="stack">${ss.map(x=>`<div><img src="${x.img}" alt=""></div>`).join('')}</div>
       <div class="t f" style="left:calc(var(--mm)*7);bottom:calc(var(--mm)*8)">${period} · ${r.size}장</div>
       <div class="t f" style="right:calc(var(--mm)*7);bottom:calc(var(--mm)*8)">tu.:na.</div>`, 'cover');
    // 한 장 = 엽서 한 장: 앞 = 그린 것 / 뒤 = 본 것 + 기록
    ss.forEach((x,i)=>{
      const prev = ss[i-1];
      html += card(
        `<div class="pic"><img src="${x.img}" alt=""></div>
         <div class="t cap"><span>${pad2(x.n)}</span><em>${esc(x.title)}</em><span class="f">${esc(x.at)}</span></div>`,
        `${prev ? `<div class="seen"><img src="${prev.img}" alt=""></div>` : `<div class="seen none"></div>`}
         ${postBack(`<div class="t rec"><b>${pad2(x.n)}</b>${esc(x.title) ? esc(x.title)+'<br>' : ''}<span class="f">${esc(x.at)}</span><br><span class="f">폭 ${no} · n.n.</span></div>`)}`);
    });
    // 판권 엽서
    html += card(
      `<div class="t" style="left:calc(var(--mm)*12);right:calc(var(--mm)*12);bottom:calc(var(--mm)*22);line-height:2">
         폭 ${no}<br>${esc(r.title) || '<span class="f">이름 없음</span>'}<br><span class="f">${period}</span><br>
         ${r.size}장 · <span class="f">이름 모를 ${KOR[r.size]||r.size}</span><br><br><span class="f">n.n. — 비워 둔 이름</span></div>
       <div class="t f" style="left:calc(var(--mm)*12);top:calc(var(--mm)*14)">n.n.</div>
       <div class="t f" style="right:calc(var(--mm)*7);bottom:calc(var(--mm)*8)">tu.:na.</div>`,
      postBack(''));
    pages.innerHTML = html; pages.scrollLeft = 0;
    book.querySelector('.pr').href = `print.html?roll=${r.id}${DEMO ? '&demo' : ''}`;
    pages.querySelectorAll('.pc').forEach(pc => pc.addEventListener('click', e => {
      if(matchMedia('(orientation:landscape)').matches) return;
      e.stopPropagation(); pc.classList.toggle('flip');
    }));
    const total = pages.children.length;
    const upd = ()=>{ pn.textContent = `${pad2(Math.round(pages.scrollLeft / innerWidth) + 1)} / ${pad2(total)}`; };
    pages.onscroll = upd; upd();
    document.body.classList.add('reading');
  }
  book.querySelector('.bx').addEventListener('click', ()=>document.body.classList.remove('reading'));
  pages.addEventListener('click', e=>{                       // 왼쪽 끝/오른쪽 끝을 누르면 한 쪽씩
    const w = innerWidth, x = e.clientX;
    if(x < w*.18) pages.scrollBy({left:-w, behavior:'smooth'});
    else if(x > w*.82) pages.scrollBy({left:w, behavior:'smooth'});
  });

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
      if(!board.closed.length && window.NN_EXAMPLE) board.closed = [window.NN_EXAMPLE];   // 진짜 폭이 생기기 전까지만 예시 폭 00
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
