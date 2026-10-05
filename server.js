const {WebSocketServer}=require('ws'),fs=require('fs'),http=require('http');
const F=process.env.DATA||'data.json';let B={};try{B=JSON.parse(fs.readFileSync(F))}catch(e){}
let dirty=0,pd=0;setInterval(()=>{if(dirty){fs.writeFile(F,JSON.stringify(B),()=>{});dirty=0}},5000);
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[@4]/g,'a').replace(/3/g,'e').replace(/[1!|]/g,'i').replace(/0/g,'o').replace(/[$5]/g,'s');
const W1=/^(fuck|shit|bitch|nazi|hitler|merde|putain|salop|connard|connasse|encul|nique|pedo|nigg|fdp|ntm|suicid)/,W2=/(fuck|shit|bitch|putain|salope|connard|enculer|hitler)/;
const bad=t=>{t=String(t);const n=norm(t),sp=n.split(/[^a-z]+/);return sp.some(w=>W1.test(w))||(sp.filter(w=>w.length==1).length>=3&&W2.test(sp.join('')))||/@|https?:|www\.|\.(com|fr|net|org|io|xyz)\b/i.test(t)||/(\d[\s.\-]?){7,}/.test(t)};
const C=new Map(),srv=http.createServer((q,r)=>r.end('ok')),wss=new WebSocketServer({server:srv,maxPayload:4096});
const all=(o,skip)=>{const s=JSON.stringify(o);C.forEach(c=>{if(c!==skip&&c.ws.readyState==1)c.ws.send(s)})};
const to=(c,o)=>{if(c.ws.readyState==1)c.ws.send(JSON.stringify(o))};
wss.on('connection',ws=>{
  if(C.size>=200){ws.close();return}
  const c={ws,id:Math.random().toString(36).slice(2,9),p:{},last:0,n:0,t0:Date.now(),mute:0,rep:new Set()};C.set(c.id,c);
  ws.alive=1;ws.on('pong',()=>ws.alive=1);to(c,{t:'me',id:c.id});
  ws.on('message',raw=>{let m;try{m=JSON.parse(raw)}catch(e){return}if(!m||typeof m!='object')return;
    const now=Date.now();if(now-c.t0>10000){c.t0=now;c.n=0}if(++c.n>200)return;
    const w=Number.isInteger(m.w)&&m.w>=0&&m.w<20?m.w:null;
    if(m.t=='p'&&m.d&&typeof m.d=='object'){c.p={...c.p,...m.d};if(c.p.n&&bad(c.p.n))c.p.n='Joueur';c.p.n=String(c.p.n||'Joueur').slice(0,12);pd=1}
    else if(m.t=='e'){
      if(m.topic=='chat'){
        if(now<c.mute||now-c.last<1500)return;c.last=now;const d=m.data||{};
        if(Number.isInteger(d.q)&&d.q>=0&&d.q<8)m.data={n:c.p.n||'Joueur',q:d.q};
        else{const t=String(d.t||'').slice(0,120);if(!t.trim())return;if(bad(t)){to(c,{t:'warn'});return}m.data={n:c.p.n||'Joueur',t}}
      }else if(m.topic!='b')return;
      all({t:'e',topic:m.topic,data:m.data,from:c.id},c)}
    else if(m.t=='sub'&&w!==null)to(c,{t:'bl',w,list:Object.entries(B[w]||{})});
    else if(m.t=='bs'&&w!==null&&typeof m.id=='string'&&m.id.startsWith('w'+w+'_')&&/^[wn\d_]{1,30}$/.test(m.id)&&Number.isFinite(m.c)){
      B[w]=B[w]||{};if(Object.keys(B[w]).length>1500)return;B[w][m.id]=m.c;dirty=1;all({t:'bs',w,id:m.id,c:m.c})}
    else if(m.t=='bd'&&w!==null&&B[w]){delete B[w][m.id];dirty=1;all({t:'bd',w,id:m.id})}
    else if(m.t=='r'&&m.d&&C.has(m.d.id)&&m.d.id!=c.id){const x=C.get(m.d.id);x.rep.add(c.id);
      console.log('REPORT',new Date().toISOString(),x.id,JSON.stringify(m.d).slice(0,300));
      if(x.rep.size>=3){x.mute=now+15*60000;x.rep.clear();console.log('AUTO-MUTE 15 min',x.id)}}
  });
  ws.on('close',()=>{C.delete(c.id);pd=1})});
setInterval(()=>wss.clients.forEach(ws=>{if(!ws.alive)return ws.terminate();ws.alive=0;ws.ping()}),30000);
setInterval(()=>{if(pd){pd=0;all({t:'pl',list:[...C.values()].map(c=>({id:c.id,p:c.p}))})}},100);
srv.listen(process.env.PORT||8080);
