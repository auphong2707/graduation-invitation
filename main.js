(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1 · Opening (bound first so the page never stays locked) ---------- */

  var opener = document.querySelector('.opener');
  var opened = false;

  // The opener's gear train turns from one angle: it creeps while waiting, and on a tap
  // speeds up gradually (ease-in) before the invitation opens. Degrees per second of the dials.
  var IDLE = 6, FAST = 280, RAMP = 1400, FADE = 850;
  var spin = { el: null, angle: 0, last: 0, t0: 0, raf: 0 };
  function spinFrame(now) {
    var dt = spin.last ? Math.min(.05, (now - spin.last) / 1000) : 0;
    var p = spin.t0 ? Math.min(1, (now - spin.t0) / RAMP) : 0;
    spin.last = now;
    spin.angle += (IDLE + (FAST - IDLE) * p * p) * dt;
    spin.el.style.setProperty('--turn', spin.angle.toFixed(2));
    spin.raf = requestAnimationFrame(spinFrame);
  }

  function openInvitation() {
    if (opened) return;
    opened = true;
    opener.classList.add('is-opening');
    spin.t0 = performance.now();
    setTimeout(function () {
      document.body.classList.add('is-open');
      opener.classList.add('is-leaving');
    }, reduceMotion ? 0 : RAMP);
    setTimeout(function () {
      opener.classList.add('is-done');
      opener.setAttribute('aria-hidden', 'true');
      root.classList.remove('is-locked');
      cancelAnimationFrame(spin.raf);
    }, reduceMotion ? 50 : RAMP + FADE);
  }

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  if (opener) {
    opener.addEventListener('click', openInvitation);
    document.addEventListener('keydown', function (e) {
      if (!opened && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openInvitation(); }
    });
  } else {
    document.body.classList.add('is-open');
    root.classList.remove('is-locked');
  }

  /* ---------- Gears ---------- */

  // <path data-gear="teeth rootRadius tipRadius"> → gear outline, first tooth pointing up.
  function pt(r, a) { return (r * Math.cos(a)).toFixed(2) + ' ' + (r * Math.sin(a)).toFixed(2); }
  function gearPath(n, rRoot, rTip) {
    var step = Math.PI * 2 / n, rootHalf = step * .27, tipHalf = step * .15, d = '';
    for (var i = 0; i < n; i++) {
      var a = i * step - Math.PI / 2;
      d += (i ? 'L' : 'M') + pt(rRoot, a - rootHalf)
        + 'L' + pt(rTip, a - tipHalf)
        + 'A' + rTip + ' ' + rTip + ' 0 0 1 ' + pt(rTip, a + tipHalf)
        + 'L' + pt(rRoot, a + rootHalf)
        + 'A' + rRoot + ' ' + rRoot + ' 0 0 1 ' + pt(rRoot, a + step - rootHalf);
    }
    return d + 'Z';
  }
  document.querySelectorAll('[data-gear]').forEach(function (el) {
    var g = el.getAttribute('data-gear').split(' ').map(Number);
    el.setAttribute('d', gearPath(g[0], g[1], g[2]));
  });

  /* Mechanisms. Every set below meshes for real: each gear gets the phase that puts its teeth
     into its neighbour's gaps, and turns at the tooth-count ratio. */
  var MODULE = 4, ADD = 3.2; // pitch radius = teeth × MODULE / 2; teeth reach ± ADD around it

  // Phase of gear g meshing outside gear prev, touching at direction a (degrees) from prev.
  function meshPhase(prev, g, a) {
    var t = ((((-90 + prev.phase - a) / (360 / prev.n)) % 1) + 1) % 1;
    return a + 270 - (t + .5) * (360 / g.n);
  }
  function units(v) { return 'calc(var(--u) * ' + v.toFixed(2) + ')'; }
  function hub(r, cls) { return '<circle class="' + (cls || 'gear__hub') + '" r="' + r.toFixed(2) + '"/>'; }
  function holes(r, d) {
    var out = '';
    for (var i = 0; i < 6; i++) {
      var a = i * Math.PI / 3 - Math.PI / 2;
      out += '<circle class="gear__hub" cx="' + (d * Math.cos(a)).toFixed(2) + '" cy="' + (d * Math.sin(a)).toFixed(2) + '" r="' + r.toFixed(2) + '"/>';
    }
    return out;
  }

  // One gear as a positioned element; (ox, oy) is where x = y = 0 sits inside the container.
  function gearEl(g, ox, oy, inner) {
    var R = g.r + ADD + (g.rim || 0), box = R * 2;
    var teeth = g.internal ? gearPath(g.n, g.r + ADD, g.r - ADD) : gearPath(g.n, g.r - ADD, g.r + ADD);
    var span = document.createElement('span');
    span.className = 'gear' + (g.cls ? ' ' + g.cls : '');
    span.style.cssText = '--k:' + g.k.toFixed(4) + ';left:' + units(ox + g.x - R) + ';top:' + units(oy + g.y - R)
      + ';width:' + units(box) + ';height:' + units(box);
    span.innerHTML = '<span class="gear__intro"><svg class="gear__spin" viewBox="' + -R + ' ' + -R + ' ' + box + ' ' + box + '">'
      + (inner && inner.under || '')
      + '<path class="gear__teeth" transform="rotate(' + g.phase.toFixed(3) + ')" d="' + teeth + '"/>'
      + (inner && inner.over || '') + '</svg></span>';
    return span;
  }

  // Countdown band — clockwork: a wheel and pinion that advance one tooth every second.
  var clock = document.querySelector('.clockwork'), ticks = 0;
  if (clock) {
    var wheel = { n: 30, r: 60, x: 0, y: 0, phase: 0, k: 1 };
    var pinion = { n: 12, r: 24, k: -30 / 12 }, pa = 115;
    pinion.x = (wheel.r + pinion.r) * Math.cos(pa * Math.PI / 180);
    pinion.y = (wheel.r + pinion.r) * Math.sin(pa * Math.PI / 180);
    pinion.phase = meshPhase(wheel, pinion, pa);
    var wr = wheel.r + ADD;
    clock.style.width = clock.style.height = units(wr * 2);
    clock.appendChild(gearEl(wheel, wr, wr, { over: hub(wheel.r * .74) + holes(7, wheel.r * .46) + hub(8) + hub(3) }));
    clock.appendChild(gearEl(pinion, wr, wr, { over: hub(pinion.r * .36) + hub(pinion.r * .12) }));
  }

  // Seams — a gear sits on each boundary between two sections, with one gear reaching up into
  // the section above and one down into the section below, so the sections are geared together.
  var seams = [];
  document.querySelectorAll('.seam').forEach(function (el) {
    var left = el.getAttribute('data-side') === 'left';
    var hubGear = { n: 18, r: 36, x: 0, y: 0, phase: 0, k: 1 };
    var up = { n: 10, r: 20, k: -18 / 10 }, down = { n: 12, r: 24, k: -18 / 12 };
    [[up, left ? -62 : -118], [down, left ? 66 : 114]].forEach(function (pair) {
      var g = pair[0], a = pair[1], rad = a * Math.PI / 180, d = hubGear.r + g.r;
      g.x = d * Math.cos(rad);
      g.y = d * Math.sin(rad);
      g.phase = meshPhase(hubGear, g, a);
    });
    var train = document.createElement('div');
    train.className = 'seam__train';
    train.appendChild(gearEl(up, 0, 0, { over: hub(up.r * .36) + hub(up.r * .12) }));
    train.appendChild(gearEl(down, 0, 0, { over: hub(down.r * .36) + hub(down.r * .12) }));
    train.appendChild(gearEl(hubGear, 0, 0, { over: hub(hubGear.r * .7) + holes(4.5, hubGear.r * .44) + hub(5.5) + hub(2) }));
    el.appendChild(train);
    seams.push(train);
  });

  // Opening — the date on three dials (day · month · year), each passing the drive on through an idler
  // that carries a star, plus small pinions off the side. Two layouts: a row, or a zigzag down the
  // screen; whichever lets the gears be bigger wins.
  var openTrain = opener && opener.querySelector('.opener__train');
  function dots(n, d, r) {
    var out = '';
    for (var i = 0; i < n; i++) {
      var a = i * Math.PI * 2 / n - Math.PI / 2;
      out += '<circle class="gear__dot" cx="' + (d * Math.cos(a)).toFixed(2) + '" cy="' + (d * Math.sin(a)).toFixed(2) + '" r="' + r + '"/>';
    }
    return out;
  }
  function star(size) {
    return '<use class="gear__star" href="#star" x="' + (-size / 2).toFixed(2) + '" y="' + (-size / 2).toFixed(2)
      + '" width="' + size.toFixed(2) + '" height="' + size.toFixed(2) + '"/>';
  }
  function trainLayout(L) {
    var DIAL = 32, IDLER = 16, PIN = 10;
    var dr = DIAL * MODULE / 2, ir = IDLER * MODULE / 2, pr = PIN * MODULE / 2;
    var deg = function (y, x) { return Math.atan2(y, x) * 180 / Math.PI; };
    var dials = L.dials.map(function (p, i) {
      return { n: DIAL, r: dr, x: p[0], y: p[1], k: 1, cls: 'gear--dial', dial: i, phase: 0 };
    });
    var gears = [dials[0]];
    for (var i = 0; i < 2; i++) {
      // idler touching both dials: on the perpendicular through the midpoint, on side L.sides[i]
      var A = dials[i], B = dials[i + 1], dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy);
      var h = Math.sqrt(Math.pow(dr + ir, 2) - d * d / 4), s = L.sides[i];
      var idl = { n: IDLER, r: ir, x: A.x + dx / 2 - s * h * dy / d, y: A.y + dy / 2 + s * h * dx / d, k: -DIAL / IDLER, cls: 'gear--idler' };
      idl.phase = meshPhase(A, idl, deg(idl.y - A.y, idl.x - A.x));
      B.phase = meshPhase(idl, B, deg(B.y - idl.y, B.x - idl.x));
      gears.push(idl, B);
    }
    L.pins.forEach(function (pin) {
      var D0 = dials[pin[0]], a = pin[1] * Math.PI / 180;
      var g = { n: PIN, r: pr, x: D0.x + (dr + pr) * Math.cos(a), y: D0.y + (dr + pr) * Math.sin(a), k: -DIAL / PIN, cls: 'gear--pin' };
      g.phase = meshPhase(D0, g, pin[1]);
      gears.push(g);
    });
    var b = [1e9, 1e9, -1e9, -1e9];
    gears.forEach(function (g) {
      var R = g.r + ADD;
      b = [Math.min(b[0], g.x - R), Math.min(b[1], g.y - R), Math.max(b[2], g.x + R), Math.max(b[3], g.y + R)];
    });
    var u = Math.min((innerWidth - 48) / (b[2] - b[0]), innerHeight * .62 / (b[3] - b[1]), 2.4);
    return { gears: gears, dials: dials, b: b, u: u };
  }
  function buildOpener() {
    var T = [
      trainLayout({ dials: [[-152, 0], [0, 0], [152, 0]], sides: [1, -1], pins: [[0, -130], [2, 50]] }),
      trainLayout({ dials: [[-46, -138], [46, 0], [-46, 138]], sides: [-1, -1], pins: [[1, 180]] })
    ].sort(function (a, b) { return b.u - a.u; })[0];
    var ox = -T.b[0], oy = -T.b[1];
    openTrain.querySelectorAll('.gear').forEach(function (el) { el.remove(); });
    openTrain.style.setProperty('--u', T.u.toFixed(3) + 'px');
    openTrain.style.width = units(T.b[2] - T.b[0]);
    openTrain.style.height = units(T.b[3] - T.b[1]);
    var labels = openTrain.querySelectorAll('.dial-label');
    T.gears.forEach(function (g) {
      var inner = g.cls === 'gear--dial' ? { over: hub(g.r * .82) + hub(g.r * .72, 'gear__carrier') + dots(12, g.r * .885, 1.3) }
        : g.cls === 'gear--idler' ? { over: hub(g.r * .62) + star(g.r * .8) }
        : { over: hub(g.r * .36) + hub(g.r * .12) };
      var el = gearEl(g, ox, oy, inner);
      if (g.cls === 'gear--dial') {
        labels[g.dial].style.left = units(ox + g.x);
        labels[g.dial].style.top = units(oy + g.y);
      }
      openTrain.insertBefore(el, labels[0]);
    });
  }
  if (openTrain) {
    buildOpener();
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { openTrain.classList.add('is-built'); }); // winds into place
    });
    var lastW = innerWidth, lastH = innerHeight;
    window.addEventListener('resize', function () {
      if (opened || (innerWidth === lastW && Math.abs(innerHeight - lastH) < 80)) return; // ignore mobile toolbars
      lastW = innerWidth; lastH = innerHeight;
      buildOpener();
    });
    if (!reduceMotion) {
      spin.el = openTrain;
      spin.raf = requestAnimationFrame(spinFrame);
    }
  }

  /* ---------- Star particles ----------
     Small four-point stars behind everything: a fixed sky over the page background that drifts
     slowly with the scroll, and a layer inside each card. Seeded, so they land the same way on every visit. */
  function rng(seed) {
    return function () {
      seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  // repeat = draw the field twice, stacked, so a 200%-tall layer can scroll seamlessly
  function sprinkle(host, count, seed, cls, repeat) {
    if (!host) return null;
    var rand = rng(seed), html = '';
    for (var i = 0; i < count; i++) {
      var x = rand() * 100, y = rand() * 100, big = rand() < .16;
      var size = big ? 10 + rand() * 7 : 4 + rand() * 5;
      var style = 'left:' + x.toFixed(2) + '%;width:' + size.toFixed(1) + 'px;height:' + size.toFixed(1) + 'px;'
        + '--o:' + ((big ? .22 : .3) + rand() * .3).toFixed(2) + ';'
        + 'animation-duration:' + (3 + rand() * 4).toFixed(1) + 's;animation-delay:-' + (rand() * 6).toFixed(1) + 's;';
      var cl = 'star-p' + (rand() < .35 ? ' star-p--tw' : '');
      var tops = repeat ? [y / 2, 50 + y / 2] : [y];
      tops.forEach(function (top) {
        html += '<svg class="' + cl + '" style="' + style + 'top:' + top.toFixed(2) + '%"><use href="#star"/></svg>';
      });
    }
    var layer = document.createElement('div');
    layer.className = 'stars' + (cls ? ' ' + cls : '');
    layer.setAttribute('aria-hidden', 'true');
    layer.innerHTML = html;
    host.insertBefore(layer, host.firstChild);
    return layer;
  }
  function density(el, per, max) {
    var r = el ? el.getBoundingClientRect() : { width: innerWidth, height: innerHeight };
    return Math.min(max, Math.round(r.width * r.height / per));
  }
  var sky = sprinkle(document.body, density(null, 7000, 72), 7, 'stars--sky', true);
  sprinkle(opener, 26, 3);
  sprinkle(document.querySelector('.hero .frame'), density(document.querySelector('.hero .frame'), 8000, 56), 11);
  sprinkle(document.querySelector('.band'), density(document.querySelector('.band'), 6500, 48), 23, 'stars--light');
  sprinkle(document.querySelector('.reply'), density(document.querySelector('.reply'), 9000, 28), 31);
  function moveSky() {
    if (sky) sky.style.transform = 'translate3d(0,' + (-(window.scrollY * .15 % window.innerHeight)).toFixed(1) + 'px,0)';
  }

  // The portrait's gears turn a little as the page scrolls, and the sky drifts.
  if (!reduceMotion) {
    var turning = false;
    window.addEventListener('scroll', function () {
      if (turning) return;
      turning = true;
      requestAnimationFrame(function () {
        root.style.setProperty('--turn', (window.scrollY * .12).toFixed(1));
        moveSky();
        turning = false;
      });
    }, { passive: true });
  }

  /* ---------- Config → derived values ---------- */

  var CFG = window.INVITE || {};
  var ev = CFG.event;
  if (!ev) { console.error('config.js: window.INVITE.event is missing'); return; }

  var parts = ev.date.split('-');
  var Y = parts[0], M = parts[1], D = parts[2];
  var offset = ev.utcOffset || '+07:00';
  var start = new Date(ev.date + 'T' + ev.startTime + ':00' + offset);
  var end = new Date(ev.date + 'T' + ev.endTime + ':00' + offset);

  function weekday() {
    try { return new Intl.DateTimeFormat('vi-VN', { weekday: 'long', timeZone: ev.timezone }).format(start); }
    catch (err) { return ''; }
  }

  /* Vietnamese is written one syllable per space, so a plain wrap can split a word
     ("Tốt / nghiệp"). Glue syllables with no-break spaces so lines only break between words. */
  var NBSP = String.fromCharCode(160);
  function glue(str) { return String(str).replace(/ /g, NBSP); }

  // Multi-syllable words/names that may appear in config values (longest first).
  var WORDS = ['Hai Bà Trưng', 'Đại Cồ Việt', 'Tạ Quang Bửu', 'Hồ Chí Minh', 'Đại học', 'Cao đẳng',
    'Bách khoa', 'Hà Nội', 'Việt Nam', 'Bạch Mai', 'Hội trường', 'Tòa nhà', 'Thư viện', 'Quốc gia',
    'Khoa học', 'Công nghệ', 'Kỹ thuật', 'Tốt nghiệp', 'tốt nghiệp'];
  function keepWords(str) {
    WORDS.forEach(function (w) { str = str.split(w).join(glue(w)); });
    return str.replace(/(Số|số|Phòng|phòng|Tầng|tầng|Nhà|nhà) (\S+)/g, '$1' + NBSP + '$2');
  }
  // A person's name may only break after the family name: "Âu / Trung Phong".
  function personName(str) {
    var p = String(str).trim().split(/\s+/);
    return p.length < 3 ? glue(p.join(' ')) : p[0] + ' ' + glue(p.slice(1).join(' '));
  }
  // An address may only break at its commas (unless a part is too long to fit).
  function address(str) {
    return String(str).split(/,\s*/).map(function (part) {
      return part.length <= 26 ? glue(part) : keepWords(part);
    }).join(', ');
  }

  var initials = ev.name.normalize('NFD').replace(/\p{M}/gu, '')
    .split(/\s+/).map(function (w) { return w.charAt(0); }).join('').toUpperCase();

  var gmt = 'GMT' + offset.replace(/:00$/, '').replace(/^([+-])0/, '$1');
  var place = ev.venue + ', ' + ev.address;
  var mapsUrl = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(place);

  var values = {
    name: personName(ev.name),
    initials: initials,
    dots: glue(D + ' · ' + M + ' · ' + Y),
    day: D,
    month: M,
    year: Y,
    time: glue(ev.startTime + ' — ' + ev.endTime),
    gmt: gmt,
    venue: keepWords(ev.venue),
    address: address(ev.address),
    'date-long': glue(+D + ' tháng ' + +M) + ' ' + glue('năm ' + Y),
    weekday: glue(weekday())
  };

  document.querySelectorAll('[data-bind]').forEach(function (el) {
    var v = values[el.getAttribute('data-bind')];
    if (v) el.textContent = v;
  });
  document.querySelectorAll('[data-map]').forEach(function (a) { a.href = mapsUrl; });
  document.title = ev.name + ' — Thiệp mời Lễ Tốt nghiệp';

  /* ---------- Portrait (placeholder stays if the image is missing) ---------- */

  var photo = document.querySelector('.portrait__photo');
  if (photo && ev.profileImage) {
    var src = /^(https?:)?\/\//.test(ev.profileImage) || ev.profileImage.indexOf('/') !== -1
      ? ev.profileImage
      : 'public/' + ev.profileImage;
    // Try the configured file first, then the same name in the other common formats,
    // so profile.jpg / .jpeg / .png / .webp all work without touching the config.
    var base = src.replace(/\.(jpe?g|png|webp)$/i, '');
    var sources = [src].concat(['jpg', 'jpeg', 'png', 'webp'].map(function (ext) {
      return base + '.' + ext;
    }).filter(function (s) { return s !== src; }));
    var img = new Image();
    img.alt = 'Chân dung ' + ev.name;
    img.decoding = 'async';
    img.onload = function () {
      photo.appendChild(img);
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { photo.classList.add('has-photo'); });
      });
    };
    img.onerror = function () {
      if (sources.length) img.src = sources.shift();
    };
    img.src = sources.shift();
  }

  /* ---------- Scroll reveal ---------- */

  var revealEls = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('in'); io.unobserve(entry.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    revealEls.forEach(function (el) { io.observe(el); });
    seams.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
    seams.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- 4 · Countdown ---------- */

  var cd = {
    d: document.querySelector('[data-cd="d"]'),
    h: document.querySelector('[data-cd="h"]'),
    m: document.querySelector('[data-cd="m"]'),
    s: document.querySelector('[data-cd="s"]')
  };
  var caption = document.querySelector('[data-cd-caption]');

  function pad(n) { return n < 10 ? '0' + n : String(n); }
  function set(el, text) { if (el && el.textContent !== text) el.textContent = text; }

  function tick() {
    var now = Date.now();
    var left = Math.max(0, Math.floor((start - now) / 1000));
    set(cd.d, pad(Math.floor(left / 86400)));
    set(cd.h, pad(Math.floor(left % 86400 / 3600)));
    set(cd.m, pad(Math.floor(left % 3600 / 60)));
    set(cd.s, pad(left % 60));

    var text = now < start ? glue('đến ' + ev.startTime + ',') + ' ' + values.dots + ' ' + glue('(' + gmt + ')')
      : now < end ? glue('Buổi lễ') + ' ' + glue('đang diễn ra') : glue('Buổi lễ') + ' ' + glue('đã kết thúc');
    set(caption, text);

    // One shared beat: the clockwork in the band, the gear clusters on the section corners and the
    // invitation card's corner gears each advance one tooth per second, together, while the countdown runs.
    if (!reduceMotion && now < start) root.style.setProperty('--tick', ++ticks);

    if (now < end) setTimeout(tick, 1000 - (now % 1000) + 10);
  }
  tick();

  /* ---------- 5 · Add to calendar (Google link + .ics, fully client-side) ---------- */

  var calToggle = document.querySelector('[data-cal-toggle]');
  var calMenu = document.getElementById('cal-menu');
  var title = 'Lễ Tốt nghiệp — ' + ev.name;
  var pageUrl = location.href.split('#')[0].split('?')[0];

  function utcStamp(d) { return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }

  var gcal = 'https://calendar.google.com/calendar/render?action=TEMPLATE'
    + '&text=' + encodeURIComponent(title)
    + '&dates=' + utcStamp(start) + '/' + utcStamp(end)
    + '&details=' + encodeURIComponent(pageUrl)
    + '&location=' + encodeURIComponent(place)
    + '&ctz=' + encodeURIComponent(ev.timezone);
  var gLink = document.querySelector('[data-cal-google]');
  if (gLink) gLink.href = gcal;

  function setMenu(open) {
    calMenu.hidden = !open;
    calToggle.setAttribute('aria-expanded', String(open));
  }
  if (calToggle && calMenu) {
    calToggle.addEventListener('click', function () { setMenu(calMenu.hidden); });
    document.addEventListener('click', function (e) {
      if (!calMenu.hidden && !e.target.closest('.cal')) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !calMenu.hidden) { setMenu(false); calToggle.focus(); }
    });
  }

  function icsEscape(s) {
    return String(s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');
  }

  // RFC 5545: lines longer than 75 octets are folded with CRLF + space.
  function fold(line) {
    var enc = new TextEncoder();
    var out = '', cur = '', bytes = 0;
    for (var ch of line) {
      var b = enc.encode(ch).length;
      if (bytes + b > 75) { out += cur + '\r\n '; cur = ''; bytes = 1; }
      cur += ch; bytes += b;
    }
    return out + cur;
  }

  function downloadIcs() {
    var lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//' + initials + '//Thiep moi tot nghiep//VI',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      'UID:graduation-' + ev.date + '-' + initials.toLowerCase() + '@invitation',
      'DTSTAMP:' + utcStamp(new Date()),
      'DTSTART:' + utcStamp(start),
      'DTEND:' + utcStamp(end),
      'SUMMARY:' + icsEscape(title),
      'LOCATION:' + icsEscape(place),
      'DESCRIPTION:' + icsEscape(pageUrl),
      'URL:' + pageUrl,
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      'DESCRIPTION:' + icsEscape(title),
      'TRIGGER:-PT2H',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR'
    ];
    var ics = lines.map(fold).join('\r\n') + '\r\n';
    var url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    var a = document.createElement('a');
    a.href = url;
    a.download = 'le-tot-nghiep-' + ev.date + '.ics';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    setMenu(false);
  }
  var icsBtn = document.querySelector('[data-cal-ics]');
  if (icsBtn) icsBtn.addEventListener('click', downloadIcs);
  if (gLink) gLink.addEventListener('click', function () { setMenu(false); });

  /* ---------- 6 · Attendance (Supabase REST, insert-only) ---------- */

  var form = document.querySelector('[data-rsvp]');
  var status = document.querySelector('[data-rsvp-status]');
  var thanks = document.querySelector('[data-rsvp-thanks]');
  var thanksName = document.querySelector('[data-rsvp-name]');
  var STORE_KEY = 'invite:' + ev.date + ':attending';
  var att = CFG.attendance || {};

  function showThanks(name) {
    thanksName.textContent = personName(name) + '.'; // period inside, so it never wraps alone
    form.hidden = true;
    thanks.hidden = false;
  }

  function remembered() {
    try { return localStorage.getItem(STORE_KEY); } catch (err) { return null; }
  }
  function remember(name) {
    try { localStorage.setItem(STORE_KEY, name); } catch (err) { /* private mode */ }
  }

  function saveAttendance(name) {
    // Project URL, with or without a trailing /rest/v1 (people often paste the API URL)
    var url = (att.supabaseUrl || '').trim().replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
    var key = att.supabaseAnonKey || '';
    if (!url || !key) {
      console.warn('Attendance: Supabase is not configured in config.js — name was not stored.');
      return Promise.resolve();
    }
    var headers = { apikey: key, 'Content-Type': 'application/json', Prefer: 'return=minimal' };
    if (key.indexOf('eyJ') === 0) headers.Authorization = 'Bearer ' + key; // legacy JWT anon key
    return fetch(url + '/rest/v1/' + encodeURIComponent(att.table || 'attendance'), {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ name: name })
    }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
    });
  }

  if (form) {
    var saved = remembered();
    if (saved) showThanks(saved);

    var input = form.elements.name;
    var goBtn = form.querySelector('.send');
    var sending = false;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (sending) return;
      var name = input.value.replace(/\s+/g, ' ').trim().slice(0, 80);
      status.classList.remove('is-error');
      if (!name) {
        status.textContent = glue('Bạn nhập tên') + ' ' + glue('giúp mình nhé.');
        status.classList.add('is-error');
        input.focus();
        return;
      }
      sending = true;
      goBtn.disabled = true;
      form.classList.add('is-sending'); // the button's gear spins while waiting
      input.readOnly = true;
      status.textContent = 'Đang gửi…';

      saveAttendance(name).then(function () {
        remember(name);
        status.textContent = '';
        showThanks(name);
      }).catch(function (err) {
        console.error('Attendance:', err);
        status.textContent = glue('Chưa gửi được —') + ' ' + glue('bạn thử lại nhé.');
        status.classList.add('is-error');
      }).then(function () {
        sending = false;
        goBtn.disabled = false;
        form.classList.remove('is-sending');
        input.readOnly = false;
      });
    });
  }
})();
