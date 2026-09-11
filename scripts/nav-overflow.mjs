// Measure nav overflow across viewport widths via CDP.
import { spawn } from 'node:child_process';
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9333;
const URL_ = process.argv[2] || 'https://valore.agency/';
const WIDTHS = [1440, 1280, 1160, 1024, 960, 900, 820, 769, 768, 700];

const proc = spawn(EDGE, [`--remote-debugging-port=${PORT}`, '--headless=new', '--no-first-run',
  '--user-data-dir=C:/Users/dburb/AppData/Local/Temp/navmeasure-profile', 'about:blank'], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 3500));

const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const page = list.find(t => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r));
let id = 0; const pend = new Map();
ws.addEventListener('message', e => {
  const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); }
});
const send = (method, params = {}) => new Promise(res => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });

await send('Page.enable');
console.log(`\nNav overflow check: ${URL_}\n`);
console.log('width   innerW  navScrollW  navClientW  linksW  ctaVisible  OVERFLOW');
for (const w of WIDTHS) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: URL_ });
  await new Promise(r => setTimeout(r, 1400));
  const { result } = await send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const inner = document.querySelector('.nav__inner');
      const links = document.querySelector('.nav__links');
      const cta = document.querySelector('.nav__cta');
      const ham = document.querySelector('.nav__hamburger');
      const vis = el => el && getComputedStyle(el).display !== 'none';
      const r = links ? links.getBoundingClientRect() : {width:0,right:0};
      const c = cta ? cta.getBoundingClientRect() : {left:0,width:0};
      return {
        innerW: window.innerWidth,
        navScrollW: inner ? inner.scrollWidth : 0,
        navClientW: inner ? inner.clientWidth : 0,
        linksW: Math.round(r.width),
        linksRight: Math.round(r.right),
        ctaLeft: Math.round(c.left),
        ctaVisible: vis(cta),
        hamVisible: vis(ham),
        linksVisible: vis(links),
        docOverflow: document.documentElement.scrollWidth > window.innerWidth
      };
    })()`
  });
  const v = result.value;
  const overflow = v.navScrollW > v.navClientW + 1;
  const collide = v.linksVisible && v.ctaVisible && v.linksRight > v.ctaLeft;
  console.log(
    String(v.innerW).padEnd(7) + String(v.navScrollW).padEnd(8) + String(v.navScrollW).padEnd(12) +
    String(v.navClientW).padEnd(12) + String(v.linksW).padEnd(8) + String(v.ctaVisible).padEnd(12) +
    (overflow ? 'YES' : 'no') + (collide ? '  <-- LINKS COLLIDE WITH CTA' : '') +
    (v.hamVisible ? '  [hamburger]' : '') + (v.docOverflow ? '  [page scrolls sideways]' : '')
  );
}
ws.close(); proc.kill();
