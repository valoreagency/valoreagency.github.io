import { spawn } from 'node:child_process';
const EDGE='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT=9334, URL_=process.argv[2]||'https://valore.agency/', W=Number(process.argv[3]||1440);
const proc=spawn(EDGE,[`--remote-debugging-port=${PORT}`,'--headless=new','--no-first-run',
  `--window-size=${W},900`,'--user-data-dir=C:/Users/dburb/AppData/Local/Temp/clickcheck-prof','about:blank'],{stdio:'ignore'});
await new Promise(r=>setTimeout(r,3500));
const list=await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const page=list.find(t=>t.type==='page');
const ws=new WebSocket(page.webSocketDebuggerUrl);
await new Promise(r=>ws.addEventListener('open',r));
let id=0; const pend=new Map();
ws.addEventListener('message',e=>{const m=JSON.parse(e.data); if(m.id&&pend.has(m.id)){pend.get(m.id)(m.result);pend.delete(m.id);}});
const send=(method,params={})=>new Promise(res=>{const i=++id;pend.set(i,res);ws.send(JSON.stringify({id:i,method,params}));});
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride',{width:W,height:900,deviceScaleFactor:1,mobile:false});
await send('Page.navigate',{url:URL_});
await new Promise(r=>setTimeout(r,2500));
const {result}=await send('Runtime.evaluate',{returnByValue:true,expression:`(()=>{
  const out={viewport:window.innerWidth, links:[]};
  const nav=document.querySelector('.nav'); const inner=document.querySelector('.nav__inner');
  const cs=nav?getComputedStyle(nav):null;
  out.nav={display:cs&&cs.display,position:cs&&cs.position,zIndex:cs&&cs.zIndex,
           pointerEvents:cs&&cs.pointerEvents,opacity:cs&&cs.opacity,
           height:nav?Math.round(nav.getBoundingClientRect().height):0,
           top:nav?Math.round(nav.getBoundingClientRect().top):0};
  const lc=document.querySelector('.nav__links'); const lcs=lc?getComputedStyle(lc):null;
  out.linksContainer={display:lcs&&lcs.display,visibility:lcs&&lcs.visibility,opacity:lcs&&lcs.opacity,
                      pointerEvents:lcs&&lcs.pointerEvents,zIndex:lcs&&lcs.zIndex};
  document.querySelectorAll('.nav__link, .nav__cta, .nav__logo').forEach(a=>{
    const r=a.getBoundingClientRect(); const s=getComputedStyle(a);
    const cx=Math.round(r.left+r.width/2), cy=Math.round(r.top+r.height/2);
    const hit=document.elementFromPoint(cx,cy);
    out.links.push({
      text:(a.textContent||'').trim().slice(0,22), href:a.getAttribute('href'),
      x:cx,y:cy,w:Math.round(r.width),h:Math.round(r.height),
      display:s.display, visibility:s.visibility, opacity:s.opacity, pointerEvents:s.pointerEvents,
      color:s.color,
      topElement: hit? (hit.tagName+(hit.className&&typeof hit.className==='string'?'.'+hit.className.split(' ').slice(0,2).join('.'):'')) : 'NONE',
      clickable: hit ? (hit===a || a.contains(hit) || hit.contains(a)) : false
    });
  });
  return out;
})()`});
console.log(JSON.stringify(result.value,null,1));
const shot=await send('Page.captureScreenshot',{format:'png'});
const fs=await import('node:fs');
fs.writeFileSync(`C:/Users/dburb/AppData/Local/Temp/claude/c--Users-dburb-OneDrive-Valore-Agency-Software-Valore-Brand-Builder/53ada5e1-db89-4aa7-9317-f402130014a0/scratchpad/header-${W}.png`, Buffer.from(shot.data,'base64'));
console.log('screenshot: header-'+W+'.png');
ws.close(); proc.kill();
