/* ===== Abas ===== */
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('on',x===b));
  document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('on',t.id===b.dataset.tab));
});

/* ===== Dispositivos ===== */
const NS='http://www.w3.org/2000/svg';
const DEV={
  A:{name:'PC-A',ip:'192.168.1.10',mac:'AA:AA:AA:0A',x:110,y:70},
  B:{name:'PC-B',ip:'192.168.1.20',mac:'BB:BB:BB:0B',x:110,y:290},
  C:{name:'SRV-C',ip:'192.168.1.30',mac:'CC:CC:CC:0C',x:395,y:60},
  R:{name:'Roteador',ip:'192.168.1.1',mac:'00:1A:2B:01',x:625,y:180}
};
const ORDER=['A','B','C','R'];
const SW={x:395,y:230};
const name=k=>DEV[k].name;

/* caches[k] = { ip: mac }  (dispositivo k conhece esses pares) */
let caches, swTable, step, STEPS, curScen=-1, animating=false;

/* ===== Desenho da topologia ===== */
const svg=document.getElementById('svg'),gL=document.getElementById('links'),gD=document.getElementById('devs'),gP=document.getElementById('pkts');
function el(tag,at,parent,html){const e=document.createElementNS(NS,tag);for(const a in at)e.setAttribute(a,at[a]);if(html!=null)e.innerHTML=html;(parent||svg).appendChild(e);return e;}
function drawTopo(){
  gL.innerHTML='';gD.innerHTML='';gP.innerHTML='';
  for(const k of ORDER) el('line',{x1:DEV[k].x,y1:DEV[k].y,x2:SW.x,y2:SW.y,class:'link'},gL);
  el('line',{x1:DEV.R.x,y1:DEV.R.y,x2:720,y2:180,class:'link','stroke-dasharray':'7 5'},gL);
  el('text',{x:700,y:168,class:'ad',fill:'#5d6876','text-anchor':'end',style:'font:11px var(--mono)'},gL,'Internet');
  const sw=el('g',{class:'sw'},gD);
  el('rect',{x:SW.x-62,y:SW.y-22,width:124,height:44,rx:8},sw);
  el('text',{x:SW.x,y:SW.y+5,'text-anchor':'middle'},sw,'Switch');
  for(const k of ORDER){
    const d=DEV[k],g=el('g',{class:'dev'+(k==='R'?' router':(k==='C'?' server':'')),id:'dev-'+k},gD);
    el('rect',{x:d.x-78,y:d.y-30,width:156,height:60,rx:10,class:'box'},g);
    el('text',{x:d.x,y:d.y-9,'text-anchor':'middle',class:'nm'},g,d.name+(k==='R'?' · gateway':''));
    el('text',{x:d.x,y:d.y+7,'text-anchor':'middle',class:'ad'},g,d.ip);
    el('text',{x:d.x,y:d.y+21,'text-anchor':'middle',class:'ad'},g,d.mac);
  }
}
function setActive(keys,dim){
  for(const k of ORDER){
    const g=document.getElementById('dev-'+k);
    g.classList.toggle('active',keys&&keys.includes(k));
    g.classList.toggle('dim',!!dim&&!(keys&&keys.includes(k)));
  }
}
const pt=k=>k==='SW'?SW:DEV[k];
function animate(path,kind,label,dur=800){
  return new Promise(res=>{
    const pts=path.map(pt),g=el('g',{class:'pkt '+kind},gP),w=label.length*6.6+16;
    el('rect',{x:-w/2,y:-12,width:w,height:24,rx:7},g);
    el('text',{y:4,'text-anchor':'middle'},g,label);
    const seg=[];let tot=0;
    for(let i=1;i<pts.length;i++){const l=Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y);seg.push(l);tot+=l;}
    const t0=performance.now();
    (function f(now){
      let p=Math.min(1,(now-t0)/dur),dist=p*tot,i=0;
      while(i<seg.length-1&&dist>seg[i]){dist-=seg[i];i++;}
      const a=pts[i],b=pts[i+1],r=seg[i]?dist/seg[i]:1;
      g.setAttribute('transform',`translate(${a.x+(b.x-a.x)*r},${a.y+(b.y-a.y)*r})`);
      if(p<1)requestAnimationFrame(f);else{g.remove();res();}
    })(t0);
  });
}
async function discard(keys){
  const ts=keys.map(k=>el('text',{x:DEV[k].x+58,y:DEV[k].y-18,class:'discard','text-anchor':'middle'},gP,'✕'));
  await new Promise(r=>setTimeout(r,700));ts.forEach(t=>t.remove());
}

