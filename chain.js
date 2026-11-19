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

  const {edgeOf, cellOf, edgeURL} = window.NN_EDGE;
  const formOf = r => (r && r.form) || 'line';
  const GIFT = window.NN_GIFT;
  const nowAt = () => { const d = new Date(), p = n => String(n).padStart(2,'0');
    return `${d.getFullYear()}.${p(d.getMonth()+1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`; };
  // 내 엽서 데이터: 폭·번호·이미지·내가 본 한 줄·소인 시각들
  async function giftData(row, roll, imgOverride){
    const form = formOf(roll), list = roll.sheets || [], prev = list.find(x => x.n === row.n - 1);
    const kept = GIFT.mine.kept(row.id);
    const seen = kept && kept.seen ? kept.seen : (prev ? await edgeURL(prev.strip || prev.img, edgeOf(prev.n, form), !!prev.strip) : null);
    const lastN = list.length ? list[list.length-1].n : 0;
    const wsheets = list.map(x => ({id: x.id, n: x.n, img: x.id === row.id ? (imgOverride || (kept && kept.img) || x.img) : x.img,
      folded: !roll.closed_at && roll === board.open && x.n === lastN && x.id !== row.id}));
    return {id: row.id, img: imgOverride || (kept && kept.img) || row.img, seen, n: row.n, size: roll.size, rollNo: rno(roll.id),
      title: row.title || '', at: row.at, got: row.got || null, whole: {sheets: wsheets, size: roll.size, form}};
  }
  const pad2 = n => String(n).padStart(2,'0');
  const rno = id => pad2(Math.max(0, id - 1));   // 폭 번호는 00부터: 첫 폭(두 사람이 만드는 폭 00)
  const esc = t => String(t||'').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const cnt = {set textContent(v){}};
  // 메뉴 셋: 만들기(진행 중인 폭) · 만들어진 것(닫힌 폭들) · 책처럼(책장)
  let view = 'make', revealRoll = null;
  const qp = new URLSearchParams(location.search), linkRoll = +qp.get('roll') || null;   // ?roll=번호(내부 id)로 바로 그 폭에
  if(linkRoll) view = 'made';
  // 자리 잡기(5분): 누군가 잇는 중이면 그 끝나는 시각. 내 자리면 token.
  let heldUntil = null, token = null, myUntil = null;
  const mmss = ms => { const t = Math.max(0, Math.ceil(ms/1000)); return `${Math.floor(t/60)}:${String(t%60).padStart(2,'0')}`; };
  const navs = [...document.querySelectorAll('.bar nav a')];
  navs.forEach(a => a.addEventListener('click', ()=>{ view = a.dataset.v; document.body.classList.remove('far'); render(); app.scrollTo({top:0}); }));

  // 안쪽은 규칙: 꽉 찬 장, 번호·제목·시각, 1px 선. 기울임·흐림·느린 등장 없음.
  function sheetItem(row, folded){
    const it = document.createElement('section'); it.className = 'item';
    it.innerHTML = `<div class="label"><span>${pad2(row.n)}</span><em>${esc(row.title)}</em><time>${esc(row.at)}</time></div>`;
    const s = document.createElement('div'); s.className = 'sheet' + (folded ? ' last' : '') + (GIFT.mine.has(row.id) ? ' mine' : '');
    s.dataset.n = pad2(row.n); s.dataset.t = row.title || ''; s.dataset.at = row.at || ''; s.dataset.id = row.id;
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
  // 두 줄 굽이: 맞닿은 이음매만 남색 홈질, 맞닿지 않은 곳은 그냥 선. 기록은 아래에 캡션 목록으로.
  function snake(list, form, o = {}){
    const g = document.createElement('div'); g.className = 'grid';
    list.forEach((row, i) => {
      const n = row.n, c = cellOf(n), folded = o.foldLast && i === list.length-1;
      const cell = document.createElement('div'); cell.className = 'cell';
      cell.style.gridRow = c.r + 1; cell.style.gridColumn = c.col + 1;
      if(n > 1){ const e = edgeOf(n-1, form); cell.classList.add(e === 'bottom' ? 'j-top' : e === 'right' ? 'j-left' : 'j-right'); }
      const s = document.createElement('div'); s.className = 'sheet' + (folded ? ' last' : '') + (GIFT.mine.has(row.id) ? ' mine' : '');
      s.dataset.n = pad2(n); s.dataset.t = row.title || ''; s.dataset.at = row.at || ''; s.dataset.id = row.id;
      const e = edgeOf(n, form), ec = e === 'bottom' ? '' : (e === 'right' ? ' er' : ' el');
      const im = new Image(); im.decoding = 'async'; im.src = row.img; im.alt = '';
      im.className = folded ? 'strip' + ec : 'pic';
      s.appendChild(im);
      const foldEl = () => { const f = document.createElement('div'); f.className = 'fold' + (e === 'right' ? ' fr' : e === 'left' ? ' fl' : ''); return f; };
      if(folded) s.appendChild(foldEl());
      if(lifting.has(row.id)){ const f = foldEl(); s.appendChild(f); setTimeout(()=>f.classList.add('lift'), 350); setTimeout(()=>f.remove(), 900); }
      cell.appendChild(s); g.appendChild(cell);
    });
    if(o.slot){
      const n = list.length + 1, c = cellOf(n);
      const cell = document.createElement('div'); cell.className = 'cell';
      cell.style.gridRow = c.r + 1; cell.style.gridColumn = c.col + 1;
      if(n > 1){ const e = edgeOf(n-1, form); cell.classList.add(e === 'bottom' ? 'j-top' : e === 'right' ? 'j-left' : 'j-right'); }
      cell.appendChild(o.slot); g.appendChild(cell);
    }
    const wrap = document.createElement('div'); wrap.className = 'snake'; wrap.appendChild(g);
    const caps = document.createElement('ol'); caps.className = 'caps';
    const pos = n => { const c = cellOf(n); return `grid-row:${c.r+1};grid-column:${c.col+1}`; };   // 이름표도 장과 같은 자리 순서로
    caps.innerHTML = list.map(r => `<li style="${pos(r.n)}"><span>${pad2(r.n)}</span><em>${esc(r.title)}</em><time>${esc((r.at||'').slice(5))}</time></li>`).join('')
      + (o.slot ? `<li class="nx" style="${pos(list.length+1)}"><span>${pad2(list.length+1)}</span><em></em><time class="heldt"></time></li>` : '');
    wrap.appendChild(caps);
    return wrap;
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
    const form = board.open ? formOf(board.open) : 'snake';
    if(form === 'snake') return renderSnakeMake(form);
    rows.forEach((row, i) => chain.appendChild(sheetItem(row, i === rows.length-1)));
    cnt.textContent = size ? `${pad2(rows.length)} / ${pad2(size)}` : '';
    const it = document.createElement('section'); it.className = 'item';
    it.innerHTML = `<div class="label"><span>${pad2(rows.length+1)}</span><em></em><time class="heldt"></time></div>`;
    const next = document.createElement('div'); next.className = 'next';
    const busy = heldUntil && heldUntil > Date.now() && !token;
    if(canPlace || busy){                                        // 바늘이 빈 자리로 늘어져 있다 (누가 잇는 중이면 들락날락)
      next.innerHTML = `<svg viewBox="0 0 40 170" class="${busy ? 'busy' : ''}"><path d="M20 0 Q12 70 26 120" fill="none" stroke="${IND}" stroke-width="1.15" stroke-linecap="round"/>`+
        `<line x1="22" y1="112" x2="29" y2="150" stroke="#a9aeb3" stroke-width="1.3" stroke-linecap="round"/></svg>`;
    }
    next.addEventListener('click', ()=>{
      if(canPlace && !busy) return openCompose();
      if(DEMO){                                                  // 예시: 다음 장이 놓인 순간처럼 마지막 장을 펼친다
        const ls = chain.querySelector('.sheet.last'); if(!ls) return;
        ls.querySelector('img').className = 'pic';
        const f = ls.querySelector('.fold'); f && f.classList.add('lift');
      }
    });
    it.appendChild(next); chain.appendChild(it);
  }
  function nextSlot(){
    const next = document.createElement('div'); next.className = 'next';
    const busy = heldUntil && heldUntil > Date.now() && !token;
    if(canPlace || busy){
      next.innerHTML = `<svg viewBox="0 0 40 170" class="${busy ? 'busy' : ''}"><path d="M20 0 Q12 70 26 120" fill="none" stroke="${IND}" stroke-width="1.15" stroke-linecap="round"/>`+
        `<line x1="22" y1="112" x2="29" y2="150" stroke="#a9aeb3" stroke-width="1.3" stroke-linecap="round"/></svg>`;
    }
    next.addEventListener('click', ()=>{
      if(canPlace && !busy) return openCompose();
      if(DEMO){ const ls = chain.querySelector('.sheet.last'); if(!ls) return;
        ls.querySelector('img').className = 'pic'; const f = ls.querySelector('.fold'); f && f.classList.add('lift'); }
    });
    return next;
  }
  function renderSnakeMake(form){
    const full = size && rows.length >= size;
    chain.appendChild(snake(rows, form, {foldLast:true, slot: full ? null : nextSlot()}));
  }
  // 만들어진 것: 닫힌 폭들 — 누구나 본다. 모두 펼쳐진 채로.
  function renderMade(){
    if(!board.closed.length){ chain.innerHTML = '<div class="empty">아직 닫힌 폭이 없어요</div>'; return; }
    board.closed.forEach(r => {
      const h = document.createElement('div'); h.className = 'roll closed'; h.id = 'roll-' + r.id;
      const mineHere = (r.sheets||[]).some(x => GIFT.mine.has(x.id));
      h.innerHTML = `<span>폭 ${rno(r.id)}</span><em>${esc(r.title)}</em><time>${esc(r.from)} — ${esc((r.to||'').slice(5))} · ${r.size}장</time><span class="mk${mineHere ? ' mine' : ''}">완성본</span><span class="bk">엮음</span>`;
      h.addEventListener('click', async e => {
        if(e.target.classList.contains('mk')){ const b = await GIFT.storyRoll(r, GIFT.mine.ids(), rno(r.id)); return GIFT.share(b, `n.n.-${rno(r.id)}.png`); }
        openBook(r);
      });
      chain.appendChild(h);
      if(formOf(r) === 'snake'){
        const sn = snake(r.sheets||[], 'snake');
        if(revealRoll === r.id){                  // 닫히는 순간: 모든 장이 차례로 펼쳐지고 이음매가 꿰매진다
          sn.classList.add('reveal'); sn.querySelectorAll('.cell').forEach((c, i) => c.style.setProperty('--i', i));
          revealRoll = null;
        }
        chain.appendChild(sn);
      }
      else (r.sheets||[]).forEach(row => chain.appendChild(sheetItem(row, false)));
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
  // 엽서 뒷면: 왼쪽 절반 = 전체 그림(또는 빈 자리), 오른쪽 = 우표·소인 · 기록 · 받는 이
  const postBack = (rec, pms) => `<div class="pcrule"></div>${rec}<i class="stamp"></i>${pms ? `<div class="pms">${pms}</div>` : ''}
      <div class="t to"><span class="f">받는 이</span> n.n.</div>${[0,1,2].map(i=>`<i class="addr" style="top:calc(var(--mm)*${100+i*10})"></i>`).join('')}`;
  // 첫 장에서 마지막 장까지 걸린 시간 — 판권의 한 줄
  const spanOf = ss => {
    const t = s => { const m = String(s||'').match(/(\d+)\.(\d+)\.(\d+) (\d+):(\d+)/); return m ? new Date(+m[1], m[2]-1, +m[3], +m[4], +m[5]).getTime() : null; };
    if(ss.length < 2) return ''; const a = t(ss[0].at), b = t(ss[ss.length-1].at); if(a == null || b == null) return '';
    const min = Math.max(0, Math.round((b - a) / 60000)), d = Math.floor(min / 1440), h = Math.floor(min % 1440 / 60), mm = min % 60;
    return '첫 장에서 마지막 장까지 ' + (d ? d + '일 ' : '') + (d || h ? h + '시간' : mm + '분');
  };
  window.NN_SPAN = spanOf;
  function openBook(r){
    const ss = r.sheets || [], no = rno(r.id);
    const period = `${esc(r.from)} — ${esc(r.to)}`;
    // 표지 엽서: 앞 = 눌러 찍은 이름 / 뒤 = 각자가 본 한 줄들
    let html = card(
      `<div class="t deboss" style="left:calc(var(--mm)*12);top:calc(var(--mm)*14)">n.n.</div>
       <div class="t deboss cv-name">${esc(r.title) || '&nbsp;'}</div>
       <div class="t deboss" style="right:calc(var(--mm)*12);bottom:calc(var(--mm)*12)">폭 ${no}</div>`,
      `<div class="stack">${ss.map((x,i)=>`<div><img data-src="${i}" alt=""></div>`).join('')}</div>
       <div class="t f" style="left:calc(var(--mm)*7);bottom:calc(var(--mm)*8)">${period} · ${r.size}장</div>
       <div class="t f" style="right:calc(var(--mm)*7);bottom:calc(var(--mm)*8)">tu.:na.</div>`, 'cover');
    // 한 장 = 엽서 한 장: 앞 = 그린 것 / 뒤 = 본 것 + 기록
    ss.forEach((x,i)=>{
      const prev = ss[i-1];
      html += card(
        `<div class="pic"><img src="${x.img}" alt=""></div>
         <div class="t cap"><span>${pad2(x.n)}</span><em>${esc(x.title)}</em><span class="f">${esc(x.at)}</span></div>`,
        `${NN_EDGE.whole(ss, r.size, formOf(r), x.id, 'var(--mm)')}
         ${postBack(`<div class="t rec"><b>${pad2(x.n)}<small>/${pad2(r.size)}</small></b>${esc(x.title) ? esc(x.title)+'<br>' : ''}<span class="f">폭 ${no}</span></div>`,
           GIFT.postmark('보냄', x.at, -8) + (x.got ? GIFT.postmark('받음', x.got, 11) : ''))}`);
    });
    // 판권 엽서
    html += card(
      `<div class="t" style="left:calc(var(--mm)*12);right:calc(var(--mm)*12);bottom:calc(var(--mm)*22);line-height:2">
         폭 ${no}<br>${esc(r.title) || '<span class="f">이름 없음</span>'}<br><span class="f">${period}</span><br>
         ${r.size}장 · <span class="f">이름 모를 ${KOR[r.size]||r.size}</span><br><span class="f">${spanOf(ss)}</span><br><br><span class="f">n.n. — 비워 둔 이름</span></div>
       <div class="t f" style="left:calc(var(--mm)*12);top:calc(var(--mm)*14)">n.n.</div>
       <div class="t f" style="right:calc(var(--mm)*7);bottom:calc(var(--mm)*8)">tu.:na.</div>`,
      postBack('', ''));
    pages.innerHTML = html; pages.scrollLeft = 0;
    // 각자가 본 가장자리 한 줄(옆 가장자리는 눕혀서 가로 띠로)
    const fm = formOf(r);
    pages.querySelectorAll('img[data-src]').forEach(im => { const x = ss[+im.dataset.src];
      edgeURL(x.strip || x.img, edgeOf(x.n, fm), !!x.strip).then(u => im.src = u); });
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
  solo.innerHTML = '<img alt=""><div class="meta"><span></span><time></time></div><button class="mycard">내 엽서</button>';
  document.body.appendChild(solo);
  chain.addEventListener('click', e=>{
    if(document.body.classList.contains('far')) return;
    const s = e.target.closest('.sheet'); if(!s || s.classList.contains('last')) return;
    const im = s.querySelector('img.pic'); if(!im) return;
    solo.querySelector('img').src = im.src;
    solo.querySelector('.meta span').textContent = s.dataset.n + (s.dataset.t ? '   ' + s.dataset.t : '');
    solo.querySelector('.meta time').textContent = s.dataset.at;
    solo.classList.toggle('ismine', GIFT.mine.has(+s.dataset.id));
    solo.dataset.id = s.dataset.id;
    document.body.classList.add('solo');
  });
  solo.addEventListener('click', async e => {
    if(e.target.classList.contains('mycard')){
      e.stopPropagation();
      const id = +solo.dataset.id, roll = [board.open, ...board.closed].find(r => r && (r.sheets||[]).some(x => x.id === id));
      if(roll){ const row = roll.sheets.find(x => x.id === id); GIFT.open(await giftData(row, roll)); }
      return;
    }
    document.body.classList.remove('solo');
  });

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
    if(linkRoll && !load.done){ load.done = true; setTimeout(()=>{ const t = document.getElementById('roll-' + linkRoll); t && t.scrollIntoView({block:'start'}); }, 80); }
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
  let pickForm = 'snake';
  cp.querySelectorAll('.cform b').forEach(b => b.addEventListener('click', ()=>{
    cp.querySelectorAll('.cform b').forEach(x => x.classList.toggle('on', x === b)); pickForm = b.dataset.f;
  }));
  const curForm = () => board.open ? formOf(board.open) : pickForm;
  function stageStrip(){                       // 앞 장의 가장자리를 맞닿는 쪽에: 아래 → 위에, 오른쪽 → 왼쪽 옆에, 왼쪽 → 오른쪽 옆에
    const prev = rows[rows.length-1], st = cp.querySelector('.cstage');
    st.className = 'cstage';
    if(!prev || !board.open){ cStrip.removeAttribute('src'); cStrip.style.display = 'none'; return; }
    const e = edgeOf(prev.n, curForm());
    st.classList.add(e === 'bottom' ? 'from-top' : e === 'right' ? 'from-left' : 'from-right');
    cStrip.src = prev.img; cStrip.style.display = '';
  }
  cp.querySelectorAll('.csize b').forEach(b => b.addEventListener('click', ()=>{
    cp.querySelectorAll('.csize b').forEach(x => x.classList.toggle('on', x === b)); pick = +b.dataset.n;
  }));

  function sizeInk(){
    const rc = paper.getBoundingClientRect(), d = Math.min(3, devicePixelRatio||1);
    ink.width = Math.round(rc.width*d); ink.height = Math.round(rc.height*d);
    ictx.setTransform(d,0,0,d,0,0);
    ictx.lineCap = ictx.lineJoin = 'round'; ictx.strokeStyle = '#44474c'; ictx.lineWidth = 1.8; ictx.setLineDash([]);   // 그린 그대로 — 보정하지 않는다
  }
  function clearAll(){
    ictx.save(); ictx.setTransform(1,0,0,1,0,0); ictx.clearRect(0,0,ink.width,ink.height); ictx.restore();
    photo = null; photoEl.removeAttribute('src'); photoEl.style.display = 'none'; inked = false; file.value = '';
    strokes = []; stroke = null;                      // 지운 시도는 남기지 않는다
  }
  async function openCompose(){
    if(!DEMO){
      token = token || Math.random().toString(36).slice(2) + Date.now().toString(36);
      try{
        const h = await rpc('hold', {k:key, ptoken:token});
        if(!h || !h.ok){ token = null; heldUntil = h && h.until ? Date.parse(h.until) : null; render(); return; }
        myUntil = Date.parse(h.until);
      }catch(e){ token = null; return; }
    }
    note.textContent = '';
    stageStrip();
    const first = !board.open, n = rows.length + 1, total = first ? pick : size;
    cp.classList.toggle('first', first);
    cp.classList.toggle('final', !first && n === size);
    cNo.textContent = pad2(n); cTitle.value = ''; cRoll.value = ''; t0 = performance.now();
    document.body.classList.add('composing');
    requestAnimationFrame(()=>{ sizeInk(); clearAll(); });
  }
  function closeCompose(placed){
    document.body.classList.remove('composing');
    if(token && !placed && !DEMO) rpc('release', {ptoken:token}).catch(()=>{});
    token = null; myUntil = null; cp.querySelector('.ctime').textContent = '';
  }
  // 1초마다: 내 남은 시간 / 남이 잇는 중인 남은 시간
  setInterval(()=>{
    const ct = cp.querySelector('.ctime');
    if(myUntil && document.body.classList.contains('composing')){
      const left = myUntil - Date.now();
      ct.textContent = mmss(left);
      if(left <= 0 && !note.textContent) note.textContent = '자리가 풀렸어요 — 그래도 놓을 수 있어요';
    }
    const ht = chain.querySelector('.heldt');
    if(ht){
      const busy = heldUntil && heldUntil > Date.now() && !token;
      ht.textContent = busy ? `잇는 중 ${mmss(heldUntil - Date.now())}` : '';
      const sv = chain.querySelector('.next svg');
      if(!busy && sv && sv.classList.contains('busy')){ heldUntil = null; render(); }
    }
  }, 1000);
  // 20초마다 누가 잇는 중인지 가볍게 묻는다
  async function pollHeld(){
    if(DEMO) return;
    try{
      const u = await rpc('held');
      const v = u ? Date.parse(u) : null;
      const changed = (!!v) !== (!!(heldUntil && heldUntil > Date.now()));
      heldUntil = v;
      if(changed && view === 'make' && !document.body.classList.contains('composing')) render();
    }catch(e){}
  }
  setInterval(pollHeld, 20000);
  addEventListener('pagehide', ()=>{ if(token && !DEMO) fetch(`${SB}/rest/v1/rpc/release`, {method:'POST', keepalive:true,
    headers:{apikey:PK, 'Content-Type':'application/json'}, body:JSON.stringify({ptoken:token})}); });
  cp.querySelector('.cclose').addEventListener('click', ()=>closeCompose(false));
  cp.querySelector('.cclear').addEventListener('click', clearAll);

  let last = null;
  const pos = e => { const rc = ink.getBoundingClientRect(); return [e.clientX-rc.left, e.clientY-rc.top]; };
  // 굵기 = 손이 실제로 닿은 넓이(손가락) 또는 누른 힘(펜). 알려주지 않는 기기는 한 굵기. 흉내 내지 않는다.
  const widthOf = e => {
    if(e.pointerType === 'pen' && e.pressure > 0 && e.pressure !== .5) return .5 + e.pressure * 3.4;
    if(e.pointerType === 'touch' && e.width > 2) return Math.max(.7, Math.min(6, .4 + (e.width - 6) * .11));
    return 1.8;
  };
  let lastW = 1.8;
  const rec = (p, w) => { const rc = ink.getBoundingClientRect();
    stroke && stroke.p.push([+(p[0]/rc.width).toFixed(4), +(p[1]/rc.height).toFixed(4), Math.round(performance.now()-t0), +(w||1.8).toFixed(2)]); };
  ink.addEventListener('pointerdown', e=>{ ink.setPointerCapture(e.pointerId); last = pos(e); lastW = widthOf(e);
    stroke = {p:[]}; strokes.push(stroke); rec(last, lastW);
    ictx.beginPath(); ictx.arc(last[0], last[1], lastW/2, 0, 7); ictx.fillStyle = '#44474c'; ictx.fill(); inked = true; });
  ink.addEventListener('pointermove', e=>{
    if(!last) return;
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for(const ev of evs){
      const p = pos(ev), w = widthOf(ev);
      // 손이 지나간 그대로 잇는다: 매끈하게 다듬거나 모양을 바꾸지 않는다
      ictx.lineWidth = (w + lastW) / 2;
      ictx.beginPath(); ictx.moveTo(last[0],last[1]); ictx.lineTo(p[0],p[1]); ictx.stroke();
      last = p; lastW = w; inked = true; rec(p, w);
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
  const photoMode = 'keep';
  const setPhotoMode = () => {};

  // 사진 원본(책용): 긴 변 1600px, 자르지 않고 그대로
  function original(){
    if(!photo || photoMode !== 'keep') return null;
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
    if(photo && photoMode === 'keep'){
      const s = Math.max(W/photo.naturalWidth, H/photo.naturalHeight);
      const w = photo.naturalWidth*s, h = photo.naturalHeight*s;
      x.drawImage(photo, (W-w)/2, (H-h)/2, w, h);
    }
    x.drawImage(ink, 0, 0, W, H);
    // 다음 사람이 볼 가장자리: 아래 120px, 또는 옆 90px
    const e = edgeOf(rows.length + 1, curForm()), sc = document.createElement('canvas');
    if(e === 'bottom'){ sc.width = W; sc.height = 120; sc.getContext('2d').drawImage(c, 0, H-120, W, 120, 0, 0, W, 120); }
    else { sc.width = 90; sc.height = H; sc.getContext('2d').drawImage(c, e === 'right' ? W-90 : 0, 0, 90, H, 0, 0, 90, H); }
    return {img: c.toDataURL('image/jpeg', q), strip: sc.toDataURL('image/jpeg', .8)};
  }

  cp.querySelector('.cplace').addEventListener('click', async ()=>{
    if(busy || (!inked && !(photo && photoMode === 'keep'))) return;
    busy = true; note.textContent = '';
    let out, q = .82;
    do { out = compose(q); q -= .1; } while(out.img.length > 680000 && q > .3);
    try{
      const prev = lastId;
      const res = await rpc('place4', {
        k:key, ptoken:token, after_id:lastId, pimg:out.img, pstrip:out.strip,
        ptitle: cTitle.value.trim() || null,
        psize: board.open ? null : pick,
        pform: board.open ? null : pickForm,
        proll: cp.classList.contains('final') ? (cRoll.value.trim() || null) : null,
        pstrokes: strokes.length ? strokes : null,
        pphoto: original()
      });
      navigator.vibrate && navigator.vibrate(res && res.closed ? [15,60,15] : 15);
      // 보상: 방금 놓은 장 → 번호 매긴 엽서
      const roll0 = board.open || {id: (board.closed.length && !board.closed[0].example ? board.closed[0].id : 0) + 1, size: pick, form: pickForm, sheets: []};
      const prevRow = rows[rows.length-1];
      const seenUrl = prevRow ? await edgeURL(prevRow.img, edgeOf(prevRow.n, formOf(roll0)), true) : null;
      const wsheets = rows.map((x, i) => ({id: x.id, n: x.n, img: x.img, folded: i === rows.length-1}))   // 앞 장은 아직 접힌 채
        .concat([{id: res.id, n: rows.length + 1, img: out.img}]);
      const gd = {id: res.id, img: out.img, seen: seenUrl, n: rows.length + 1, size: roll0.size, rollNo: rno(roll0.id),
        title: cTitle.value.trim(), at: nowAt(), got: null, whole: {sheets: wsheets, size: roll0.size, form: formOf(roll0)}};
      GIFT.mine.add(res.id); GIFT.mine.keep(res.id, {img: out.img, seen: seenUrl});
      // 내 장이 스스로 접힌다: 다음 사람에게 끝자락 한 줄만 남기고
      if(!(res && res.closed)){
        const e = edgeOf(rows.length + 1, curForm()), f = document.createElement('div');
        f.className = 'cfold ' + (e === 'bottom' ? 'fb' : e === 'right' ? 'fr' : 'fl');
        paper.appendChild(f); requestAnimationFrame(()=>requestAnimationFrame(()=>f.classList.add('go')));
        await new Promise(r => setTimeout(r, 750)); f.remove();
      }
      lifting = new Set([prev, res && res.closed ? res.id : null]);
      if(res && res.closed){ view = 'made'; revealRoll = roll0.id; }
      token = null; closeCompose(true); await load();
      setTimeout(()=>{ lifting = new Set(); }, 50);
      setTimeout(()=>{                                   // 방금 펼쳐진 장으로 (폭이 닫혔으면 그 폭 머리로)
        const t = res && res.closed ? document.getElementById('roll-' + roll0.id) : (chain.querySelector('.snake') ? chain.querySelector('.cell .next, .sheet.last') : [...chain.querySelectorAll('.item')].slice(-3)[0]);
        t && t.scrollIntoView({block:'start'});
      }, 60);
      setTimeout(()=>GIFT.open(gd), res && res.closed ? 2400 : 1100);   // 닫히는 순간엔 다 펼쳐지는 걸 먼저 보고
    }catch(e){
      const m = String(e.message||'');
      if(m.includes('held')){
        note.textContent = '누군가 잇는 중이에요';
      } else if(m.includes('moved')){
        note.textContent = '그새 누군가 이어 놓았어요';
        await load(); stageStrip();
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
    await pollHeld(); load();
  })();
})();
