/* Easy Cinema Board — custom:easy-cinema-board
 * A movie-theater style poster board for Home Assistant dashboards and wall displays.
 *   - Poster slideshow: Now Available / Just Added / Coming Soon (from a Radarr feed sensor)
 *   - Movie / TV Now Playing (any media_player, e.g. Plex)
 *   - Music Now Playing (any media_player, e.g. Music Assistant)
 * The marquee header and footers are drawn by the card from your theater name.
 * Built by a non-developer with help from Claude (Anthropic). Provided as-is under the MIT license.
 */
const ECB_VERSION = '1.0.0';

(() => {
  if (customElements.get('easy-cinema-board')) return;

  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const fmt = (s) => { s = Math.max(0, Math.floor(s || 0)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = String(s % 60).padStart(2, '0'); return h ? h + ':' + String(m).padStart(2, '0') + ':' + x : m + ':' + x; };
  const ymd = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const fdate = (s) => { const p = String(s).split('-').map(Number); return MONTHS[p[1] - 1] + ' ' + p[2]; };
  const shuffle = (a) => { a = (a || []).slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const list = (v) => (Array.isArray(v) ? v : v ? [v] : []);

  // US Thanksgiving week (Nov 22 through the 4th Thursday) and Christmas (Dec 15 - 26)
  const holiday = () => {
    const d = new Date(), y = d.getFullYear(), m = d.getMonth(), dd = d.getDate();
    const w = new Date(y, 10, 1).getDay(), tg = 1 + ((4 - w + 7) % 7) + 21;
    if (m === 10 && dd >= 22 && dd <= tg) return 'thanksgiving';
    if (m === 11 && dd >= 15 && dd <= 26) return 'christmas';
    return null;
  };

  const DEFAULT_LABELS = {
    now_available: 'Now Available', just_added: 'Just Added', coming_soon: 'Coming Soon', now_playing: 'Now Playing',
    thanksgiving: 'Happy Thanksgiving', christmas: 'Merry Christmas',
    in_theaters: 'In Theaters', on_digital: 'On Digital', on_disc: 'On Disc', paused: 'Paused', music: 'Music',
    waiting: 'Waiting for the poster feed',
  };

  // ---------- marquee artwork (2160 x 300) ----------
  let BULBS = '';
  for (let x = 60; x <= 2100; x += 60) for (const y of [26, 274]) BULBS += `<circle cx="${x}" cy="${y}" r="6"/>`;

  const DEFS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
    <linearGradient id="ecb-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE7A3"/><stop offset=".5" stop-color="#F2B640"/><stop offset="1" stop-color="#B9761A"/></linearGradient>
    <linearGradient id="ecb-autumn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFD98A"/><stop offset=".5" stop-color="#F59E0B"/><stop offset="1" stop-color="#C2410C"/></linearGradient>
    <linearGradient id="ecb-xred" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF8A8A"/><stop offset=".5" stop-color="#E11D2E"/><stop offset="1" stop-color="#991B1B"/></linearGradient>
    <linearGradient id="ecb-water" x1="0" x2="1"><stop offset="0" stop-color="#38BDF8" stop-opacity="0"/><stop offset=".25" stop-color="#38BDF8"/><stop offset="1" stop-color="#7DD3FC"/></linearGradient>
    <linearGradient id="ecb-water2" x1="1" x2="0"><stop offset="0" stop-color="#38BDF8" stop-opacity="0"/><stop offset=".25" stop-color="#38BDF8"/><stop offset="1" stop-color="#7DD3FC"/></linearGradient>
    <radialGradient id="ecb-starglow"><stop offset="0" stop-color="#FFFBE6" stop-opacity=".95"/><stop offset=".35" stop-color="#FDE68A" stop-opacity=".45"/><stop offset="1" stop-color="#FDE68A" stop-opacity="0"/></radialGradient>
    <filter id="ecb-glow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <clipPath id="ecb-inner"><rect x="34" y="40" width="2092" height="220"/></clipPath>
    <g id="ecb-turkey"><g transform="translate(0,-10)"><g><ellipse cx="0" cy="-55" rx="22" ry="62" fill="#B91C1C" transform="rotate(-75)"/><ellipse cx="0" cy="-55" rx="22" ry="62" fill="#EA580C" transform="rotate(-50)"/><ellipse cx="0" cy="-55" rx="22" ry="62" fill="#F59E0B" transform="rotate(-25)"/><ellipse cx="0" cy="-58" rx="22" ry="64" fill="#B91C1C" transform="rotate(0)"/><ellipse cx="0" cy="-55" rx="22" ry="62" fill="#F59E0B" transform="rotate(25)"/><ellipse cx="0" cy="-55" rx="22" ry="62" fill="#EA580C" transform="rotate(50)"/><ellipse cx="0" cy="-55" rx="22" ry="62" fill="#B91C1C" transform="rotate(75)"/><g fill="#FCD34D" opacity=".9"><ellipse cx="0" cy="-100" rx="9" ry="14" transform="rotate(-75)"/><ellipse cx="0" cy="-100" rx="9" ry="14" transform="rotate(-50)"/><ellipse cx="0" cy="-100" rx="9" ry="14" transform="rotate(-25)"/><ellipse cx="0" cy="-104" rx="9" ry="14"/><ellipse cx="0" cy="-100" rx="9" ry="14" transform="rotate(25)"/><ellipse cx="0" cy="-100" rx="9" ry="14" transform="rotate(50)"/><ellipse cx="0" cy="-100" rx="9" ry="14" transform="rotate(75)"/></g></g><ellipse cx="0" cy="28" rx="46" ry="50" fill="#7C4A21"/><ellipse cx="0" cy="38" rx="30" ry="34" fill="#9A5B2A"/><circle cx="0" cy="-22" r="27" fill="#8B5530"/><circle cx="-10" cy="-28" r="6" fill="#fff"/><circle cx="10" cy="-28" r="6" fill="#fff"/><circle cx="-9" cy="-27" r="3" fill="#111"/><circle cx="11" cy="-27" r="3" fill="#111"/><path d="M-8 -16 L8 -16 L0 -2 Z" fill="#F59E0B"/><path d="M3 -8 C 12 0, 10 14, 3 16 C -2 10, -1 0, 3 -8 Z" fill="#DC2626"/><path d="M-18 76 l0 14 m0 0 l-9 8 m9 -8 l0 10 m0 -10 l9 8" stroke="#F59E0B" stroke-width="5" stroke-linecap="round" fill="none"/><path d="M18 76 l0 14 m0 0 l-9 8 m9 -8 l0 10 m0 -10 l9 8" stroke="#F59E0B" stroke-width="5" stroke-linecap="round" fill="none"/></g></g>
<g id="ecb-star"><circle r="95" fill="url(#ecb-starglow)"/><path d="M0 -95 L12 -12 L80 0 L12 12 L0 110 L-12 12 L-80 0 L-12 -12 Z" fill="#FFF7D1" filter="url(#ecb-glow)"/><path d="M0 -50 L6 -6 L42 0 L6 6 L0 58 L-6 6 L-42 0 L-6 -6 Z" fill="#FDE68A" transform="rotate(45)" opacity=".85"/><circle r="12" fill="#FFFFFF"/><g fill="#FFF3C4"><path d="M-110 -60 l3 -9 l3 9 l9 3 l-9 3 l-3 9 l-3 -9 l-9 -3 z"/><path d="M95 -70 l2 -7 l2 7 l7 2 l-7 2 l-2 7 l-2 -7 l-7 -2 z"/><path d="M105 55 l2 -6 l2 6 l6 2 l-6 2 l-2 6 l-2 -6 l-6 -2 z"/></g></g>
<g id="ecb-presents"><rect x="-105" y="-10" width="120" height="100" rx="6" fill="#DC2626"/><rect x="-53" y="-10" width="18" height="100" fill="#FCD34D"/><rect x="-105" y="30" width="120" height="16" fill="#FCD34D"/><path d="M-44 -10 C -70 -45, -95 -20, -44 -10 C -18 -45, 8 -20, -44 -10 Z" fill="#FCD34D" stroke="#B45309" stroke-width="2"/><rect x="20" y="20" width="90" height="70" rx="6" fill="#15803D"/><rect x="57" y="20" width="14" height="70" fill="#F8FAFC"/><rect x="20" y="48" width="90" height="13" fill="#F8FAFC"/><path d="M64 20 C 44 -6, 24 12, 64 20 C 84 -6, 104 12, 64 20 Z" fill="#F8FAFC" stroke="#94A3B8" stroke-width="2"/><rect x="-70" y="-62" width="64" height="52" rx="5" fill="#F2B640"/><rect x="-44" y="-62" width="12" height="52" fill="#DC2626"/><rect x="-70" y="-42" width="64" height="11" fill="#DC2626"/><path d="M-38 -62 C -54 -84, -70 -70, -38 -62 C -22 -84, -6 -70, -38 -62 Z" fill="#DC2626"/></g>
  </defs></svg>`;

  const frame = (inner) => `<svg viewBox="0 0 2160 300" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
    <rect width="2160" height="300" rx="28" fill="#0A0F1F"/>
    <rect x="10" y="10" width="2140" height="280" rx="22" fill="none" stroke="url(#ecb-gold)" stroke-width="6"/>
    <g fill="#FFF3C4" filter="url(#ecb-glow)">${BULBS}</g>${inner}</svg>`;

  // wave flourish whose right end sits at x = 0 (left side); mirrored for the right side
  const WAVE = `<path d="M-630 0 C -560 -30, -490 30, -420 0 S -280 -30, -210 0 S -70 30, 0 0" fill="none" stroke-width="10" stroke-linecap="round"/>
    <path d="M-580 24 C -510 -4, -440 52, -370 24 S -230 -4, -160 24 S -50 42, 10 28" fill="none" stroke-width="5" stroke-linecap="round" opacity=".7"/>`;
  const FOOT_WAVES = `<path d="M50 160 C 120 130, 190 190, 260 160 S 400 130, 470 160" fill="none" stroke="url(#ecb-water)" stroke-width="10" stroke-linecap="round"/>
    <path d="M90 186 C 160 158, 230 214, 300 186 S 430 168, 480 184" fill="none" stroke="url(#ecb-water)" stroke-width="5" stroke-linecap="round" opacity=".7"/>
    <path d="M2110 160 C 2040 130, 1970 190, 1900 160 S 1760 130, 1690 160" fill="none" stroke="url(#ecb-water2)" stroke-width="10" stroke-linecap="round"/>
    <path d="M2070 186 C 2000 158, 1930 214, 1860 186 S 1730 168, 1680 184" fill="none" stroke="url(#ecb-water2)" stroke-width="5" stroke-linecap="round" opacity=".7"/>`;

  const headerSvg = (top, main) => frame(top
    ? `<text class="fit" data-max="1660" transform="translate(1080,122) scale(1.14,1)" x="0" y="0" text-anchor="middle" font-family="Anton,Impact,sans-serif" font-size="76" letter-spacing="24" fill="#F5EFE0" stroke="#F5EFE0" stroke-width="2.5" stroke-linejoin="round">${esc(top.toUpperCase())}</text>
       <text class="fit hmain" data-max="1500" x="1080" y="232" text-anchor="middle" font-family="Limelight,serif" font-size="118" letter-spacing="10" fill="url(#ecb-gold)" stroke="#5A3A08" stroke-width="2">${esc(main.toUpperCase())}</text>
       <g clip-path="url(#ecb-inner)"><g class="wl" stroke="url(#ecb-water)" transform="translate(790,190)">${WAVE}</g><g class="wr" stroke="url(#ecb-water2)" transform="translate(1370,190) scale(-1,1)">${WAVE}</g></g>`
    : `<text class="fit hmain" data-max="1500" x="1080" y="196" text-anchor="middle" font-family="Limelight,serif" font-size="128" letter-spacing="10" fill="url(#ecb-gold)" stroke="#5A3A08" stroke-width="2">${esc(main.toUpperCase())}</text>
       <g clip-path="url(#ecb-inner)"><g class="wl" stroke="url(#ecb-water)" transform="translate(760,160)">${WAVE}</g><g class="wr" stroke="url(#ecb-water2)" transform="translate(1400,160) scale(-1,1)">${WAVE}</g></g>`);

  const footerSvg = (kind, L) => {
    if (kind === 'thanksgiving') return frame(`<text class="fit" data-max="1340" x="1080" y="192" text-anchor="middle" font-family="Limelight,serif" font-size="112" letter-spacing="6" fill="url(#ecb-autumn)" stroke="#5A2A08" stroke-width="2">${esc(L.thanksgiving)}</text>
      <use href="#ecb-turkey" transform="translate(205,165) scale(.8)"/><use href="#ecb-turkey" transform="translate(1955,165) scale(-.8,.8)"/>`);
    if (kind === 'christmas') return frame(`<text class="fit" data-max="1340" x="1080" y="196" text-anchor="middle" font-family="Limelight,serif" font-size="124" letter-spacing="8" fill="url(#ecb-xred)" stroke="#F2B640" stroke-width="2.5">${esc(L.christmas)}</text>
      <use href="#ecb-star" transform="translate(240,140) scale(.95)"/><use href="#ecb-presents" transform="translate(1925,140) scale(1.2)"/>`);
    const label = { available: L.now_available, recent: L.just_added, coming: L.coming_soon, playing: L.now_playing }[kind] || '';
    return frame(`<text class="fit" data-max="1120" x="1080" y="196" text-anchor="middle" font-family="Limelight,serif" font-size="122" letter-spacing="8" fill="url(#ecb-gold)" stroke="#5A3A08" stroke-width="2">${esc(label)}</text>${FOOT_WAVES}`);
  };

  const NOTE = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z"/></svg>';

  const CSS = `
    :host{display:block}
    .ov{position:fixed;inset:0;background:#000;z-index:10;overflow:hidden}
    .fr{position:absolute;top:0;left:0;width:100vw;height:100vh;--u:1vw;overflow:hidden;background:#05070d}
    .fr.rot{width:100vh;height:100vw;left:100vw;transform:rotate(90deg);transform-origin:top left;--u:1vh}
    .fr.land{--u:calc(100vh / 177.78)}
    .fr.rot.land{--u:calc(100vw / 177.78)}
    .col{position:relative;height:100%;width:calc(var(--u)*100);max-width:100%;margin:0 auto;display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:calc(var(--u)*.6) 0;box-sizing:border-box}
    .bg{position:absolute;inset:-12%;background-size:cover;background-position:center;filter:blur(calc(var(--u)*7)) brightness(.3) saturate(1.25);opacity:0;transition:opacity 1.4s ease}
    .bg.on{opacity:1}
    .hd,.ftw{position:relative;width:99%;aspect-ratio:2160/300;flex:none}
    .hd svg,.hd img,.ft svg,.ft img{position:absolute;inset:0;width:100%;height:100%;display:block}
    .ft{position:absolute;inset:0;opacity:0;transition:opacity 1s ease}
    .ft.on{opacity:1}
    .stage{position:relative;flex:1;width:100%}
    .sc{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;opacity:0;transition:opacity .9s ease;pointer-events:none}
    .sc.on{opacity:1}
    .gold{border:calc(var(--u)*.35) solid #C9962E;border-radius:calc(var(--u)*1.6);box-shadow:0 calc(var(--u)*1.5) calc(var(--u)*6) rgba(0,0,0,.75);box-sizing:border-box;background:#0A0F1F}
    .pw{position:absolute;top:calc(var(--u)*.6);bottom:calc(var(--u)*.6);left:.5%;right:.5%;overflow:hidden;background:#000}
    .pw img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity 1.4s ease}
    .pw img.on{opacity:1}
    .strip{position:absolute;left:0;right:0;bottom:0;background:linear-gradient(180deg,rgba(10,15,31,.82),rgba(10,15,31,.95));border-top:calc(var(--u)*.3) solid #C9962E;box-shadow:0 calc(var(--u)*-.6) calc(var(--u)*2) rgba(0,0,0,.45)}
    .band{padding:calc(var(--u)*.9) 0 calc(var(--u)*.8);font-family:Oswald,sans-serif;font-weight:500;color:#F2B640;font-size:calc(var(--u)*3.1);letter-spacing:.16em;text-transform:uppercase;text-align:center;opacity:0;transform:translateY(100%);transition:opacity .8s ease,transform .8s ease}
    .band.on{opacity:1;transform:none}
    .empty{position:absolute;inset:0;display:none;align-items:center;justify-content:center;text-align:center;padding:0 calc(var(--u)*8);font-family:Oswald,sans-serif;color:#bdb5a4;font-size:calc(var(--u)*3.4);letter-spacing:.08em}
    .slides.none .empty{display:flex}
    .mband{padding:calc(var(--u)*1.1) calc(var(--u)*3) calc(var(--u)*1)}
    .mve{font-family:Oswald,sans-serif;font-weight:500;color:#F2B640;font-size:calc(var(--u)*2.9);letter-spacing:.12em;text-transform:uppercase;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:calc(var(--u)*.7)}
    .mve:empty{display:none}
    .prow{display:flex;align-items:center;gap:calc(var(--u)*2);font-family:Oswald,sans-serif;color:#d6cfbf;font-size:calc(var(--u)*2.7)}
    .prow .bar{flex:1}
    .hide{visibility:hidden}
    .pz{position:absolute;left:50%;bottom:calc(var(--u)*4);transform:translateX(-50%);display:none;font-family:Oswald,sans-serif;font-weight:500;letter-spacing:.3em;text-transform:uppercase;color:#0A0F1F;background:#F2B640;padding:calc(var(--u)*.8) calc(var(--u)*3) calc(var(--u)*.8) calc(var(--u)*3.3);border-radius:99px;font-size:calc(var(--u)*3)}
    .mpw .pz{bottom:calc(var(--u)*10)}
    .paused .pz{display:block}.paused img{filter:brightness(.6)}
    .t{font-family:Anton,Impact,sans-serif;color:#fff;font-size:calc(var(--u)*7.6);line-height:1.12;text-align:center;margin-top:calc(var(--u)*5);padding:0 calc(var(--u)*6);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;letter-spacing:.02em;text-shadow:0 calc(var(--u)*.4) calc(var(--u)*1.5) rgba(0,0,0,.6)}
    .t.long{font-size:calc(var(--u)*6)}
    .ar,.al{font-family:Oswald,sans-serif;text-align:center;max-width:88%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .ar{font-weight:500;color:#F2B640;font-size:calc(var(--u)*4.8);margin-top:calc(var(--u)*1.8)}
    .al{color:#bdb5a4;font-size:calc(var(--u)*3.4);margin-top:calc(var(--u)*.8)}
    .ar:empty,.al:empty{display:none}
    .aw{position:relative;width:calc(var(--u)*84);height:calc(var(--u)*84)}
    .aw img{width:100%;height:100%;object-fit:cover;display:block}
    .ph{position:absolute;inset:0;display:none;align-items:center;justify-content:center;color:#C9962E}
    .ph svg{width:40%;height:40%}
    .noart img{visibility:hidden}.noart .ph{display:flex}
    .pr{width:calc(var(--u)*84);margin-top:calc(var(--u)*4)}
    .bar{height:calc(var(--u)*.7);background:rgba(255,255,255,.18);border-radius:99px;overflow:hidden}
    .fill{height:100%;width:0;background:linear-gradient(90deg,#FFE7A3,#F2B640,#B9761A)}
    .tm{display:flex;justify-content:space-between;font-family:Oswald,sans-serif;color:#d6cfbf;font-size:calc(var(--u)*2.6);margin-top:calc(var(--u)*1)}
  `;

  class EasyCinemaBoard extends HTMLElement {
    static getStubConfig() {
      return { feed: 'sensor.cinema_board_feed', theater_name: 'Home Cinema' };
    }

    setConfig(c) {
      if (!c) throw new Error('Invalid configuration');
      const cfg = Object.assign({
        feed: 'sensor.cinema_board_feed', theater_name: 'Home Cinema', slide_seconds: 20, music_grace_seconds: 30,
        rotate: false, holidays: true, show_recent: true, show_coming: true, load_fonts: true,
        header_image: null, footer_images: {},
      }, c);
      cfg.labels = Object.assign({}, DEFAULT_LABELS, c.labels || {});
      cfg.movies = list(c.movie_entity);
      cfg.musics = list(c.music_entity);
      this._c = cfg;
      this._mode = null; this._list = []; this._i = -1; this._musicSeen = 0; this._fails = 0; this._cur = null;
      this._ftKey = null; this._bgUrl = undefined;
      if (this._built) { this._built = false; this.shadowRoot.innerHTML = ''; if (this._h) { this._build(); this._update(); } }
    }

    set hass(h) {
      this._h = h;
      if (!this._built) this._build();
      this._update();
    }

    _loadFonts() {
      if (!this._c.load_fonts || document.getElementById('ecb-fonts')) return;
      const l = document.createElement('link');
      l.id = 'ecb-fonts'; l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=Anton&family=Limelight&family=Oswald:wght@400;500&display=swap';
      document.head.appendChild(l);
    }

    _build() {
      this._loadFonts();
      const c = this._c, L = c.labels;
      const r = this.shadowRoot || this.attachShadow({ mode: 'open' });
      const words = Array.isArray(c.theater_name) ? c.theater_name.map(String) : String(c.theater_name || '').trim().split(/\s+/);
      const main = Array.isArray(c.theater_name) ? (words[1] || words[0] || '') : words.pop() || '';
      const top = Array.isArray(c.theater_name) ? (words[1] ? words[0] : '') : words.join(' ');
      const header = c.header_image ? `<img src="${esc(c.header_image)}" alt="">` : headerSvg(top, main);
      r.innerHTML = `<style>${CSS}</style>${DEFS}
      <div class="ov"><div class="fr${c.rotate ? ' rot' : ''}">
        <div class="bg"></div><div class="bg"></div>
        <div class="col">
          <div class="hd">${header}</div>
          <div class="stage">
            <div class="sc slides"><div class="pw"><img alt=""><img alt=""><div class="strip band"></div></div><div class="empty">${esc(L.waiting)}<br>(${esc(c.feed)})</div></div>
            <div class="sc movie"><div class="pw mpw"><img alt="" class="on"><div class="pz">${esc(L.paused)}</div><div class="strip mband"><div class="mve"></div><div class="prow mpr"><span></span><div class="bar"><div class="fill"></div></div><span></span></div></div></div></div>
            <div class="sc music"><div class="aw gold"><img alt=""><div class="ph">${NOTE}</div><div class="pz">${esc(L.paused)}</div></div><div class="t mut"></div><div class="ar"></div><div class="al mua"></div><div class="pr upr"><div class="bar"><div class="fill"></div></div><div class="tm"><span></span><span></span></div></div></div>
          </div>
          <div class="ftw"><div class="ft"></div><div class="ft"></div></div>
        </div>
      </div></div>`;
      const q = (s) => r.querySelector(s), qa = (s) => r.querySelectorAll(s);
      this._e = {
        fr: q('.fr'), hd: q('.hd'), bgs: qa('.bg'), fts: qa('.ft'),
        sSlides: q('.slides'), sMovie: q('.movie'), sMusic: q('.music'),
        pimgs: qa('.slides .pw img'), band: q('.band'),
        mwrap: q('.mpw'), mimg: q('.mpw img'), me: q('.mve'), mpr: q('.mpr'),
        awrap: q('.aw'), aimg: q('.aw img'), ut: q('.mut'), ua: q('.ar'), ual: q('.mua'), upr: q('.upr'),
      };
      this._e.aimg.addEventListener('error', () => this._e.awrap.classList.add('noart'));
      this._bgi = 0; this._fti = 0; this._pi = 0;
      this._built = true;
      this._sizeCheck();
      this._fit(this._e.hd);
      if (document.fonts) {
        document.fonts.ready.then(() => { this._fit(this._e.hd); this._e.fts.forEach((f) => this._fit(f)); });
        if (!this._fontHook) { this._fontHook = () => { if (this._e) { this._fit(this._e.hd); this._e.fts.forEach((f) => this._fit(f)); } }; document.fonts.addEventListener('loadingdone', this._fontHook); }
      }
    }

    // letterbox the 9:16 column on screens that are wider than portrait
    _sizeCheck() {
      const w = window.innerWidth, h = window.innerHeight;
      const pw = this._c.rotate ? h : w, ph = this._c.rotate ? w : h;
      this._e.fr.classList.toggle('land', pw / ph > 9 / 16);
    }

    // shrink marquee text that is too wide and place the header waves beside the main line
    _fit(root) {
      if (!root) return;
      root.querySelectorAll('text.fit').forEach((t) => {
        t.removeAttribute('textLength'); t.removeAttribute('lengthAdjust');
        let w = 0; try { w = t.getComputedTextLength(); } catch (e) { w = 0; }
        const max = Number(t.dataset.max) || 1500;
        if (w > max) { t.setAttribute('textLength', String(max)); t.setAttribute('lengthAdjust', 'spacingAndGlyphs'); w = max; }
        if (t.classList.contains('hmain') && w > 0) {
          const svg = t.ownerSVGElement, wl = svg.querySelector('.wl'), wr = svg.querySelector('.wr');
          const y = t.getAttribute('y') === '232' ? 190 : 160;
          if (wl) wl.setAttribute('transform', `translate(${1080 - w / 2 - 20},${y})`);
          if (wr) wr.setAttribute('transform', `translate(${1080 + w / 2 + 20},${y}) scale(-1,1)`);
        }
      });
    }

    _st(id) { return id && this._h ? this._h.states[id] : undefined; }

    _active(ids, states) {
      for (const st of states) for (const id of ids) { const s = this._st(id); if (s && s.state === st) return id; }
      return null;
    }

    _decide() {
      const mv = this._active(this._c.movies, ['playing', 'paused']);
      if (mv) { this._movieId = mv; return 'movie'; }
      const mu = this._active(this._c.musics, ['playing', 'paused']);
      if (mu) { this._musicId = mu; this._musicSeen = Date.now(); return 'music'; }
      if (this._musicSeen && Date.now() - this._musicSeen < this._c.music_grace_seconds * 1000) return 'music';
      return 'slides';
    }

    _update() {
      if (!this._e) return;
      const mode = this._decide();
      if (mode !== this._mode) this._setMode(mode);
      if (mode === 'movie') this._renderMovie();
      if (mode === 'music') this._renderMusic();
      if (mode === 'slides' && !this._cur && !this._timer) this._next();
      this._tick();
    }

    _setMode(mode) {
      const e = this._e, prev = this._mode;
      this._mode = mode;
      e.sSlides.classList.toggle('on', mode === 'slides');
      e.sMovie.classList.toggle('on', mode === 'movie');
      e.sMusic.classList.toggle('on', mode === 'music');
      clearTimeout(this._timer); this._timer = null;
      if (mode === 'slides') {
        if (prev === null || !this._cur) this._next(); else { this._chrome(); this._schedule(); }
      } else {
        this._mkey = null; this._ukey = null;
        this._footer('playing');
      }
    }

    // ---------- slideshow ----------
    _feed() {
      const f = this._st(this._c.feed);
      const a = (f && f.attributes) || {};
      return {
        avail: Array.isArray(a.available) ? a.available : [],
        recent: this._c.show_recent && Array.isArray(a.recent) ? a.recent : [],
        coming: this._c.show_coming && Array.isArray(a.coming) ? a.coming : [],
      };
    }

    _buildList() {
      const f = this._feed();
      const A = shuffle(f.avail).map((x) => Object.assign({ k: 'available' }, x));
      const R = shuffle(f.recent).map((x) => Object.assign({ k: 'recent' }, x));
      const C = shuffle(f.coming).map((x) => Object.assign({ k: 'coming' }, x));
      const out = []; let ri = 0, ci = 0;
      for (let i = 0; i < A.length; i++) {
        out.push(A[i]);
        if (i % 3 === 1 && R.length) out.push(R[ri++ % R.length]);
        if (i % 3 === 2 && C.length) out.push(C[ci++ % C.length]);
      }
      // small libraries: make sure Just Added and Coming Soon still get a turn
      if (R.length && ri === 0) R.forEach((x) => out.push(x));
      if (C.length && ci === 0) C.forEach((x) => out.push(x));
      this._list = out.filter((x) => x && x.p); this._i = -1;
    }

    _next() {
      clearTimeout(this._timer); this._timer = null;
      if (this._mode !== 'slides') return;
      this._i++;
      if (this._i >= this._list.length) this._buildList(), this._i = 0;
      const it = this._list[this._i];
      this._e.sSlides.classList.toggle('none', !it && !this._cur);
      if (!it) { if (!this._cur) this._footer(this._availKind()); this._timer = setTimeout(() => this._next(), 10000); return; }
      const pre = new Image();
      pre.onload = () => { this._fails = 0; if (this._mode === 'slides') this._show(it); };
      pre.onerror = () => { this._fails++; this._timer = setTimeout(() => this._next(), this._fails > 5 ? 10000 : 300); };
      pre.src = it.p;
    }

    _show(it) {
      const e = this._e;
      this._cur = it;
      e.sSlides.classList.remove('none');
      const n = 1 - this._pi;
      e.pimgs[n].src = it.p;
      e.pimgs[n].classList.add('on');
      e.pimgs[this._pi].classList.remove('on');
      this._pi = n;
      this._chrome();
      this._schedule();
    }

    _comingCaption(it) {
      const t = ymd(new Date()), L = this._c.labels;
      if (it.c && it.c >= t) return L.in_theaters + ' · ' + fdate(it.c);
      if (it.d && it.d >= t) return L.on_digital + ' · ' + fdate(it.d);
      if (it.h && it.h >= t) return L.on_disc + ' · ' + fdate(it.h);
      return L.coming_soon;
    }

    _availKind() { return (this._c.holidays && holiday()) || 'available'; }

    _chrome() {
      const it = this._cur; if (!it) return;
      const e = this._e;
      if (it.k === 'coming') { e.band.textContent = this._comingCaption(it); e.band.classList.add('on'); } else e.band.classList.remove('on');
      this._bg(it.p);
      this._footer(it.k === 'available' ? this._availKind() : it.k);
    }

    _schedule() { clearTimeout(this._timer); this._timer = setTimeout(() => this._next(), Math.max(3, Number(this._c.slide_seconds) || 20) * 1000); }

    // ---------- shared chrome ----------
    _bg(url) {
      if (url === this._bgUrl) return;
      this._bgUrl = url;
      const n = 1 - this._bgi, b = this._e.bgs;
      b[n].style.backgroundImage = url ? `url("${String(url).replace(/"/g, '%22')}")` : 'none';
      b[n].classList.add('on'); b[this._bgi].classList.remove('on');
      this._bgi = n;
    }

    _footer(kind) {
      if (kind === this._ftKey) return;
      this._ftKey = kind;
      const n = 1 - this._fti, f = this._e.fts;
      const img = (this._c.footer_images || {})[kind];
      f[n].innerHTML = img ? `<img src="${esc(img)}" alt="">` : footerSvg(kind, this._c.labels);
      this._fit(f[n]);
      f[n].classList.add('on'); f[this._fti].classList.remove('on');
      this._fti = n;
    }

    // ---------- movie / TV ----------
    _renderMovie() {
      const s = this._st(this._movieId), a = (s && s.attributes) || {}, e = this._e;
      if (!s) return;
      const key = [s.state, a.media_title, a.media_series_title, a.entity_picture].join('|');
      if (key === this._mkey) return;
      this._mkey = key;
      const ep = a.media_series_title;
      e.me.textContent = ep ? [a.media_season != null ? 'S' + a.media_season : '', a.media_episode != null ? 'E' + a.media_episode : '', a.media_title || ''].filter(Boolean).join(' · ') : '';
      if (a.entity_picture && e.mimg.getAttribute('src') !== a.entity_picture) e.mimg.src = a.entity_picture;
      e.mwrap.classList.toggle('paused', s.state === 'paused');
      this._bg(a.entity_picture || '');
    }

    // ---------- music ----------
    _renderMusic() {
      const s = this._st(this._musicId), a = (s && s.attributes) || {}, e = this._e;
      const key = [s && s.state, a.media_title, a.media_artist, a.media_album_name, a.entity_picture].join('|');
      if (key === this._ukey) return;
      this._ukey = key;
      const title = a.media_title || this._c.labels.music;
      e.ut.textContent = title;
      e.ut.classList.toggle('long', title.length > 32);
      e.ua.textContent = a.media_artist || '';
      e.ual.textContent = a.media_album_name || '';
      const pic = a.entity_picture || '';
      if (pic) { e.awrap.classList.remove('noart'); if (e.aimg.getAttribute('src') !== pic) e.aimg.src = pic; }
      else { e.awrap.classList.add('noart'); e.aimg.removeAttribute('src'); }
      e.awrap.classList.toggle('paused', !s || s.state !== 'playing');
      this._bg(pic);
    }

    // ---------- progress ----------
    _prog(s, el) {
      const a = (s && s.attributes) || {};
      const dur = Number(a.media_duration) || 0;
      if (!s || !dur || a.media_position == null) { el.classList.add('hide'); return; }
      let pos = Number(a.media_position) || 0;
      if (s.state === 'playing' && a.media_position_updated_at) pos += (Date.now() - Date.parse(a.media_position_updated_at)) / 1000;
      pos = Math.min(Math.max(pos, 0), dur);
      el.classList.remove('hide');
      el.querySelector('.fill').style.width = (pos / dur * 100).toFixed(2) + '%';
      const sp = el.querySelectorAll('.tm span, :scope > span');
      sp[0].textContent = fmt(pos); sp[1].textContent = fmt(dur);
    }

    _tick() {
      if (!this._e || !this._h) return;
      const mode = this._decide();
      if (mode !== this._mode) { this._setMode(mode); if (mode === 'movie') this._renderMovie(); if (mode === 'music') this._renderMusic(); }
      if (this._mode === 'movie') this._prog(this._st(this._movieId), this._e.mpr);
      if (this._mode === 'music') this._prog(this._st(this._musicId), this._e.upr);
    }

    connectedCallback() {
      if (!this._iv) this._iv = setInterval(() => this._tick(), 1000);
      if (!this._rs) { this._rs = () => this._e && this._sizeCheck(); window.addEventListener('resize', this._rs); }
      if (this._built && this._mode === 'slides' && !this._timer) this._next();
    }

    disconnectedCallback() {
      clearInterval(this._iv); this._iv = null;
      clearTimeout(this._timer); this._timer = null;
      if (this._rs) { window.removeEventListener('resize', this._rs); this._rs = null; }
    }

    getCardSize() { return 12; }
  }

  customElements.define('easy-cinema-board', EasyCinemaBoard);
  window.customCards = window.customCards || [];
  window.customCards.push({ type: 'easy-cinema-board', name: 'Easy Cinema Board', description: 'Movie-theater poster board: Radarr poster slideshow with Coming Soon dates, plus movie and music Now Playing.', documentationURL: 'https://github.com/deejay4959/easy-cinema-board' });
  console.info('%c EASY-CINEMA-BOARD %c ' + ECB_VERSION, 'background:#F2B640;color:#0A0F1F;font-weight:700', 'color:#F2B640');
})();