/* ===== Caches ===== */
function renderCaches(flashKey){
  const box=document.getElementById('caches');let h='';
  for(const k of ORDER){
    const c=caches[k],ips=Object.keys(c).sort();
    h+=`<div class="cc${flashKey===k?' act':''}"><h4>${DEV[k].name}</h4><div class="sub">${DEV[k].ip} · ${DEV[k].mac}</div>`;
    if(!ips.length) h+='<div class="empty">cache vazia</div>';
    else{
      h+='<table><tr><th>IP</th><th>MAC</th></tr>';
      for(const ip of ips) h+=`<tr class="${flashKey===k&&c[ip].flash?'flash':''}"><td>${ip}</td><td>${c[ip].mac}</td></tr>`;
      h+='</table>';
    }
    h+='</div>';
  }
  box.innerHTML=h;
  for(const k of ORDER)for(const ip in caches[k])caches[k][ip].flash=false;
}
function learn(k,ip,mac){ if(DEV[k]&&ip===DEV[k].ip)return; caches[k][ip]={mac,flash:true}; }

/* ===== Cenários (sequências de passos) =====
   Cada passo: {badge,title,text,hint,active,dim,anim:[path,kind,label],mut}
   mut aplica a mudança de estado (usado tanto no avanço quanto no replay do Anterior). */
const RQ='req',RP='rep',IC='icmp',ICR='icmpr';

