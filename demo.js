/* 예시(?demo): 서로 앞 장의 끝자락만 보고 이어 놓은 다섯 장. 저장소와 무관. */
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
  return [
    {id:1, d:'2026.11.02', img:s1}, {id:2, d:'2026.11.05', img:s2}, {id:3, d:'2026.11.09', img:s3},
    {id:4, d:'2026.11.12', img:s4}, {id:5, d:'2026.11.16', img:s5}
  ];
})();
