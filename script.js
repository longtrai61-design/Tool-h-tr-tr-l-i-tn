const NAMES = ["Tổng quan", "Red dot", "Ống ngắm 2x", "Ống ngắm 4x", "AWM", "Nhìn tự do"];
// Thang độ nhạy của Free Fire: 0–200. Đây là giá trị khởi điểm do mình đặt, chưa kiểm chứng với game.
const BASE = {
  rush:  [170, 160, 145, 125, 95, 140],
  mid:   [150, 140, 130, 110, 85, 125],
  snipe: [130, 120, 115, 105, 80, 110]
};
const STEP = 12; // mỗi nấc "nhạy hơn" hoặc "thấp hơn"
const HINT = {
  "-1": "Tâm chậm và chắc hơn. Hợp nếu bạn hay kéo quá đà hoặc khó giữ tâm.",
  "0": "Mức gợi ý ban đầu theo lựa chọn của bạn.",
  "1": "Tâm nhanh hơn, xoay người gắt hơn. Hợp nếu thấy tâm lề mề."
};
const FIRE = {
  2: ["Vị trí: một nút bắn lớn ở mép phải, đúng chỗ ngón cái phải nằm tự nhiên.",
      "Mẹo: bạn vừa kéo vừa bấm, nên đặt nút thấp hơn tầm ngón cái một chút để không che tâm."],
  3: ["Vị trí: nút bắn bên trái, sát phía trên joystick, bấm bằng ngón trỏ trái. Ngón cái phải chỉ lo kéo tâm.",
      "Mẹo: có thể giữ thêm một nút bắn nhỏ bên phải làm dự phòng."],
  4: ["Vị trí: hai nút bắn ở hai bên (trái và phải), bấm bằng hai ngón trỏ. Hai ngón cái lo di chuyển và kéo tâm.",
      "Mẹo: đặt nút ngồi và nhảy ở chỗ ngón cái với tới được để không phải nhấc ngón khi giao tranh."]
};
const SIZE = {
  rush: "Kích thước: cỡ lớn, để bắn liên tục và đổi hướng nhanh.",
  mid: "Kích thước: cỡ vừa, cân bằng giữa dễ bấm và không che màn hình.",
  snipe: "Kích thước: cỡ vừa đến nhỏ, đặt gần ngón cái để bắn chính xác từng phát."
};
const $ = s => document.querySelector(s);

function state() {
  return {
    style: $('input[name=style]:checked').value,
    fingers: +$('input[name=fingers]:checked').value,
    level: $('input[name=level]:checked').value
  };
}

function calc() {
  const { style, fingers, level } = state();
  const v = BASE[style].slice();
  const f = fingers === 2 ? -8 : fingers === 4 ? 6 : 0;
  for (let i = 0; i < v.length; i++) v[i] += f + (+level) * STEP;
  if ($('#overshoot').checked) [1, 2, 3, 4].forEach(i => v[i] -= 12);
  if ($('#recoil').checked) { v[1] -= 8; v[2] -= 6; }
  if ($('#slow').checked) { v[0] += 16; v[5] += 12; }
  return v.map(x => Math.max(10, Math.min(200, x)));
}

function render(scroll) {
  const v = calc(), st = state();
  $('#bars').innerHTML = v.map((x, i) =>
    `<li><span>${NAMES[i]}</span><b>${x}</b><div class="track"><div class="fill" data-w="${x / 2}"></div></div></li>`
  ).join('');
  $('#lvlHint').textContent = HINT[st.level];
  $('#fireList').innerHTML = [FIRE[st.fingers][0], SIZE[st.style], FIRE[st.fingers][1]]
    .map(t => `<li>${t}</li>`).join('');
  $('#out').hidden = false;
  requestAnimationFrame(() => document.querySelectorAll('.fill').forEach(el => el.style.width = el.dataset.w + '%'));
  if (scroll) $('#out').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

$('#go').addEventListener('click', () => render(true));
document.querySelectorAll('input[name=level]').forEach(r => r.addEventListener('change', () => render(false)));
$('#copy').addEventListener('click', async () => {
  const v = calc();
  const text = NAMES.map((n, i) => `${n}: ${v[i]}`).join('\n');
  try { await navigator.clipboard.writeText(text); $('#copy').textContent = 'Đã sao chép'; }
  catch (e) { $('#copy').textContent = 'Không sao chép được, hãy chép tay'; }
  setTimeout(() => $('#copy').textContent = 'Sao chép kết quả', 1800);
});

// Hiệu ứng tàn lửa bay lên ở nền
(function () {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = $('#embers'), g = c.getContext('2d');
  let w, h, ps = [];
  function size() { w = c.width = innerWidth; h = c.height = innerHeight; }
  size(); addEventListener('resize', size);
  for (let i = 0; i < 40; i++) ps.push({ x: Math.random() * w, y: Math.random() * h, r: 1 + Math.random() * 2, s: .3 + Math.random() * .8 });
  (function loop() {
    g.clearRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,122,24,.5)';
    for (const p of ps) {
      p.y -= p.s; p.x += Math.sin(p.y / 40) * .3;
      if (p.y < -5) { p.y = h + 5; p.x = Math.random() * w; }
      g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.283); g.fill();
    }
    requestAnimationFrame(loop);
  })();
})();