function scenLocal(){ // PC-A fala com PC-B
  const Bmac=DEV.B.mac,Amac=DEV.A.mac;
  return {
    seed:()=>{},
    steps:[
      {badge:['info','Objetivo'],title:'PC-A quer enviar um ping para PC-B',
       text:'PC-A conhece o <b>IP</b> de destino (192.168.1.20), mas a placa de rede só entrega quadros a um <b>endereço MAC</b>. Ele precisa descobrir o MAC de PC-B.',
       hint:'Todas as caches começam vazias.',active:['A']},
      {badge:['info','Passo 1'],title:'PC-A consulta a própria cache ARP',
       text:'Antes de perguntar na rede, PC-A procura 192.168.1.20 na sua cache. Está <b>vazia</b> — ele ainda não sabe o MAC.',
       hint:'Se já soubesse, iria direto ao ping, sem nenhum ARP.',active:['A'],flash:'A'},
      {badge:['req','Passo 2'],title:'PC-A envia um ARP Request em broadcast',
       text:'“Quem tem <b>192.168.1.20</b>? Responda para 192.168.1.10.” O quadro vai ao endereço de broadcast (FF:FF:FF:FF:FF:FF).',
       hint:'O Request carrega o IP e o MAC de quem pergunta.',active:['A'],anim:[['A','SW'],RQ,'ARP Request']},
      {badge:['req','Passo 3'],title:'O switch repassa o broadcast a todos',
       text:'Como é broadcast, o switch envia o quadro por <b>todas</b> as portas. PC-B, SRV-C e o roteador recebem.',
       hint:'',active:['B','C','R'],anim:[['SW','B'],RQ,'ARP Request'],anim2:[['SW','C'],RQ,'ARP Request'],anim3:[['SW','R'],RQ,'ARP Request']},
      {badge:['info','Passo 4'],title:'Quem não é o alvo descarta',
       text:'SRV-C e o roteador comparam: o IP perguntado não é o deles → <b>descartam</b> o quadro. Só PC-B é o alvo.',
       hint:'',active:['B'],dim:true,discard:['C','R']},
      {badge:['info','Passo 5'],title:'PC-B aprende quem perguntou',
       text:'O Request trouxe o IP e o MAC de PC-A. PC-B aproveita e já grava esse par na sua cache — assim não precisará perguntar na volta.',
       hint:'Veja a cache de PC-B mudar abaixo.',active:['B'],flash:'B',
       mut:()=>learn('B',DEV.A.ip,Amac)},
      {badge:['rep','Passo 6'],title:'PC-B responde com um ARP Reply (unicast)',
       text:'“192.168.1.20 está em <b>'+Bmac+'</b>.” A resposta vai <b>direto</b> para PC-A, não em broadcast.',
       hint:'Só o dono do IP responde.',active:['B'],anim:[['B','SW','A'],RP,'ARP Reply']},
      {badge:['info','Passo 7'],title:'PC-A grava PC-B na cache',
       text:'PC-A recebe a resposta e armazena <b>192.168.1.20 → '+Bmac+'</b>. Agora as duas pontas se conhecem.',
       hint:'Essa entrada fica guardada por um tempo (TTL) para reaproveitar.',active:['A'],flash:'A',
       mut:()=>learn('A',DEV.B.ip,Bmac)},
      {badge:['icmp','Passo 8'],title:'Finalmente, o ping é enviado',
       text:'Com o MAC em mãos, PC-A monta o quadro e envia o ICMP Echo Request <b>diretamente</b> para PC-B.',
       hint:'',active:['A','B'],anim:[['A','SW','B'],IC,'Ping']},
      {badge:['done','Concluído'],title:'PC-B responde o ping ✓',
       text:'A comunicação acontece. Repare no resultado: a cache de <b>PC-A</b> conhece PC-B e a de <b>PC-B</b> conhece PC-A — bastou <b>um</b> Request e <b>um</b> Reply.',
       hint:'Rode o cenário “Segunda vez” para ver o que muda com a cache cheia.',active:['A','B'],anim:[['B','SW','A'],ICR,'Resposta']}
    ]
  };
}
function scenCached(){ // repetição com cache cheia
  const Bmac=DEV.B.mac,Amac=DEV.A.mac;
  return {
    seed:()=>{ caches.A[DEV.B.ip]={mac:Bmac}; caches.B[DEV.A.ip]={mac:Amac}; },
    steps:[
      {badge:['info','Situação'],title:'PC-A e PC-B já conversaram antes',
       text:'Por isso cada um já tem o outro na cache (veja abaixo). Vamos pingar PC-B <b>de novo</b>.',
       hint:'',active:['A']},
      {badge:['info','Passo 1'],title:'PC-A consulta a cache... e encontra',
       text:'PC-A procura 192.168.1.20 e acha <b>'+Bmac+'</b> guardado. <b>Nenhum ARP é necessário.</b>',
       hint:'É exatamente para isso que a cache existe: evitar um broadcast a cada pacote.',active:['A'],flash:'A'},
      {badge:['icmp','Passo 2'],title:'Ping direto',
       text:'PC-A monta o quadro usando o MAC da cache e envia o ping imediatamente.',
       hint:'Compare com o cenário anterior: aqui não houve Request nem Reply.',active:['A','B'],anim:[['A','SW','B'],IC,'Ping']},
      {badge:['done','Concluído'],title:'PC-B responde ✓',
       text:'Comunicação instantânea, sem broadcast. Quando a entrada expira (TTL), o ARP volta a ser necessário.',
       hint:'',active:['A','B'],anim:[['B','SW','A'],ICR,'Resposta']}
    ]
  };
}
function scenGateway(){ // destino fora da rede
  const Rmac=DEV.R.mac,Amac=DEV.A.mac,EXT='203.0.113.80';
  return {
    seed:()=>{},
    steps:[
      {badge:['info','Objetivo'],title:'PC-A quer acessar um site na Internet',
       text:'O destino é <b>'+EXT+'</b>. PC-A compara com sua máscara (/24) e percebe: esse IP <b>não</b> está na rede local 192.168.1.0/24.',
       hint:'',active:['A']},
      {badge:['info','Passo 1'],title:'Para sair da rede, fala-se com o gateway',
       text:'Quando o destino é externo, o próximo salto é o <b>roteador</b> (gateway, 192.168.1.1). É o MAC <b>dele</b> que PC-A precisa — não o do IP externo.',
       hint:'Ponto-chave do ARP com roteamento.',active:['A','R']},
      {badge:['req','Passo 2'],title:'ARP Request pelo gateway',
       text:'A cache está vazia, então PC-A pergunta em broadcast: “Quem tem <b>192.168.1.1</b>?” (e não pelo 203.0.113.80).',
       hint:'',active:['A'],anim:[['A','SW'],RQ,'ARP Request'],
       postDiscard:['B','C']},
      {badge:['req','Passo 3'],title:'O switch repassa; só o roteador é o alvo',
       text:'PC-B e SRV-C recebem e descartam. O roteador é o dono de 192.168.1.1 e grava PC-A na sua cache.',
       hint:'',active:['R'],anim:[['SW','R'],RQ,'ARP Request'],anim2:[['SW','B'],RQ,'ARP Request'],anim3:[['SW','C'],RQ,'ARP Request'],
       discard:['B','C'],mut:()=>learn('R',DEV.A.ip,Amac),flash:'R'},
      {badge:['rep','Passo 4'],title:'O roteador responde',
       text:'“192.168.1.1 está em <b>'+Rmac+'</b>.” Reply unicast direto para PC-A.',
       hint:'',active:['R'],anim:[['R','SW','A'],RP,'ARP Reply']},
      {badge:['info','Passo 5'],title:'PC-A grava o gateway na cache',
       text:'PC-A guarda <b>192.168.1.1 → '+Rmac+'</b>. Ele usará esse MAC para <b>todo</b> tráfego que sai da rede.',
       hint:'',active:['A'],flash:'A',mut:()=>learn('A',DEV.R.ip,Rmac)},
      {badge:['icmp','Passo 6'],title:'O pacote sai pelo roteador',
       text:'PC-A envia o ping. No quadro: IP de destino = <b>'+EXT+'</b>, mas MAC de destino = <b>o do gateway</b>. O roteador recebe e encaminha para a Internet.',
       hint:'',active:['A','R'],anim:[['A','SW','R'],IC,'Ping → '+EXT]},
      {badge:['done','Lição'],title:'ARP resolve o próximo salto',
       text:'Para destinos <b>fora</b> da rede, o ARP nunca descobre o MAC do IP externo — ele resolve o MAC do <b>gateway</b>. A cache de PC-A guarda apenas o roteador.',
       hint:'',active:['A','R']}
    ]
  };
}
const SCENARIOS=[
  {t:'Comunicação local',s:'PC-A → PC-B na mesma rede, com as caches vazias. O ciclo completo Request/Reply.',build:scenLocal},
  {t:'Segunda vez (cache cheia)',s:'O mesmo ping, agora com a cache preenchida: nenhum ARP é enviado.',build:scenCached},
  {t:'Acesso à Internet (gateway)',s:'PC-A acessa um IP externo e resolve o MAC do roteador, não o do destino.',build:scenGateway}
];

