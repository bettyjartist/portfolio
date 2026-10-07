/* =========================================================
   bettyj portfolio — one script for all 4 pages
   ========================================================= */
(() => {
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const page = document.body.dataset.page;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const debounce = (fn, ms = 120) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  /* -------------------------------------------------------
     1. GLASS  — refraction 100 · depth 10 · dispersion 100
     Displacement map (rim of `depth` px) + 3 channel passes with
     slightly different scales = chromatic dispersion.
     Chromium only (backdrop-filter:url()); others keep CSS frost.
     ------------------------------------------------------- */
  const GLASS = { refraction: 100, depth: 10, dispersion: 100 };
  const chromium = /Chrome|Chromium|CriOS|Edg\//.test(navigator.userAgent) && !/OPR\/|Firefox/.test(navigator.userAgent);
  let defs = null, glassCount = 0;

  function ensureDefs() {
    if (defs) return defs;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '0'); svg.setAttribute('height', '0');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.cssText = 'position:absolute;width:0;height:0;pointer-events:none';
    defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    svg.appendChild(defs);
    document.body.appendChild(svg);
    return defs;
  }

  function makeMap(w, h, r, depth) {
    const k = Math.max(1, Math.sqrt((w * h) / 1.2e6));
    const cw = Math.max(1, Math.round(w / k)), ch = Math.max(1, Math.round(h / k));
    const c = document.createElement('canvas');
    c.width = cw; c.height = ch;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(cw, ch), d = img.data;
    const cx = w / 2, cy = h / 2, hx = w / 2 - r, hy = h / 2 - r;
    for (let y = 0; y < ch; y++) {
      const py = (y + .5) * k - cy;
      for (let x = 0; x < cw; x++) {
        const px = (x + .5) * k - cx;
        const ax = Math.abs(px) - hx, ay = Math.abs(py) - hy;
        const ox = Math.max(ax, 0), oy = Math.max(ay, 0);
        const dist = -(Math.hypot(ox, oy) + Math.min(Math.max(ax, ay), 0) - r);
        let nx = 0, ny = 0, m = 0;
        if (dist < depth) {
          const t = 1 - Math.max(dist, 0) / depth;
          m = t * t;
          if (ox > 0 || oy > 0) {
            const len = Math.hypot(ox, oy) || 1;
            nx = (ox / len) * Math.sign(px); ny = (oy / len) * Math.sign(py);
          } else if (ax > ay) nx = Math.sign(px); else ny = Math.sign(py);
        }
        const i = (y * cw + x) * 4;
        d[i] = 128 + nx * m * 127; d[i + 1] = 128 + ny * m * 127; d[i + 2] = 128; d[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return c.toDataURL();
  }

  function buildGlass(el) {
    if (!chromium) return;
    const w = Math.round(el.offsetWidth), h = Math.round(el.offsetHeight);
    const off = el.dataset.glass === 'desktop' && matchMedia('(max-width:600px)').matches;
    if (off || w < 4 || h < 4) { el.classList.remove('refract'); return; }
    const cs = getComputedStyle(el);
    const br = cs.borderTopLeftRadius;
    let r = br.endsWith('%') ? (parseFloat(br) / 100) * Math.min(w, h) : parseFloat(br) || 0;
    r = Math.min(r, Math.min(w, h) / 2);
    const id = el.dataset.glassId || (el.dataset.glassId = 'glass-' + (++glassCount));
    const base = (+el.dataset.refraction || GLASS.refraction) * 0.5;
    const k = (GLASS.dispersion / 100) * 0.1;
    const url = makeMap(w, h, r, Math.min(+el.dataset.depth || GLASS.depth, Math.min(w, h) / 2));
    const ch = (vals, res, inn, s) => `<feDisplacementMap in="SourceGraphic" in2="m" scale="${s}" xChannelSelector="R" yChannelSelector="G" result="d${res}"/><feColorMatrix in="d${res}" type="matrix" values="${vals}" result="c${res}"/>`;
    const html = `<filter id="${id}" x="0" y="0" width="${w}" height="${h}" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
      <feImage href="${url}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="none" result="m"/>
      ${ch('1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0', 'r', 'm', base)}
      ${ch('0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0', 'g', 'm', base * (1 + k))}
      ${ch('0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0', 'b', 'm', base * (1 + 2 * k))}
      <feBlend in="cr" in2="cg" mode="screen" result="rg"/><feBlend in="rg" in2="cb" mode="screen"/>
    </filter>`;
    const holder = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    holder.innerHTML = html;
    const old = defs.querySelector('#' + id);
    if (old) old.remove();
    defs.appendChild(holder.firstElementChild);
    el.style.setProperty('--glass', `url(#${id})`);
    el.classList.add('refract');
  }

  function initGlass() {
    if (!chromium) return;
    ensureDefs();
    const els = $$('[data-glass]');
    const run = () => els.forEach(buildGlass);
    run();
    const ro = new ResizeObserver(debounce(run, 150));
    els.forEach(e => ro.observe(e));
  }

  /* -------------------------------------------------------
     2. CURSOR
     ------------------------------------------------------- */
  function initCursor() {
    if (!matchMedia('(hover:hover) and (pointer:fine)').matches) return;
    const cur = document.createElement('div');
    cur.className = 'cursor';
    cur.innerHTML = '<div class="cursor-ring" data-glass="cursor" data-refraction="80" data-depth="100"></div>';
    document.body.appendChild(cur);
    let tx = 0, ty = 0, x = 0, y = 0, seen = false, raf = null, last = 0;
    const loop = now => {
      const dt = Math.min(now - last || 16, 50); last = now;
      const k = 1 - Math.exp(-dt / 30);                 // time-based easing: same feel at 60 / 120 / 144 Hz
      x += (tx - x) * k; y += (ty - y) * k;
      const done = Math.abs(tx - x) < 0.05 && Math.abs(ty - y) < 0.05;
      if (done) { x = tx; y = ty; }
      cur.style.transform = `translate3d(${x}px,${y}px,0)`;
      raf = done ? null : requestAnimationFrame(loop);
    };
    addEventListener('pointermove', e => {
      tx = e.clientX; ty = e.clientY;
      if (!seen) { x = tx; y = ty; seen = true; }
      cur.classList.add('on');
      if (!raf) { last = 0; raf = requestAnimationFrame(loop); }
    }, { passive: true });
    document.addEventListener('pointerover', e => {
      cur.classList.toggle('hover', !!(e.target.closest && e.target.closest('a,button,[role="button"],.clickable,label,input,summary')));
    });
    document.documentElement.addEventListener('pointerleave', () => cur.classList.remove('on'));
  }

  /* -------------------------------------------------------
     3. NAV (mobile: logo toggles vertical menu)
     ------------------------------------------------------- */
  function initNav() {
    const nav = $('.navbar'), logo = $('.nav-logo');
    const mobile = () => matchMedia('(max-width:600px)').matches;
    logo.addEventListener('click', e => {
      if (!mobile()) return;
      e.preventDefault();
      const open = nav.classList.toggle('open');
      logo.setAttribute('aria-expanded', open);
      if (open) requestAnimationFrame(() => buildGlass($('.nav-links')));
    });
    document.addEventListener('click', e => {
      if (mobile() && !nav.contains(e.target)) nav.classList.remove('open');
    });
    addEventListener('resize', () => { if (!mobile()) nav.classList.remove('open'); });
  }

  /* -------------------------------------------------------
     4. WALLPAPER — "BETTYJ." always whole, scaled to the frame
     ------------------------------------------------------- */
  function initWallpaper() {
    $$('.frame').forEach(frame => {
      const wp = $('.wallpaper', frame);
      if (!wp) return;
      const layout = () => {
        const W = frame.clientWidth, H = frame.clientHeight;
        if (!W || !H) return;
        const n = W > 700 ? 3 : 2;                         // words per row
        const text = 'BETTYJ.'.repeat(n);
        const probe = document.createElement('span');
        probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font-size:100px;letter-spacing:0';
        probe.textContent = text;
        wp.appendChild(probe);
        const w100 = probe.getBoundingClientRect().width;
        probe.remove();
        const fs = (W / w100) * 100 * 0.985;               // tiny safety so no glyph touches the edge
        const rowh = fs * 0.8;
        const rows = Math.ceil(H / rowh) + 1;
        wp.style.setProperty('--fs', fs + 'px');
        wp.style.setProperty('--rowh', rowh + 'px');
        wp.innerHTML = Array.from({ length: rows }, () => `<span class="wp-row">${text}</span>`).join('');
      };
      layout();
      document.fonts && document.fonts.ready.then(layout);
      new ResizeObserver(debounce(layout, 60)).observe(frame);
    });
  }

  /* -------------------------------------------------------
     5. ABOUT — trays rise on scroll
     ------------------------------------------------------- */
  function initAbout() {
    const roller = $('.roller'), band = $('.band');
    const trays = $$('.tray');
    const titles = $$('.tx-title'), bodies = $$('.tx-body');
    const hint = $('.scroll-hint');
    const STAGGER = 1;   // tray N+1 only starts after tray N has fully left the screen
    let vh, bandTop, bandH, rollerW;
    let progress = 0, target = 0, raf = null;

    const ratio = img => (img.naturalWidth && img.naturalHeight) ? img.naturalWidth / img.naturalHeight : 1.72;

    function measure() {
      vh = innerHeight;
      const b = band.getBoundingClientRect();
      bandTop = b.top; bandH = b.height;
      rollerW = roller.getBoundingClientRect().width;
      // every tray gets the same width (tray 3's), heights follow each image's own ratio
      const last = trays[trays.length - 1];
      const w = Math.min(rollerW * 0.76, bandH * 0.66 * ratio($('.t-base', last)));
      trays.forEach(t => {
        const r = ratio($('.t-base', t));
        t._w = w; t._h = w / r;
        t.style.width = w + 'px';
      });
      render();
    }

    function render() {
      const total = 1 + 2 * STAGGER;   // 3 trays, one after another
      const bandCenter = bandTop + bandH / 2;
      trays.forEach((t, i) => {
        const h = t._h || 0;
        const u = progress * total - i * STAGGER;
        if (u <= 0 || u >= 1) {
          t.style.visibility = 'hidden';
          titles[i].style.opacity = bodies[i].style.opacity = 0;
          return;
        }
        const top = vh - u * (vh + h);
        t.style.visibility = 'visible';
        t.style.transform = `translate3d(-50%,${top}px,0)`;

        // part of the tray inside the red frame turns into khay_N.5
        const cutTop = clamp(bandTop - top, 0, h);
        const cutBottom = clamp(top + h - (bandTop + bandH), 0, h);
        const tin = $('.t-in', t);
        tin.style.clipPath = `inset(${cutTop}px 0 ${cutBottom}px 0)`;

        // text: starts when the tray touches the frame, clearest at the centre
        const dist = Math.abs(top + h / 2 - bandCenter);
        const d0 = bandH / 2 + h / 2;
        const o = clamp(1 - dist / d0, 0, 1);
        const s = o * o * (3 - 2 * o);
        titles[i].style.opacity = bodies[i].style.opacity = s;
        const dy = (1 - s) * 10;
        titles[i].style.transform = bodies[i].style.transform = `translateY(${dy}px)`;
      });
      if (hint) hint.style.opacity = progress > 0.015 ? 0 : 0.7;
    }

    function readTarget() {
      const max = document.documentElement.scrollHeight - innerHeight;
      target = max > 0 ? clamp(scrollY / max, 0, 1) : 0;
    }

    function tick() {
      progress += (target - progress) * 0.14;
      if (Math.abs(target - progress) < 0.0004) progress = target;
      render();
      raf = progress !== target ? requestAnimationFrame(tick) : null;
    }

    const kick = () => { readTarget(); if (!raf) raf = requestAnimationFrame(tick); };

    addEventListener('scroll', kick, { passive: true });
    addEventListener('resize', debounce(() => { measure(); kick(); }, 80));
    trays.forEach(t => $('.t-base', t).addEventListener('load', measure));
    $('img', roller).addEventListener('load', measure);
    measure(); readTarget(); progress = target; render();
  }

  /* -------------------------------------------------------
     6. GALLERY + project overlay
     ------------------------------------------------------- */
  const YT = id => `https://www.youtube.com/embed/${id}`;
  const A = 'assets/images/';

  const PROJECTS = [
    {
      title: 'Helena Artwork Recreation', year: 2026, card: A + 'gallery-1.png',
      media: { img: A + 'gallery-1.png' },
      cat: ['3D ENVIRONMENT'],
      role: { note: '(PERSONAL PROJECT)', items: ['3D GENERALIST'] },
      tools: ['UNREAL ENGINE', 'BLENDER', 'SUBSTANCE PAINTER'],
      info: [
        'MY FIRST UNREAL ENGINE 5 PROJECT, INSPIRED BY HELENA’S BEAUTIFUL ARTWORK. I RECREATED THE SCENE WITH A SPRING SUNRISE ATMOSPHERE INSTEAD OF THE ORIGINAL SUMMER SETTING.',
        'I MODELED AND TEXTURED MOST OF THE ENVIRONMENT MYSELF USING BLENDER AND SUBSTANCE PAINTER, WHILE INCORPORATING QUIXEL MEGASCANS AND MEGAPLANTS FOR NATURAL ASSETS. THIS PROJECT HELPED ME EXPLORE GEOMETRY NODES, UV UNWRAPPING, SUBSTANCE DESIGNER/PAINTER, AND THE UNREAL ENGINE WORKFLOW.',
        'SPECIAL THANKS TO HELENA FOR THE ORIGINAL ARTWORK AND INSPIRATION:<br><a href="https://www.artstation.com/artwork/helena-artwork" target="_blank" rel="noopener noreferrer">VIEW THE ORIGINAL ARTWORK ON ARTSTATION</a>'
      ],
      sub: [
        { t: 'yt', id: 'brc32v2ciUE' },
        { t: 'top', a: A + 'gallery-1/sm-gallery (1).png', b: A + 'gallery-1/sm-gallery (2).png', c: A + 'gallery-1/sm-gallery (3).png' },
        ...[[4, 5], [6, 7], [8, 9], [10, 11]].map(([a, b]) => ({ t: 'row', a: A + `gallery-1/sm-gallery (${a}).png`, b: A + `gallery-1/sm-gallery (${b}).png` }))
      ]
    },
    {
      title: 'awake', year: 2025, card: A + 'gallery-2.png',
      media: { img: A + 'gallery-2.png' },
      cat: ['3D ENVIRONMENT'],
      role: { note: '(PERSONAL PROJECT)', items: ['3D GENERALIST'] },
      tools: ['BLENDER', 'DAVINCI RESOLVE'],
      info: ['"awake" is inspired by the aging apartments in Ho Chi Minh City (Vietnam), this piece captures a quiet golden hour moment. Warm tones wrap around blooming bougainvillea, echoing the nostalgia of old Saigon. This is also an intro for my personal project.'],
      sub: [
        { t: 'yt', id: 'XV5h5I0Rcsk' },
        { t: 'img', src: A + 'gallery-2/sm-gallery (1).webp' },
        { t: 'img', src: A + 'gallery-2/sm-gallery (2).webp' }
      ]
    },
    {
      title: 'Identity in Contrast', year: 2025, card: A + 'gallery-3.png',
      media: { img: A + 'gallery-3.png' },
      cat: ['3D CONCEPT ART'],
      role: { note: '(Individual Academic Project)', items: ['3D GENERALIST'] },
      tools: ['BLENDER', 'ADOBE PHOTOSHOP'],
      info: ['THIS IS MY FIRST ASSIGNMENT AS A UNIVERSITY STUDENT, based on a brief centered around creativity. “IDENTITY IN CONTRAST” shows a creator trying to build a true sense of self while facing personal struggles and pressure from the world around them. By focusing on strong contrasts between bright and dark, or large spaces and a tiny figure, my digital image reflects the heavy pressures, expectations, and the shadow of predecessors. Even so, the creator keeps going, grows through these challenges, and learns to express their own identity with confidence.'],
      sub: [
        { t: 'row', a: A + 'gallery-3.png', b: A + 'gallery-3-1.png' },
        ...[1, 2, 3, 4, 5, 6, 7].map(n => ({ t: 'img', src: A + `gallery-3/sm-gallery (${n}).png` }))
      ]
    },
    {
      title: 'So Xau Media', year: 2026, card: A + 'gallery-4.png',
      media: { yt: 'Z1zKj49gOYE' },
      cat: ['3D CONCEPT ART'],
      role: { note: '(GROUP ACADEMIC PROJECT)', items: ['3D GENERALIST'] },
      tools: ['BLENDER', 'DAVINCI RESOLVE', 'FIGMA'],
      info: ['This project explores social issues within social media, focusing on three urgent concerns: cyberbullying, manipulation, and addiction. These problems are translated into an immersive exhibition, where each “room” is represented by a mascot that embodies a specific cause. By making invisible digital behaviours, especially manipulation become visible and tangible, the project aims to raise awareness in a more engaging and accessible way. Framed as a symposium, it also encourages participants to reflect, discuss, and spread these messages beyond the exhibition space.'],
      sub: [
        { t: 'img', src: A + 'gallery-4/meomeo.png' },
        { t: 'yt', id: '9SVwfP0kMUM' },
        { t: 'yt', id: 'v1rahDkZIug' },
        { t: 'yt', id: 'Tbmy9FI7QTo' },
        { t: 'row', a: A + 'gallery-4/sm-gallery (1).png', b: A + 'gallery-4/sm-gallery (2).png' },
        ...[3, 4, 5, 6].map(n => ({ t: 'img', src: A + `gallery-4/sm-gallery (${n}).png` }))
      ]
    },
    {
      title: 'Gluttony', year: 2025, card: A + 'gallery-5.png',
      media: { img: A + 'gallery-5.png' },
      cat: ['3D CONCEPT ART', 'GRAPHIC DESIGN'],
      role: { note: '(PERSONAL PROJECT)', items: ['3D GENERALIST', 'Graphic Designer'], bullets: true },
      tools: ['BLENDER', 'ADOBE PHOTOSHOP'],
      info: ['"awake" is inspired by the aging apartments in Ho Chi Minh City (Vietnam), this piece captures a quiet golden hour moment. Warm tones wrap around blooming bougainvillea, echoing the nostalgia of old Saigon. This is also an intro for my personal project.'],
      sub: [1, 2, 3].map(n => ({ t: 'img', src: A + `gallery-5/sm-gallery (${n}).png` }))
    },
    {
      title: 'Cigar Tycoon', year: 2026, card: A + 'gallery-6.png',
      media: { yt: 'TS5YgK9tYWY' },
      cat: ['WEB DESIGN'],
      role: { items: ['Vector Illustrator', 'Visual Designer - color palette & visual elements', 'Figma Prototyper', 'Motion Designer', 'Storyline Contributor'], bullets: true },
      tools: ['ADOBE ILLUSTRATOR', 'FIGMA'],
      info: ['"awake" is inspired by the aging apartments in Ho Chi Minh City (Vietnam), this piece captures a quiet golden hour moment. Warm tones wrap around blooming bougainvillea, echoing the nostalgia of old Saigon. This is also an intro for my personal project.'],
      sub: [
        ...[1, 2, 3].map(n => ({ t: 'img', src: A + `gallery-6/vid${n}.gif` })),
        ...[[1, 2], [3, 4], [5, 6], [7, 8], [9, 10], [11, 12]].map(([a, b]) => ({ t: 'row', a: A + `gallery-6/sm-gallery (${a}).png`, b: A + `gallery-6/sm-gallery (${b}).png` }))
      ]
    },
    {
      title: 'The Punishment', year: 2026, card: A + 'gallery-7.png',
      media: { img: A + 'gallery-7.png' },
      cat: ['ICON ILLUSTRATION'],
      role: { items: ['Vector Illustrator', 'Visual Contributor', 'Motion Designer'], bullets: true },
      tools: ['ADOBE ILLUSTRATOR', 'ADOBE AFTER EFFECTS'],
      info: [
        'Inspired by the concept of the Eighteen Levels of Hell in Eastern Buddhist folklore, this project reinterprets the traditional belief that every wrongdoing leads to a specific punishment. In classical narratives, each level of hell is associated with a particular sin and a corresponding form of retribution.',
        'Building upon this structure, the project transforms these traditional punishments into a contemporary visual language. Through stylized illustrations and symbolic representations, the work reflects behaviors and ethical issues that remain relevant in modern society. By connecting cultural mythology with contemporary design, the project aims to explore the visual imagery of the Buddhist underworld found in East Asian and Vietnamese folklore while making it more approachable for modern audiences. Ultimately, it serves as both a cultural exploration and a visual reminder that human actions carry consequences, encouraging reflection on everyday moral choices.'
      ],
      sub: [
        { t: 'img', src: A + 'gallery-7/sm-gallery (11).png' },
        ...[[1, 2], [3, 4], [5, 6], [7, 8], [9, 10]].map(([a, b]) => ({ t: 'row', a: A + `gallery-7/sm-gallery (${a}).png`, b: A + `gallery-7/sm-gallery (${b}).png` }))
      ]
    }
  ];

  // everything visible is lowercase
  PROJECTS.forEach(p => {
    p.title = p.title.toLowerCase();
    p.cat = p.cat.map(s => s.toLowerCase());
    if (p.role.note) p.role.note = p.role.note.toLowerCase();
    p.role.items = p.role.items.map(s => s.toLowerCase());
    p.tools = p.tools.map(s => s.toLowerCase());
    p.info = p.info.map(s => s.toLowerCase());
  });

  const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const fig = (src, alt) => `<figure><img src="${esc(src)}" alt="${esc(alt)}" ></figure>`;
  const yt  = (id, title) => `<iframe src="${YT(id)}" title="${esc(title)} video" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;

  function renderProject(i) {
    const p = PROJECTS[i];
    const media = p.media.yt ? yt(p.media.yt, p.title) : fig(p.media.img, p.title + ' main view');
    const cat = p.cat.length > 1
      ? `<ul class="info-list">${p.cat.map(c => `<li>${c}</li>`).join('')}</ul>`
      : `<p class="info-content">${p.cat[0]}</p>`;
    let role;
    if (p.role.bullets) {
      role = `${p.role.note ? `<p class="info-content">${p.role.note}</p>` : ''}<ul class="info-list">${p.role.items.map(r => `<li>${r}</li>`).join('')}</ul>`;
    } else {
      role = `<p class="info-content">${p.role.note}<br>${p.role.items.join('<br>')}</p>`;
    }
    const sub = p.sub.map((b, n) => {
      const alt = `${p.title} process ${n + 1}`;
      if (b.t === 'yt')  return yt(b.id, p.title);
      if (b.t === 'img') return fig(b.src, alt);
      if (b.t === 'row') return `<div class="proj-row">${fig(b.a, alt + 'a')}${fig(b.b, alt + 'b')}</div>`;
      if (b.t === 'top') return `<div class="proj-top">${fig(b.a, alt)}<div class="stack">${fig(b.b, alt + 'b')}${fig(b.c, alt + 'c')}</div></div>`;
      return '';
    }).join('');
    const prev = PROJECTS[(i + PROJECTS.length - 1) % PROJECTS.length].title;
    const next = PROJECTS[(i + 1) % PROJECTS.length].title;
    return `<article class="proj">
      <header><h1 class="proj-title">${esc(p.title)}</h1><p class="proj-year">${p.year}</p></header>
      <div class="proj-media">${media}</div>
      <section class="proj-info">
        <div class="proj-grid">
          <div><h2 class="info-heading">categories</h2>${cat}</div>
          <div><h2 class="info-heading">role</h2>${role}</div>
          <div><h2 class="info-heading">tools:</h2><ul class="info-list">${p.tools.map(t => `<li>${t}</li>`).join('')}</ul></div>
        </div>
        <div><h2 class="info-heading">info</h2><div class="description-text">${p.info.map(t => `<p>${t}</p>`).join('')}</div></div>
      </section>
      <section class="proj-sub">${sub}</section>
      <nav class="proj-nav">
        <button type="button" class="prev" data-go="${(i + PROJECTS.length - 1) % PROJECTS.length}">← ${esc(prev)}</button>
        <button type="button" class="next" data-go="${(i + 1) % PROJECTS.length}">${esc(next)} →</button>
      </nav>
    </article>`;
  }

  function initGallery() {
    const scroll = $('.g-scroll'), host = $('.g-cols');
    const overlay = $('.overlay'), ovScroll = $('.ov-scroll'), closeBtn = $('.ov-close');
    let lastFocus = null;

    function card(p, i) {
      return `<a class="g-card" href="#${i + 1}" data-i="${i}" aria-label="${esc(p.title)}, ${p.year}">
        <div class="art" data-alt="${esc(p.title)}">
          <img src="${p.card}" alt="${esc(p.title)}" loading="lazy">
          <span class="g-scan"></span>
        </div>
        <span class="g-cap"><span class="g-title">${esc(p.title)}</span><span class="g-year">${p.year}</span></span>
      </a>`;
    }

    let lastCols = 0;
    function layout() {
      const W = scroll.clientWidth;
      const n = W > 1000 ? 3 : W > 540 ? 2 : 1;
      if (n === lastCols) return;
      lastCols = n;
      const cols = Array.from({ length: n }, () => []);
      PROJECTS.forEach((p, i) => cols[i % n].push(card(p, i)));
      host.innerHTML = cols.map((c, k) => `<div class="g-col" style="margin-top:${n === 1 ? 0 : [0, 7, 3][k]}vh">${c.join('')}</div>`).join('');
      if (n === 1) $$('.g-card', host).forEach((c, i) => { c.style.width = '88%'; c.style.alignSelf = i % 2 ? 'flex-end' : 'flex-start'; });
      $$('.g-card img', host).forEach(img => img.addEventListener('error', () => img.parentElement.classList.add('missing')));
    }

    function open(i) {
      ovScroll.innerHTML = renderProject(i);
      ovScroll.scrollTop = 0;
      $$('.proj-row', ovScroll).forEach(row => {
        const figs = $$(':scope > figure', row);
        const fit = () => figs.forEach(f => {
          const im = $('img', f);
          if (im.naturalWidth && im.naturalHeight) f.style.flex = `${im.naturalWidth / im.naturalHeight} 1 0`;
        });
        $$('img', row).forEach(im => im.complete ? fit() : im.addEventListener('load', fit));
      });
      $$('img', ovScroll).forEach(img => img.addEventListener('error', () => {
        const f = img.parentElement; f.classList.add('missing'); f.dataset.alt = img.alt; f.style.minHeight = '140px';
      }));
      overlay.classList.add('open');
      overlay.setAttribute('aria-hidden', 'false');
      closeBtn.focus({ preventScroll: true });
    }

    function close() {
      overlay.classList.remove('open');
      overlay.setAttribute('aria-hidden', 'true');
      ovScroll.innerHTML = '';       // stops videos
      if (lastFocus) lastFocus.focus({ preventScroll: true });
    }

    host.addEventListener('click', e => {
      const c = e.target.closest('.g-card');
      if (!c) return;
      e.preventDefault();
      lastFocus = c;
      open(+c.dataset.i);
    });
    ovScroll.addEventListener('click', e => {
      const b = e.target.closest('[data-go]');
      if (b) open(+b.dataset.go);
    });
    closeBtn.addEventListener('click', close);
    $('.ov-dim').addEventListener('click', close);
    addEventListener('keydown', e => { if (e.key === 'Escape' && overlay.classList.contains('open')) close(); });

    layout();
    addEventListener('resize', debounce(layout, 150));
  }

  /* -------------------------------------------------------
     INIT
     ------------------------------------------------------- */
  initNav();
  initWallpaper();
  initCursor();
  if (page === 'about') initAbout();
  if (page === 'gallery') initGallery();
  initGlass();
  // cursor ring is created above, so glass runs after it
})();