// ---- Chat với Groq (qua /api/chat) ----
const log = $('#log'), input = $('#msg'), history = [];
let busy = false;
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function md(src) {
  const out = []; let tbl = [];
  const flush = () => {
    if (!tbl.length) return;
    const rows = tbl.filter(r => !/^\|?[\s:\-|]+\|?$/.test(r))
      .map(r => r.replace(/^\||\|$/g, '').split('|').map(c => c.trim()));
    out.push('<div class="tw"><table>' + rows.map((r, i) =>
      '<tr>' + r.map(c => i ? `<td>${c}</td>` : `<th>${c}</th>`).join('') + '</tr>').join('') + '</table></div>');
    tbl = [];
  };
  for (const l of esc(src).split('\n')) {
    const t = l.trim();
    if (t.startsWith('|')) tbl.push(t);
    else { flush(); if (t) out.push('<p>' + t.replace(/^#{1,6}\s*/, '') + '</p>'); }
  }
  flush();
  return out.join('').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
}

function add(role, html) {
  const d = document.createElement('div');
  d.className = 'm ' + role; d.innerHTML = html;
  log.appendChild(d); d.scrollIntoView({ block: 'nearest' });
  return d;
}

add('bot', md('Chào bạn! Cho mình biết **tên máy, kích thước màn hình, RAM/chipset** và **lối chơi** (rush, bắn tỉa, hỗ trợ) để mình gợi ý độ nhạy và đồ họa phù hợp nhé.'));

async function send() {
  const text = input.value.trim();
  if (!text || busy) return;
  input.value = ''; busy = true; $('#send').disabled = true;
  add('me', '<p>' + esc(text) + '</p>');
  history.push({ role: 'user', content: text });
  const wait = add('bot', '<p>Đang soạn…</p>');
  try {
    const r = await fetch('/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history })
    });
    const d = await r.json();
    if (!r.ok || d.error) throw new Error(d.error || 'Lỗi không rõ');
    history.push({ role: 'assistant', content: d.reply });
    wait.innerHTML = md(d.reply);
  } catch (e) {
    history.pop();
    wait.className = 'm err';
    wait.innerHTML = '<p>' + esc(e.name === 'Error' ? e.message : 'Không gọi được /api/chat. Cần chạy trang qua Vercel, mở file trực tiếp thì chat không hoạt động.') + '</p>';
  }
  busy = false; $('#send').disabled = false;
}
$('#send').addEventListener('click', send);
input.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send(); });

// ---- Nhạc nền: dùng file music/remix.mp3 nếu có, không thì phát nhạc điện tử tạo sẵn trong trình duyệt ----
(function () {
  const btn = $('#music'), label = btn.querySelector('span');
  let mode = null, audio = null, ctx, master, noise, timer, step = 0, next = 0;
  const ROOT = [55, 43.65, 65.41, 49];
  const CH = [[220, 261.63, 329.63], [174.61, 220, 261.63], [261.63, 329.63, 392], [196, 246.94, 293.66]];

  function tone(type, f, t, d, vol, lp) {
    const o = ctx.createOscillator(), g = ctx.createGain(); let n = o;
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
    if (lp) { const b = ctx.createBiquadFilter(); b.type = 'lowpass'; b.frequency.value = lp; o.connect(b); n = b; }
    n.connect(g); g.connect(master); o.start(t); o.stop(t + d + 0.02);
  }
  function kick(t) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.2);
  }
  function hat(t) {
    const s = ctx.createBufferSource(), h = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise; h.type = 'highpass'; h.frequency.value = 7000;
    g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    s.connect(h); h.connect(g); g.connect(master); s.start(t);
  }
  function play(n, t) {
    const bar = Math.floor(n / 16) % 4, s = n % 16;
    if (s % 4 === 0) kick(t);
    if (s % 4 === 2) hat(t);
    if (s % 2 === 0) tone('sawtooth', ROOT[bar], t, 0.2, 0.28, 400);
    tone('triangle', CH[bar][[0, 1, 2, 1][s % 4]] * 2, t, 0.12, 0.09);
  }
  function tick() {
    while (next < ctx.currentTime + 0.1) { play(step, next); next += 60 / 128 / 4; step = (step + 1) % 64; }
  }
  function ui(on) { btn.classList.toggle('on', on); btn.setAttribute('aria-pressed', on); label.textContent = on ? 'Tắt nhạc' : 'Bật nhạc'; }

  async function start() {
    if (mode !== 'synth') {
      if (!audio) { audio = new Audio('music/remix.mp3'); audio.loop = true; audio.volume = 0.5; }
      try { await audio.play(); mode = 'file'; ui(true); return; } catch (e) { /* chưa có file nhạc */ }
    }
    mode = 'synth';
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.22; master.connect(ctx.destination);
      noise = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
      const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    await ctx.resume(); step = 0; next = ctx.currentTime + 0.05;
    timer = setInterval(tick, 25); ui(true);
  }
  function stop() {
    if (mode === 'file') audio.pause(); else { clearInterval(timer); ctx.suspend(); }
    ui(false);
  }
  btn.addEventListener('click', () => btn.classList.contains('on') ? stop() : start());
})();
