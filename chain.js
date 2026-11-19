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
    requestAnimationFrame(()=>{ stitch(seams); watch(); whenOpened(intro); });
  }

  // 실: 맞닿은 자리를 꿰매고, 놓을 수 있는 사람에게만 빈 자리로 바늘이 늘어진다
  // 실 한 가닥: 첫 장부터 끝 장까지 가장자리를 홈질하듯 들락날락 꿰어 내려간다.
  // 서로 다른 목소리들이 한 줄로 묶여 함께 울린다. 맞닿은 자리는 감침질로 한 번 더.
  function stitch(seams){
    seams.innerHTML = '';
    const sh = [...chain.querySelectorAll('.sheet')];
    const next = chain.querySelector('.next');
    const w = chain.clientWidth, x0 = w*0.07;
    const xs = y => x0 + Math.sin(y/70)*2.4 + Math.sin(y/23)*.8;
    let html = '';
    let yEnd = next ? next.offsetTop : 0;
    if(sh.length){
      const y1 = sh[0].offsetTop + 16;
      let d = '';
      for(let y=y1; y<=yEnd; y+=6) d += (d?' L':'M') + xs(y).toFixed(1) + ' ' + y.toFixed(1);
      html += `<path d="${d}" fill="none" stroke="${IND}" stroke-width="1.35" stroke-linecap="round" stroke-dasharray="9 7" opacity=".82"/>`;
      html += `<path d="${d}" fill="none" stroke="rgba(255,255,255,.28)" stroke-width=".6" stroke-dasharray="2 3 4 7" opacity=".9"/>`;
      for(let i=1;i<sh.length;i++){
        const y = sh[i].offsetTop;
        for(let k=0;k<3;k++){
          const x = xs(y) + 5 + k*7;
          html += `<line x1="${(x-2.5).toFixed(1)}" y1="${y-5}" x2="${(x+2.5).toFixed(1)}" y2="${y+5}" stroke="${IND}" stroke-width="1.2" stroke-linecap="round" opacity=".8"/>`;
        }
      }
    }
    seams.innerHTML = html;
    if(!next) return;
    const ex = xs(yEnd), ey = yEnd;
    const g = document.createElementNS(NS,'g');
    if(canPlace){                                   // 바늘이 빈 자리로 늘어져 다음 사람을 기다린다
      g.innerHTML =
        `<path d="M${ex} ${ey} Q${ex-10} ${ey+70} ${ex+8} ${ey+120}" fill="none" stroke="${IND}" stroke-width="1.15" stroke-linecap="round"/>`+
        `<line x1="${ex+4}" y1="${ey+112}" x2="${ex+11}" y2="${ey+150}" stroke="#a9aeb3" stroke-width="1.3" stroke-linecap="round"/>`;
      g.style.animation = 'sway 7s ease-in-out infinite';
    } else if(sh.length){                           // 놓을 수 없는 사람에겐 풀린 실 끝만
      g.innerHTML = `<path d="M${ex} ${ey} Q${ex-4} ${ey+12} ${ex+2} ${ey+24}" fill="none" stroke="${IND}" stroke-width="1.1" stroke-linecap="round" opacity=".55"/>`;
    }
    g.style.transformOrigin = `${ex}px ${ey}px`;
    seams.appendChild(g);
  }

  /* 물러서서 전체 보기: 두 손가락으로 오므리면 한 폭으로, 벌리거나 한 장을 누르면 다시 가까이 */
  function farScale(){
    const nx = chain.querySelector('.next'); if(!nx) return 1;
    const H = nx.offsetTop + nx.offsetHeight;
    const avail = innerHeight - chain.getBoundingClientRect().top - 40 + app.scrollTop;
    return Math.max(.08, Math.min(1, avail / H));
  }
  function setFar(on, instant){
    if(on){
      chain.querySelectorAll('.sheet').forEach(s=>s.classList.add('seen'));
      chain.style.setProperty('--fs', farScale());
      app.scrollTo({top:0, behavior: instant ? 'auto' : 'smooth'});
    }
    if(instant){ chain.style.transition = 'none'; requestAnimationFrame(()=>requestAnimationFrame(()=>chain.style.transition = '')); }
    document.body.classList.toggle('far', on);
  }
  let pinch0 = 0;
  const dist = t => Math.hypot(t[0].clientX-t[1].clientX, t[0].clientY-t[1].clientY);
  app.addEventListener('touchstart', e=>{ if(e.touches.length===2) pinch0 = dist(e.touches); }, {passive:true});
  app.addEventListener('touchmove', e=>{
    if(e.touches.length!==2 || !pinch0) return;
    const r = dist(e.touches)/pinch0;
    if(r < .78 && !document.body.classList.contains('far')){ setFar(true); pinch0 = 0; }
    else if(r > 1.25 && document.body.classList.contains('far')){ setFar(false); pinch0 = 0; }
  }, {passive:true});
  chain.addEventListener('click', e=>{
    if(!document.body.classList.contains('far')) return;
    const s = e.target.closest('.sheet, .next');
    e.stopPropagation();
    setFar(false);
    if(s) setTimeout(()=>s.scrollIntoView({behavior:'smooth', block:'start'}), 900);
  }, true);

  // 처음 들어올 때: 먼저 전체가 한 폭으로 보이고, 천천히 첫 장으로 다가간다
  let introDone = false;
  function intro(){
    if(introDone || chain.querySelectorAll('.sheet').length < 2) return;
    introDone = true;
    setFar(true, true);
    setTimeout(()=>setFar(false), 2600);
  }
  function whenOpened(fn){
    if(document.body.classList.contains('opened')) return fn();
    new MutationObserver((_, o)=>{ if(document.body.classList.contains('opened')){ o.disconnect(); setTimeout(fn, 900); } })
      .observe(document.body, {attributes:true, attributeFilter:['class']});
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
