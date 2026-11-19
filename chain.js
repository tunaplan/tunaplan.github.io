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

  let rows = [], lastId = null, lifting = null;
  const r = (a,b) => a + (b-a)*Math.random();

  function render(){
    chain.innerHTML = '';
    rows.forEach((row, i) => {
      const last = i === rows.length-1;
      const s = document.createElement('div'); s.className = 'sheet' + (last ? ' last' : '');
      const h = (row.id * 2654435761) % 1000 / 1000;          // 장마다 정해진 작은 어긋남
      s.style.left = ((h-.5)*20).toFixed(1)+'px';
      s.style.rotate = ((((h*7)%1)-.5)*1.4).toFixed(2)+'deg';
      const im = new Image(); im.decoding = 'async'; im.src = row.img; im.alt = '';
      im.className = last ? 'strip' : 'pic';
      s.appendChild(im);
      const t = document.createElement('time'); t.textContent = row.d; s.appendChild(t);
      if(last){ const v = document.createElement('div'); v.className = 'veil'; s.appendChild(v); }
      if(row.id === lifting){                                    // 방금 걷힌 장
        const v = document.createElement('div'); v.className = 'veil'; s.appendChild(v);
        setTimeout(()=>v.classList.add('lift'), 500); setTimeout(()=>v.remove(), 3000);
      }
      chain.appendChild(s);
    });
    const next = document.createElement('div'); next.className = 'next' + (canPlace ? ' open' : '');
    next.addEventListener('click', ()=>{
      if(canPlace) return openCompose();
      if(DEMO){                                         // 예시: 다음 장이 놓인 순간처럼 마지막 천을 걷는다
        const ls = chain.querySelector('.sheet.last'); if(!ls) return;
        const v = ls.querySelector('.veil'); ls.querySelector('img').className = 'pic';
        v && v.classList.add('lift');
      }
    });
    chain.appendChild(next);
    const seams = document.createElementNS(NS,'svg'); seams.setAttribute('class','seams');
    chain.appendChild(seams);
    requestAnimationFrame(()=>{ stitch(seams); watch(); });
  }

  // 실: 맞닿은 자리를 꿰매고, 놓을 수 있는 사람에게만 빈 자리로 바늘이 늘어진다
  function stitch(seams){
    seams.innerHTML = '';
    const sh = [...chain.querySelectorAll('.sheet, .next')];
    const w = chain.clientWidth;
    for(let i=1;i<sh.length;i++){
      const y = sh[i].offsetTop;
      for(let j=0;j<5;j++){
        const x = w*(0.14 + 0.72*j/4) + Math.sin(i*7+j*3)*3;
        const l = document.createElementNS(NS,'line');
        l.setAttribute('x1',x-2); l.setAttribute('y1',y-5); l.setAttribute('x2',x+2); l.setAttribute('y2',y+5);
        l.setAttribute('stroke',IND); l.setAttribute('stroke-width','1.2'); l.setAttribute('stroke-linecap','round');
        l.setAttribute('opacity', i===sh.length-1 ? '.35' : '.85');
        seams.appendChild(l);
      }
    }
    if(!canPlace) return;
    const last = sh[sh.length-1];
    const y0 = last.offsetTop + (sh.length>1 ? -5 : 0), x0 = w*0.86 + 2;
    const g = document.createElementNS(NS,'g');
    g.innerHTML =
      `<path d="M${x0} ${y0} Q${x0+14} ${y0+70} ${x0-6} ${y0+120}" fill="none" stroke="${IND}" stroke-width="1.15" stroke-linecap="round"/>`+
      `<line x1="${x0-9}" y1="${y0+112}" x2="${x0-2}" y2="${y0+150}" stroke="#a9aeb3" stroke-width="1.3" stroke-linecap="round"/>`;
    g.style.transformOrigin = `${x0}px ${y0}px`;
    g.style.animation = 'sway 7s ease-in-out infinite';
    seams.appendChild(g);
  }

  const io = new IntersectionObserver(es=>es.forEach(e=>{
    if(e.isIntersecting){ e.target.classList.add('seen'); io.unobserve(e.target); }
  }), {root:app, threshold:.12});
  const watch = () => chain.querySelectorAll('.sheet:not(.seen)').forEach(s=>io.observe(s));

  const DEMO = /[?&]demo/.test(location.search) && window.NN_DEMO;
  async function load(){
    if(DEMO){ rows = DEMO; lastId = rows[rows.length-1].id; canPlace = false; render(); return; }
    try{
      rows = await rpc('chain') || [];
      lastId = rows.length ? rows[rows.length-1].id : null;
    }catch(e){ rows = []; lastId = null; }
    render();
  }

  /* ── 한 장 놓기 ── */
  const cp = document.getElementById('compose');
  const cStrip = cp.querySelector('.cstrip'), paper = cp.querySelector('.cpaper');
  const photoEl = cp.querySelector('.cphoto'), ink = cp.querySelector('.cink');
  const note = cp.querySelector('.cnote'), file = cp.querySelector('input[type=file]');
  const ictx = ink.getContext('2d');
  let photo = null, inked = false, busy = false;

  function sizeInk(){
    const rc = paper.getBoundingClientRect(), d = Math.min(3, devicePixelRatio||1);
    ink.width = Math.round(rc.width*d); ink.height = Math.round(rc.height*d);
    ictx.setTransform(d,0,0,d,0,0);
    ictx.lineCap = ictx.lineJoin = 'round'; ictx.strokeStyle = '#44474c'; ictx.lineWidth = 1.8;
  }
  function clearAll(){
    ictx.save(); ictx.setTransform(1,0,0,1,0,0); ictx.clearRect(0,0,ink.width,ink.height); ictx.restore();
    photo = null; photoEl.removeAttribute('src'); photoEl.style.display = 'none'; inked = false; file.value = '';
  }
  function openCompose(){
    note.textContent = '';
    const prev = rows[rows.length-1];
    if(prev){ cStrip.src = prev.img; cStrip.style.display = ''; } else { cStrip.removeAttribute('src'); cStrip.style.display = 'none'; }
    document.body.classList.add('composing');
    requestAnimationFrame(()=>{ sizeInk(); clearAll(); });
  }
  function closeCompose(){ document.body.classList.remove('composing'); }
  cp.querySelector('.cclose').addEventListener('click', closeCompose);
  cp.querySelector('.cclear').addEventListener('click', clearAll);

  let last = null;
  const pos = e => { const rc = ink.getBoundingClientRect(); return [e.clientX-rc.left, e.clientY-rc.top]; };
  ink.addEventListener('pointerdown', e=>{ ink.setPointerCapture(e.pointerId); last = pos(e); });
  ink.addEventListener('pointermove', e=>{
    if(!last) return;
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for(const ev of evs){
      const p = pos(ev);
      ictx.beginPath(); ictx.moveTo(last[0],last[1]);
      ictx.quadraticCurveTo(last[0],last[1],(last[0]+p[0])/2,(last[1]+p[1])/2);
      ictx.lineTo(p[0],p[1]); ictx.stroke(); last = p; inked = true;
    }
  });
  const up = ()=>{ last = null; };
  ink.addEventListener('pointerup', up); ink.addEventListener('pointercancel', up);

  file.addEventListener('change', ()=>{
    const f = file.files && file.files[0]; if(!f) return;
    const url = URL.createObjectURL(f), im = new Image();
    im.onload = ()=>{ photo = im; photoEl.src = url; photoEl.style.display = ''; };
    im.src = url;
  });

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
      await rpc('place', {k:key, after:lastId, img:out.img, strip:out.strip});
      navigator.vibrate && navigator.vibrate(15);
      lifting = prev;
      closeCompose(); await load(); lifting = null;
      setTimeout(()=>{ const n = chain.querySelector('.next'); n && n.scrollIntoView({behavior:'smooth', block:'center'}); }, 300);
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

  addEventListener('resize', ()=>{ const s = chain.querySelector('svg.seams'); s && stitch(s); });

  (async ()=>{
    if(key && !DEMO){ try{ canPlace = !!(await rpc('can_place', {k:key})); }catch(e){ canPlace = false; } }
    load();
  })();
})();