/* ===== Motor de passos ===== */
function resetState(){ caches={A:{},B:{},C:{},R:{}}; swTable={}; }
function applyUpTo(n){ // reconstrói o estado determinísticamente até o passo n (sem animar)
  resetState(); STEPS.seed();
  for(let i=0;i<=n;i++){ const s=STEPS.steps[i]; if(s.mut)s.mut(); }
}
function renderStep(s,flash){
  document.getElementById('badge').className='badge '+s.badge[0];
  document.getElementById('badge').textContent=s.badge[1];
  document.getElementById('stTitle').innerHTML=s.title;
  document.getElementById('stText').innerHTML=s.text;
  document.getElementById('stHint').innerHTML=s.hint||'';
  setActive(s.active,s.dim);
  renderCaches(flash||s.flash);
  const dots=document.getElementById('dots');dots.innerHTML='';
  STEPS.steps.forEach((_,i)=>{const d=document.createElement('i');d.className=i===step?'on':(i<step?'past':'');dots.appendChild(d);});
  document.getElementById('stepNo').textContent=`passo ${step+1}/${STEPS.steps.length}`;
  document.getElementById('prevBtn').disabled=step===0||animating;
  document.getElementById('nextBtn').disabled=step===STEPS.steps.length-1||animating;
  document.getElementById('restartBtn').disabled=animating;
}
async function goNext(){
  if(animating||step>=STEPS.steps.length-1)return;
  step++; const s=STEPS.steps[step];
  animating=true; renderStep(s); // trava botões
  if(s.anim){
    gP.innerHTML='';
    const jobs=[animate(...s.anim)];
    if(s.anim2)jobs.push(animate(...s.anim2));
    if(s.anim3)jobs.push(animate(...s.anim3));
    await Promise.all(jobs);
  }
  if(s.discard)await discard(s.discard);
  if(s.mut)s.mut();
  animating=false;
  renderStep(s,s.flash); // agora com flash da cache alterada e botões liberados
}
function goPrev(){
  if(animating||step===0)return;
  step--; applyUpTo(step); gP.innerHTML=''; renderStep(STEPS.steps[step]);
}
function startScenario(i){
  curScen=i; STEPS=SCENARIOS[i].build();
  document.querySelectorAll('#scen button').forEach((b,bi)=>b.classList.toggle('on',bi===i));
  step=0; applyUpTo(0); gP.innerHTML=''; renderStep(STEPS.steps[0]);
}
function buildScenBar(){
  const box=document.getElementById('scen');box.innerHTML='';
  SCENARIOS.forEach((sc,i)=>{
    const b=document.createElement('button');
    b.innerHTML=`<b>${i+1}. ${sc.t}</b><small>${sc.s}</small>`;
    b.onclick=()=>startScenario(i);box.appendChild(b);
  });
}
document.getElementById('nextBtn').onclick=goNext;
document.getElementById('prevBtn').onclick=goPrev;
document.getElementById('restartBtn').onclick=()=>startScenario(curScen);

