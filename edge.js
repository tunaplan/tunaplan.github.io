/* 형식과 가장자리 — 화면·책·인쇄가 함께 쓴다.
   두 줄 굽이(snake): 01→02 오른쪽, 02→03 아래, 03→04 왼쪽, 04→05 아래 …  한 줄(line): 늘 아래.
   edgeOf(n) = n번째 장 다음 사람이 보게 될 n번째 장의 가장자리. */
window.NN_EDGE = (function(){
  const edgeOf = (n, form) => form === 'line' ? 'bottom'
    : (n % 2 === 0 ? 'bottom' : ((((n-1) >> 1) % 2 === 0) ? 'right' : 'left'));
  const cellOf = n => { const r = (n-1) >> 1, odd = n % 2 === 1;
    return {r, col: (r % 2 === 0) ? (odd ? 0 : 1) : (odd ? 1 : 0)}; };
  // 가장자리 한 줄을 늘 가로 띠(750×120)로 — 책의 '본 것'과 표지 뒤의 띠에 쓴다
  const cache = new Map();
  function edgeURL(src, e, isStrip){
    const k = src.length + ':' + src.slice(-40) + e + (isStrip ? 's' : '');
    if(cache.has(k)) return cache.get(k);
    const p = new Promise(res => {
      const im = new Image();
      im.onload = () => {
        const W = im.naturalWidth || 750, H = im.naturalHeight || 1000;
        const c = document.createElement('canvas'); c.width = 750; c.height = 120;
        const x = c.getContext('2d');
        x.fillStyle = '#f7f8f6'; x.fillRect(0, 0, 750, 120);
        if(e === 'bottom'){
          if(isStrip) x.drawImage(im, 0, 0, 750, 120);
          else x.drawImage(im, 0, H*.88, W, H*.12, 0, 0, 750, 120);
        } else {
          // 옆 가장자리(세로 띠)를 눕힌다: 오른쪽 띠는 시계 반대로, 왼쪽 띠는 시계 방향으로
          const sw = isStrip ? W : W*.12, sx = isStrip ? 0 : (e === 'right' ? W - sw : 0);
          x.save();
          if(e === 'right'){ x.translate(0, 120); x.rotate(-Math.PI/2); }
          else { x.translate(750, 0); x.rotate(Math.PI/2); }
          x.drawImage(im, sx, 0, sw, H, 0, 0, 120, 750);
          x.restore();
        }
        res(c.toDataURL('image/jpeg', .85));
      };
      im.onerror = () => res(src);
      im.src = src;
    });
    cache.set(k, p);
    return p;
  }
  // 폭 전체 그림을 엽서 한 면(왼쪽 절반 38×112mm 안)에: 내 칸은 남색 점선, 아직 없거나 접힌 칸은 빈 칸
  function whole(sheets, size, form, markId, u){
    const snake = form === 'snake', cols = snake ? 2 : 1, rows = snake ? Math.ceil(size/2) : size;
    let w = 38, h = w * rows * 4 / (cols * 3); if(h > 112){ h = 112; w = h * cols * 3 / (rows * 4); }
    let cells = '';
    for(let n = 1; n <= size; n++){
      const p = snake ? cellOf(n) : {r: n-1, col: 0}, x = (sheets || []).find(s => s.n === n);
      const cls = (x && x.id === markId ? 'me' : '') + (!x || x.folded ? ' empty' : '');
      cells += `<i class="${cls}" style="grid-row:${p.r+1};grid-column:${p.col+1}">${x && !x.folded ? `<img src="${x.img}" alt="">` : ''}</i>`;
    }
    return `<div class="whole" style="width:calc(${u} * ${w.toFixed(2)});height:calc(${u} * ${h.toFixed(2)});grid-template-columns:repeat(${cols},1fr);grid-template-rows:repeat(${rows},1fr)">${cells}</div>`;
  }
  return {edgeOf, cellOf, edgeURL, whole};
})();
