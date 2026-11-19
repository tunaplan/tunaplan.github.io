/* 예시: ?demo 화면 + 진짜 폭이 없을 때 보이는 폭 00(열 사람, 10장). 저장소와 무관. */
window.NN_DEMO = (function(){
  let sd = 3;
  const rn = () => (sd = (sd*16807) % 2147483647) / 2147483647;
  const j = a => (rn()-.5)*a;
  // 손 떨림이 남는 선
  function line(pts, w){
    const p = pts.map(([x,y]) => [x + j(2.4), y + j(2.4)]);
    let d = `M${p[0][0].toFixed(1)} ${p[0][1].toFixed(1)}`;
    for(let i=1;i<p.length;i++){
      const [ax,ay]=p[i-1],[bx,by]=p[i];
      d += ` Q${(ax+j(3)).toFixed(1)} ${(ay+j(3)).toFixed(1)} ${((ax+bx)/2).toFixed(1)} ${((ay+by)/2).toFixed(1)}`;
    }
    const l = p[p.length-1]; d += ` L${l[0].toFixed(1)} ${l[1].toFixed(1)}`;
    return `<path d="${d}" fill="none" stroke="#44474c" stroke-width="${w||1.9}" stroke-linecap="round" stroke-linejoin="round" opacity=".86"/>`;
  }
  const svg = body => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400" width="750" height="1000"><rect width="300" height="400" fill="#f7f8f6"/>${body}</svg>`);

  // 1. 싹 — 줄기와 뿌리 세 가닥이 아래로 빠져나간다
  const s1 = svg(
    line([[150,58],[151,120],[148,200],[150,280],[150,330],[150,400]]) +
    line([[150,160],[128,146],[104,124],[96,112],[112,112],[134,126],[150,160]],1.6) +
    line([[151,118],[170,96],[196,84],[210,82],[200,96],[178,108],[151,118]],1.6) +
    line([[150,58],[142,50],[146,40],[156,40],[160,50],[150,58]],1.5) +
    line([[150,330],[138,356],[126,380],[120,400]]) +
    line([[150,330],[166,360],[180,384],[186,400]])
  );
  // 2. 세 가닥만 보고 — 손가락이 된다. 손목 두 줄이 아래로
  const s2 = svg(
    line([[120,0],[118,60],[112,128]]) + line([[150,0],[151,70],[150,124]]) + line([[186,0],[190,64],[196,130]]) +
    line([[100,40],[96,70],[92,140],[86,160],[64,138],[52,142],[70,178],[96,214],[112,250],[124,300],[126,400]]) +
    line([[214,40],[218,80],[214,160],[200,230],[186,290],[180,400]]) +
    line([[112,128],[150,124],[196,130]],1.2)
  );
  // 3. 두 줄만 보고 — 찍은 것: 멀어지는 길 (사진)
  const s3 = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400" width="750" height="1000">
      <defs><filter id="b"><feGaussianBlur stdDeviation="2.2"/></filter>
      <filter id="g"><feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 .3  0 0 0 0 .32  0 0 0 0 .35  0 0 0 .22 0"/></filter>
      <linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7d8487"/><stop offset="1" stop-color="#5f6669"/></linearGradient>
      <linearGradient id="r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b9bec1"/><stop offset="1" stop-color="#d5d8da"/></linearGradient></defs>
      <g filter="url(#b)"><rect width="300" height="400" fill="url(#f)"/>
      <polygon points="126,-10 180,-10 296,410 4,410" fill="url(#r)"/>
      <rect x="22" y="-10" width="9" height="150" fill="#4a5154" opacity=".6"/><rect x="258" y="-10" width="12" height="190" fill="#4a5154" opacity=".55"/>
      <rect x="62" y="-10" width="5" height="90" fill="#4a5154" opacity=".4"/>
      <path d="M150 0 L150 400" stroke="#eef0f0" stroke-width="3" stroke-dasharray="16 22" opacity=".55"/></g>
      <rect width="300" height="400" filter="url(#g)"/></svg>`);
  // 4. 넓게 벌어진 두 선만 보고 — 둥근 눈덩이의 아랫부분, 바닥, 떨어진 잔가지
  const s4 = svg(
    line([[6,0],[14,60],[40,112],[90,150],[150,162],[210,150],[258,112],[286,60],[294,0]]) +
    line([[16,186],[90,180],[160,184],[230,180],[286,186]],1.3) +
    line([[60,172],[150,176],[240,172]],1) +
    line([[196,250],[206,300],[204,350],[200,400]],1.6) + line([[205,300],[226,322],[232,350],[236,400]],1.4) +
    line([[204,272],[188,262]],1.2)
  );
  // 5. (맨 끝 — 천에 덮여 아래 한 줄만) 잔가지가 새의 다리가 되고 나뭇가지를 쥔다
  const s5 = svg(
    line([[200,0],[198,40],[170,90],[150,150],[160,220],[200,250],[240,230],[256,170],[236,110],[206,60]]) +
    line([[236,0],[244,40],[238,80]],1.4) +
    line([[180,250],[176,330],[172,372]],1.6) + line([[214,252],[218,330],[220,372]],1.6) +
    line([[20,378],[100,372],[172,374],[220,372],[290,380]],2) +
    line([[160,372],[172,384],[184,372]],1.3) + line([[208,372],[220,384],[232,372]],1.3)
  );
  // 사진처럼 보이는 장: 흐린 덩어리 + 입자
  const photo = (body, base) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400" width="750" height="1000">
      <defs><filter id="b"><feGaussianBlur stdDeviation="2.4"/></filter>
      <filter id="g"><feTurbulence type="fractalNoise" baseFrequency="1.3" numOctaves="2" seed="${Math.round(rn()*90)}"/><feColorMatrix values="0 0 0 0 .3  0 0 0 0 .32  0 0 0 0 .35  0 0 0 .2 0"/></filter></defs>
      <g filter="url(#b)"><rect width="300" height="400" fill="${base}"/>${body}</g><rect width="300" height="400" filter="url(#g)"/></svg>`);

  /* ── 예시 폭 00: 열 사람이 앞 장의 끝만 보고 이은 10장 (나중에 지울 수 있음) ── */
  // 5. 새가 쥔 나뭇가지 → 6. 전깃줄 사진 → 7. 지붕이 집이 됨 → 8. 문 아래 두 줄이 꽃병 목 → 9. 바닥의 빛 사진 → 10. 빛의 네모가 봉투
  const e5 = svg(
    line([[200,0],[198,40],[170,90],[150,150],[160,220],[200,250],[240,230],[256,170],[236,110],[206,60]]) +
    line([[236,0],[244,40],[238,80]],1.4) +
    line([[180,250],[176,330],[172,372]],1.6) + line([[214,252],[218,330],[220,372]],1.6) +
    line([[0,378],[100,372],[172,374],[220,372],[300,382]],2) +
    line([[160,372],[172,384],[184,372]],1.3) + line([[208,372],[220,384],[232,372]],1.3)
  );
  const e6 = photo(
    `<rect width="300" height="230" fill="#c9cdd0"/>
     <path d="M-10 18 Q150 40 310 26" stroke="#3d4346" stroke-width="2.4" fill="none"/>
     <path d="M-10 46 Q140 70 310 52" stroke="#3d4346" stroke-width="1.8" fill="none"/>
     <polygon points="0,400 0,250 70,210 140,250 140,230 210,180 300,236 300,400" fill="#5d6468"/>
     <rect x="160" y="268" width="26" height="34" fill="#9aa1a5"/><rect x="40" y="290" width="22" height="30" fill="#8d9498"/>`, '#b9bec1');
  const e7 = svg(
    line([[0,0],[70,40],[140,0]],1.6) + line([[140,0],[210,-30],[300,8]],1.6) +
    line([[30,30],[30,300]]) + line([[270,20],[270,300]]) + line([[30,300],[270,300]]) +
    line([[116,180],[116,300]],1.6) + line([[184,180],[184,300]],1.6) + line([[116,180],[150,168],[184,180]],1.4) +
    line([[60,90],[100,90],[100,130],[60,130],[60,90]],1.3) + line([[200,80],[240,80],[240,120],[200,120],[200,80]],1.3) +
    line([[130,300],[132,350],[130,400]],1.8) + line([[170,300],[168,352],[170,400]],1.8)
  );
  const e8 = svg(
    line([[130,0],[128,60],[110,110],[84,170],[80,240],[96,300],[130,330],[170,330],[204,300],[220,240],[216,170],[190,110],[172,60],[170,0]]) +
    line([[150,0],[146,-20]],1) + line([[110,330],[100,400]],1.4) + line([[190,330],[200,400]],1.4) +
    line([[90,250],[210,250]],1) + line([[40,400],[260,400]],1)
  );
  const e9 = photo(
    `<rect width="300" height="400" fill="#7f8689"/>
     <polygon points="100,0 200,0 248,400 52,400" fill="#e2e5e6"/>
     <polygon points="140,0 160,0 152,400 148,400" fill="#7f8689" opacity=".6"/>
     <rect x="0" y="330" width="300" height="70" fill="#6e7578" opacity=".35"/>`, '#7f8689');
  const e10 = svg(
    line([[52,0],[60,90],[70,180]],1.4) + line([[248,0],[240,90],[230,180]],1.4) +
    line([[50,180],[250,180],[250,330],[50,330],[50,180]]) +
    line([[50,180],[150,262],[250,180]],1.6) + line([[50,330],[126,248]],1.1) + line([[250,330],[174,248]],1.1) +
    line([[196,200],[226,200],[226,232],[196,232],[196,200]],1) +
    line([[70,300],[118,296]],.9) + line([[70,312],[104,309]],.9)
  );
  /* 두 줄 굽이 예시: 앞 장이 넘겨준 가장자리의 선 끝에서 시작해, 다음 사람이 볼 가장자리로 선을 넘긴다.
     (누가 그려도 이어지게 — 서툰 선 몇 가닥, 사진 세 장) */
  const E = window.NN_EDGE, r = (a,b) => a + (b-a)*rn();
  const opp = {bottom:'top', right:'left', left:'right'};
  const at = (side, t) => side === 'top' ? [t*300, 0] : side === 'bottom' ? [t*300, 400] : side === 'left' ? [0, t*400] : [300, t*400];
  let pass = [.35, .62];                 // 넘겨받은 선 끝의 자리(0~1)
  const motif = [
    () => line([[150,140],[136,128],[140,112],[156,112],[160,128],[150,140]],1.5),                  // 씨앗
    () => line([[90,220],[120,200],[160,210],[190,240],[170,270],[120,268],[90,220]],1.6),         // 돌
    () => '',
    () => line([[120,150],[150,120],[180,150],[180,200],[120,200],[120,150]],1.6) + line([[140,200],[140,170],[160,170],[160,200]],1.2), // 작은 집
    () => line([[80,260],[220,260]],1.2) + line([[100,250],[100,230],[120,230]],1.2),             // 선반
    () => '',
    () => line([[150,170],[150,240]],1.6) + line([[150,190],[128,176]],1.3) + line([[150,205],[174,190]],1.3), // 싹
    () => line([[100,120],[200,120],[200,200],[100,200],[100,120]],1.4) + line([[100,120],[150,165],[200,120]],1.2), // 봉투
    () => '',
    () => line([[130,230],[150,200],[170,230],[150,260],[130,230]],1.4)                             // 잎
  ];
  const isPhoto = n => n === 3 || n === 6 || n === 9;
  const X = [];
  for(let n=1; n<=10; n++){
    const inSide = n === 1 ? null : opp[E.edgeOf(n-1, 'snake')];
    const outSide = n === 10 ? null : E.edgeOf(n, 'snake');
    const outs = [r(.25,.45), r(.55,.78)];
    if(isPhoto(n)){
      // 사진: 들어온 두 줄이 어둑한 길이 되고, 나가는 쪽 가장자리에 두 줄의 그림자를 남긴다
      const [ax,ay] = inSide ? at(inSide, pass[0]) : [120, 0], [bx,by] = inSide ? at(inSide, pass[1]) : [190, 0];
      const [cx,cy] = outSide ? at(outSide, outs[0]) : [60, 400], [dx,dy] = outSide ? at(outSide, outs[1]) : [250, 400];
      X.push(photo(`<rect width="300" height="400" fill="#8b9295"/>
        <polygon points="${ax},${ay} ${bx},${by} ${dx},${dy} ${cx},${cy}" fill="#d3d7d9"/>
        <circle cx="${r(60,240)}" cy="${r(80,320)}" r="${r(30,60)}" fill="#6f7679" opacity=".5"/>`, '#8b9295'));
    } else {
      let body = '';
      [0,1].forEach(k => {
        const p0 = inSide ? at(inSide, pass[k]) : [r(80,220), r(40,120)];
        const p3 = outSide ? at(outSide, outs[k]) : [r(80,220), r(300,370)];
        const m1 = [r(70,230), r(110,190)], m2 = [r(70,230), r(210,300)];
        body += line([p0, m1, m2, p3], 1.8);
      });
      body += motif[n-1]();
      X.push(svg(body));
    }
    pass = outs;
  }
  const XT = ['씨앗', '', '두 갈래', '돌', '', '창 밖', '작은 집', '', '오후 세 시', '잎'];
  const XA = ['10.02 09:14','10.03 23:40','10.05 17:02','10.06 07:55','10.08 13:21','10.10 18:47','10.11 22:03','10.14 08:30','10.15 15:00','10.17 21:36']
    .map(t => '2026.' + t);
  const example = {id:1, size:10, form:'snake', title:'창문 쪽으로', from:'2026.10.02', to:'2026.10.17', example:true,
    sheets: X.map((img,i) => ({id:900+i, n:i+1, title:XT[i], at:XA[i], img}))};
  window.NN_EXAMPLE = example;     // 진짜 폭이 하나도 없을 때 아카이브에 보여 줄 예시 (지우려면 이 줄과 chain.js의 EXAMPLE 사용부를 뺀다)

  const imgs = [s1, s2, s3, s4, s5];
  const T = ['싹', '', '멀어지는 길', '', '나뭇가지 위'];
  const A = ['2026.11.02 09:14', '2026.11.05 23:40', '2026.11.09 17:02', '2026.11.12 07:55', '2026.11.16 13:21'];
  return {
    open: {id:2, size:6, form:'line', sheets: imgs.map((img,i) => ({id:10+i, n:i+1, title:T[i], at:A[i], img}))},
    closed: [example]
  };
})();