/* ===== Quiz ===== */
const QUIZ=[
 {q:'Para que serve o protocolo ARP?',
  opts:['Traduzir nomes de site em endereços IP','Descobrir o endereço MAC correspondente a um IP na rede local','Distribuir endereços IP aos computadores','Rotear pacotes entre redes diferentes'],
  a:1,why:'O ARP mapeia um IP conhecido para o MAC correspondente no mesmo enlace. Nome→IP é o DNS; atribuir IP é o DHCP; rotear entre redes é função do roteador.'},
 {q:'Como um ARP Request é enviado na rede?',
  opts:['Em unicast, direto ao destino','Em broadcast, para todos os dispositivos do enlace','Apenas para o gateway','Pela Internet, até achar o host'],
  a:1,why:'Quem pergunta ainda não conhece o MAC do alvo, então envia em broadcast. Só o dono do IP responde — e essa resposta (Reply), sim, é unicast.'},
 {q:'Quando o host-alvo recebe o Request destinado a ele, o que faz além de responder?',
  opts:['Apaga a própria cache','Grava na cache o IP e o MAC de quem perguntou','Reenvia o Request em broadcast','Nada além de responder'],
  a:1,why:'O Request já traz o IP e o MAC do remetente, então o alvo aproveita e aprende quem perguntou — evitando um segundo ARP na volta.'},
 {q:'PC-A já tem o MAC de PC-B guardado na cache. O que acontece ao pingar PC-B de novo?',
  opts:['Envia um novo ARP Request por segurança','Não envia ARP: usa o MAC da cache e manda o ping direto','Precisa perguntar ao gateway','Apaga a cache e recomeça'],
  a:1,why:'Com o par IP→MAC na cache, o host monta o quadro direto. É o que evita um broadcast a cada pacote. O ARP só volta quando a entrada expira.'},
 {q:'PC-A (192.168.1.10) quer acessar 8.8.8.8, fora da rede local. Pelo MAC de quem o ARP pergunta?',
  opts:['Pelo MAC de 8.8.8.8','Pelo MAC do gateway padrão','Por nenhum: o ARP não é usado','Pelo MAC de broadcast'],
  a:1,why:'8.8.8.8 está fora da sub-rede. PC-A resolve o MAC do gateway (próximo salto). O IP de destino do pacote continua 8.8.8.8, mas o MAC de destino do quadro é o do roteador.'},
 {q:'Por que as entradas da cache ARP têm um tempo de validade?',
  opts:['Para liberar IPs para outros hosts','Porque o mapeamento IP→MAC pode mudar com o tempo','Para economizar banda da rede','Porque o protocolo exige renovar a cada pacote'],
  a:1,why:'Um IP pode passar a corresponder a outro MAC (troca de placa, novo DHCP). O prazo faz o host voltar a perguntar de vez em quando, em vez de usar um dado velho.'}
];
let answered=0;
function buildQuiz(){
  answered=0;const box=document.getElementById('qlist');box.innerHTML='';
  QUIZ.forEach((item,qi)=>{
    const card=document.createElement('div');card.className='q';
    card.innerHTML=`<div class="qt"><span>${qi+1}.</span>${item.q}</div>`;
    const fb=document.createElement('div');fb.className='fb';
    item.opts.forEach((o,oi)=>{
      const btn=document.createElement('button');btn.className='opt';btn.textContent=o;
      btn.onclick=()=>{
        if(card.dataset.done)return;card.dataset.done='1';answered++;
        const ok=oi===item.a;
        card.querySelectorAll('.opt').forEach((b,bi)=>{b.disabled=true;if(bi===item.a)b.classList.add('right');else if(bi===oi)b.classList.add('wrong');});
        fb.innerHTML=`<b class="${ok?'ok':'no'}">${ok?'Correto.':'Não é essa.'}</b> ${item.why}`;
        fb.classList.add('show');
        document.getElementById('score').textContent=`${answered} de ${QUIZ.length} respondidas`;
        document.getElementById('scoreBar').style.width=(answered/QUIZ.length*100)+'%';
      };
      card.appendChild(btn);
    });
    card.appendChild(fb);box.appendChild(card);
  });
}
document.getElementById('quizReset').onclick=buildQuiz;

/* ===== Início ===== */
drawTopo();buildScenBar();resetState();buildQuiz();startScenario(0);
