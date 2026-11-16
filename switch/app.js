/* ===== Abas ===== */
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('on',x===b));
  document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('on',t.id===b.dataset.tab));
});

/* ===== Dispositivos e geometria ===== */
const NS='http://www.w3.org/2000/svg';
const DEV={
  A:{name:'PC-A',mac:'AA:AA:AA:AA:AA:0A'},
  B:{name:'PC-B',mac:'BB:BB:BB:BB:BB:0B'},
  C:{name:'PC-C',mac:'CC:CC:CC:CC:CC:0C'},
  D:{name:'Notebook-D',mac:'DD:DD:DD:DD:DD:0D'}
};
const ORDER=['A','B','C','D'];
const BCAST='FF:FF:FF:FF:FF:FF';
const PORTS=[1,2,3,4,5];
const SW={x:370,y:175};
const PP={1:{x:282,y:145},2:{x:282,y:205},3:{x:458,y:145},4:{x:458,y:205},5:{x:370,y:205}}; // pontos das portas
const HOSTPOS={1:{x:110,y:62},2:{x:110,y:298},3:{x:630,y:62},4:{x:630,y:298},5:{x:370,y:312}}; // posição do host ligado em cada porta
const DEFAULT_PORTS={A:1,B:2,C:3,D:4};
const macOwner=mac=>ORDER.find(k=>DEV[k].mac===mac);

/* Estado: tabela MAC, porta de cada host e quadro em análise */
let tbl,removed,ports,lastPos,frame,focus='',step,STEPS,curScen=-1,animating=false;

/* ===== Desenho ===== */
const svg=document.getElementById('svg'),gL=document.getElementById('links'),gD=document.getElementById('devs'),gP=document.getElementById('pkts');
function el(tag,at,parent,html){const e=document.createElementNS(NS,tag);for(const a in at)e.setAttribute(a,at[a]);if(html!=null)e.innerHTML=html;(parent||svg).appendChild(e);return e;}
function drawStatic(){
  gD.innerHTML='';
  const sw=el('g',{class:'sw'},gD);
  el('rect',{x:240,y:145,width:260,height:60,rx:9,class:'body'},sw);
  el('text',{x:SW.x,y:SW.y-1,'text-anchor':'middle',class:'t'},sw,'Switch');
  el('text',{x:SW.x,y:SW.y+15,'text-anchor':'middle',class:'s'},sw,'camada 2');
  for(const p of PORTS){
    const g=el('g',{class:'port',id:'port-'+p},gD);
    el('rect',{x:PP[p].x-11,y:PP[p].y-8,width:22,height:16,rx:3},g);
    el('text',{x:PP[p].x,y:PP[p].y+4,'text-anchor':'middle'},g,'P'+p);
  }
  for(const k of ORDER){
    const g=el('g',{class:'dev',id:'dev-'+k},gD);
    el('rect',{x:-78,y:-30,width:156,height:60,rx:10,class:'box'},g);
    el('text',{x:0,y:-6,'text-anchor':'middle',class:'nm'},g,DEV[k].name);
    el('text',{x:0,y:13,'text-anchor':'middle',class:'ad'},g,DEV[k].mac);
  }
}
function hostPos(k){return ports[k]?HOSTPOS[ports[k]]:lastPos[k];}
function renderTopo(s){
  gL.innerHTML='';
  for(const k of ORDER){
    const p=ports[k],g=document.getElementById('dev-'+k),pos=hostPos(k);
    if(p) el('line',{x1:pos.x,y1:pos.y,x2:PP[p].x,y2:PP[p].y,class:'link'},gL);
    g.style.transform=`translate(${pos.x}px,${pos.y}px)`;
    g.classList.toggle('off',!p);
    g.classList.toggle('active',!!(s.active&&s.active.includes(k)));
    g.classList.toggle('dim',!!s.dim&&!(s.active&&s.active.includes(k)));
  }
  const used=new Set(Object.values(ports).filter(Boolean));
  for(const p of PORTS){
    const g=document.getElementById('port-'+p);
    const cls=(s.hp&&s.hp[p])||(used.has(p)?'':'free');
    g.setAttribute('class','port'+(cls?' '+cls:''));
  }
}
/* caminho: chaves de host, 'SW' ou 'P1'..'P5'; host↔SW passa pela porta do host */
function expand(path){
  const out=[];
  for(let i=0;i<path.length;i++){
    const k=path[i],n=path[i+1];
    out.push(k==='SW'?SW:(k[0]==='P'&&k.length===2?PP[+k[1]]:hostPos(k)));
    if(DEV[k]&&n==='SW') out.push(PP[ports[k]]);
    if(k==='SW'&&n&&DEV[n]) out.push(PP[ports[n]]);
  }
  return out;
}
function animate(path,kind,label,dur=850){
  return new Promise(res=>{
    const pts=expand(path),g=el('g',{class:'pkt '+kind},gP),w=label.length*6.6+16;
    el('rect',{x:-w/2,y:-12,width:w,height:24,rx:7},g);
    el('text',{y:4,'text-anchor':'middle'},g,label);
    const seg=[];let tot=0;
    for(let i=1;i<pts.length;i++){const l=Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y);seg.push(l);tot+=l;}
    const t0=performance.now();
    (function f(now){
      let p=Math.min(1,(now-t0)/dur),dist=p*tot,i=0;
      while(i<seg.length-1&&dist>seg[i]){dist-=seg[i];i++;}
      const a=pts[i],b=pts[i+1]||a,r=seg[i]?dist/seg[i]:1;
      g.setAttribute('transform',`translate(${a.x+(b.x-a.x)*r},${a.y+(b.y-a.y)*r})`);
      if(p<1)requestAnimationFrame(f);else{g.remove();res();}
    })(t0);
  });
}
async function marks(no,ok){
  const ts=[];
  for(const k of no||[]){const p=hostPos(k);ts.push(el('text',{x:p.x+60,y:p.y-14,class:'mark no','text-anchor':'middle'},gP,'✕'));}
  for(const k of ok||[]){const p=hostPos(k);ts.push(el('text',{x:p.x+60,y:p.y-14,class:'mark ok','text-anchor':'middle'},gP,'✓'));}
  await new Promise(r=>setTimeout(r,900));ts.forEach(t=>t.remove());
}

/* ===== Tabela MAC e quadro ===== */
function clearFlags(){for(const m in tbl){tbl[m].flash=false;tbl[m].tag='';}removed=[];focus='';}
function setFwd(txt){if(frame){frame.fwd=txt;focus='dst';}}
function learn(k,port){
  const mac=DEV[k].mac,e=tbl[mac];
  const tag=!e?'new':(e.port===port?'renew':'moved');
  tbl[mac]={port,tag,flash:true};
  if(frame){
    focus='src';
    frame.learn=`${mac} → porta ${port}`+(tag==='new'?' (entrada nova)':tag==='renew'?' (já estava; tempo renovado)':' (entrada atualizada)');
  }
}
function flushPort(port){
  for(const m in tbl) if(tbl[m].port===port){removed.push({mac:m,port});delete tbl[m];}
}
function setFrame(src,dst,inPort){
  const bc=dst==='FF';
  frame={src:DEV[src].mac,dst:bc?BCAST:DEV[dst].mac,in:inPort||null,learn:'',fwd:'',
         type:bc?'0x0806':'0x0800',typeName:bc?'ARP':'IPv4',data:bc?'ARP Request':'pacote IPv4'};
}
const TAGTXT={new:'nova',renew:'renovada',moved:'atualizada'};
function renderTable(){
  const box=document.getElementById('mtab'),macs=Object.keys(tbl).sort((a,b)=>tbl[a].port-tbl[b].port||a.localeCompare(b));
  if(!macs.length&&!removed.length){box.innerHTML='<div class="empty">tabela vazia: o switch ainda não aprendeu nenhum endereço</div>';return;}
  let h='<table class="mt"><tr><th>Endereço MAC</th><th>Porta</th><th>quem é</th></tr>';
  for(const m of macs){const e=tbl[m];
    h+=`<tr class="${e.flash?'flash':''}"><td>${m}${e.flash&&e.tag?`<span class="tag ${e.tag}">${TAGTXT[e.tag]}</span>`:''}</td><td>P${e.port}</td><td class="who">${DEV[macOwner(m)].name}</td></tr>`;}
  for(const r of removed) h+=`<tr class="flash"><td><s>${r.mac}</s><span class="tag moved" style="background:var(--drop)">removida</span></td><td><s>P${r.port}</s></td><td class="who">${DEV[macOwner(r.mac)].name}</td></tr>`;
  box.innerHTML=h+'</table>';
}

/* Formato do quadro Ethernet II */
const EF=[
  {id:'pre',name:'Preâmbulo',bytes:'7 bytes',w:1.1,cls:'phy',val:()=>'1010…1010',
   info:'<b>Preâmbulo (7 bytes):</b> sequência 10101010 repetida, que sincroniza o relógio de quem recebe. É coisa da camada física: a placa de rede usa e descarta, e não entra na tabela do switch.'},
  {id:'sfd',name:'SFD',bytes:'1 byte',w:.75,cls:'phy',val:()=>'10101011',
   info:'<b>SFD, delimitador de início de quadro (1 byte):</b> o valor 10101011 avisa "o quadro começa agora". Logo depois vem o MAC de destino.'},
  {id:'dst',name:'MAC de destino',bytes:'6 bytes',w:1.9,cls:'hdr dst',val:f=>f.dst,who:f=>f.dst===BCAST?'broadcast (todos)':DEV[macOwner(f.dst)].name,
   info:'<b>MAC de destino (6 bytes):</b> para quem é o quadro. O switch procura este endereço na tabela para <b>encaminhar</b>. Vem primeiro de propósito: o equipamento já pode decidir para onde mandar antes de ler o resto. FF:FF:FF:FF:FF:FF significa broadcast.'},
  {id:'src',name:'MAC de origem',bytes:'6 bytes',w:1.9,cls:'hdr src',val:f=>f.src,who:f=>DEV[macOwner(f.src)].name,
   info:'<b>MAC de origem (6 bytes):</b> quem enviou. É deste campo que o switch <b>aprende</b>: grava "este MAC está atrás da porta por onde o quadro entrou". A origem é sempre um endereço individual, nunca broadcast.'},
  {id:'type',name:'EtherType',bytes:'2 bytes',w:1,cls:'hdr',val:f=>f.type,who:f=>f.typeName,
   info:'<b>EtherType (2 bytes):</b> diz qual protocolo vai nos dados, para o computador saber a quem entregar: 0x0800 = IPv4, 0x0806 = ARP, 0x86DD = IPv6. O switch comum não precisa olhar este campo.'},
  {id:'data',name:'Dados (carga útil)',bytes:'46 a 1500 bytes',w:1.6,cls:'',val:f=>f.data,
   info:'<b>Dados (46 a 1500 bytes):</b> o conteúdo transportado, como um pacote IP ou uma mensagem ARP. Se tiver menos de 46 bytes, é completado com enchimento (padding). O limite de 1500 bytes é o MTU da Ethernet.'},
  {id:'fcs',name:'FCS',bytes:'4 bytes',w:.9,cls:'',val:()=>'CRC-32',
   info:'<b>FCS, sequência de verificação (4 bytes):</b> um CRC-32 calculado sobre o quadro. Quem recebe refaz a conta; se não bater, o quadro chegou corrompido e é <b>descartado</b> em silêncio.'}
];
let selField='';
function renderEF(){
  const strip=document.getElementById('efstrip'),f=frame||{dst:'—',src:'—',type:'—',typeName:'',data:'—'};
  strip.innerHTML=EF.map(x=>{
    const hl=frame&&focus===x.id?' hl':'',bcv=frame&&x.id==='dst'&&f.dst===BCAST?' bcv':'';
    const who=frame&&x.who?`<span class="fw">${x.who(f)}</span>`:'';
    return `<button class="eff ${x.cls}${hl}${bcv}${selField===x.id?' sel':''}" data-f="${x.id}" style="flex-grow:${x.w}">
      <span class="fn">${x.name}</span><span class="fb2">${x.bytes}</span><span class="fv">${frame||x.cls==='phy'||x.id==='fcs'?x.val(f):'—'}</span>${who}</button>`;
  }).join('')+'';
  strip.querySelectorAll('.eff').forEach(b=>b.onclick=()=>{selField=selField===b.dataset.f?'':b.dataset.f;renderEF();});
  const brk=strip.nextElementSibling&&strip.nextElementSibling.classList.contains('efbr')?strip.nextElementSibling:null;
  if(!brk){
    const d=document.createElement('div');d.className='efbr';
    d.innerHTML=`<span style="flex:${1.1+.75}">camada física (não faz parte do quadro)</span><span style="flex:${1.9+1.9+1}">cabeçalho: 14 bytes</span><span style="flex:1.6">carga útil</span><span style="flex:.9">trailer</span>`;
    strip.after(d);
  }
  const shown=selField||(frame?focus:'');
  const fx=EF.find(x=>x.id===shown);
  document.getElementById('efinfo').innerHTML=fx?fx.info:
    'Clique em um campo para ver para que ele serve. O switch se apoia em dois deles: o <b>MAC de origem</b>, para aprender, e o <b>MAC de destino</b>, para encaminhar. O campo que ele está lendo no passo atual fica destacado.';
}

function renderFrame(){
  const box=document.getElementById('frame');
  renderEF();
  if(!frame){box.innerHTML='<div class="empty">nenhum quadro no momento</div>';return;}
  const dw=frame.dst===BCAST?'broadcast (todos)':DEV[macOwner(frame.dst)].name;
  box.innerHTML=`<div class="hdr">
      <div><small>MAC de destino</small><b>${frame.dst}</b><div class="who">${dw}</div></div>
      <div><small>MAC de origem</small><b>${frame.src}</b><div class="who">${DEV[macOwner(frame.src)].name}</div></div>
    </div>
    <div class="row${frame.in?' done':''}"><span class="num">⇢</span><div><span class="k">Porta de entrada:</span> <span class="v">${frame.in?'P'+frame.in:'ainda em trânsito'}</span></div></div>
    <div class="row${frame.learn?' done':''}"><span class="num">1</span><div><span class="k">Aprender</span> <span class="v">(lê o MAC de ORIGEM):</span><br><span class="v">${frame.learn||'aguardando…'}</span></div></div>
    <div class="row f${frame.fwd?' done':''}"><span class="num">2</span><div><span class="k">Encaminhar</span> <span class="v">(lê o MAC de DESTINO):</span><br><span class="v">${frame.fwd||'aguardando…'}</span></div></div>`;
}

/* ===== Cenários =====
   Passo: {badge,title,text,hint,active,dim,hp:{porta:classe},anims:[[caminho,tipo,rótulo]],no,ok,pre,mut}
   pre roda antes da animação e mut depois; ambos são reaplicados no "Anterior". */
const U='uni',F='flood',BC='bc';
const seedFull=()=>{for(const k of ORDER)tbl[DEV[k].mac]={port:DEFAULT_PORTS[k],tag:'',flash:false};};
const M=k=>DEV[k].mac;

function scenLearn(){
  return {seed:()=>{},steps:[
    {badge:['info','Objetivo'],title:'PC-A envia um quadro para PC-B',
     text:'O switch acabou de ser ligado: sua <b>tabela MAC está vazia</b>. Ele não sabe em que porta está cada computador.',
     hint:'Repare, no painel “Decisão do switch”, nos dois endereços do quadro: MAC de destino e MAC de origem. Ative “Formato do quadro” para ver o cabeçalho completo.',active:['A'],pre:()=>setFrame('A','B')},
    {badge:['uni','Passo 1'],title:'O quadro entra pela porta 1',
     text:'PC-A está ligado na <b>P1</b>. O switch recebe o quadro e anota por qual porta ele chegou.',
     hint:'',active:['A'],hp:{1:'in'},anims:[[['A','SW'],U,'A → B']],mut:()=>{frame.in=1;}},
    {badge:['learn','Passo 2'],title:'Aprender: o switch lê o MAC de ORIGEM',
     text:'Se um quadro com origem <b>'+M('A')+'</b> chegou pela P1, então PC-A está atrás da P1. O switch grava esse par na tabela.',
     hint:'O switch aprende sempre pela origem, nunca pelo destino.',active:['A'],hp:{1:'in'},mut:()=>learn('A',1)},
    {badge:['info','Passo 3'],title:'Encaminhar: procurar o MAC de DESTINO',
     text:'Agora o switch procura <b>'+M('B')+'</b> na tabela. Não encontra: o destino é <b>desconhecido</b>.',
     hint:'',active:[],hp:{1:'in'},mut:()=>{setFwd(M('B')+' não está na tabela → inundar');}},
    {badge:['flood','Passo 4'],title:'Inundação: cópia para todas as outras portas',
     text:'Sem saber onde está PC-B, o switch envia uma cópia por <b>todas as portas</b> com algo ligado, <b>menos a de entrada</b> (P1).',
     hint:'Nunca devolve o quadro pela porta de onde ele veio.',active:['B','C','D'],hp:{1:'in',2:'flood',3:'flood',4:'flood'},
     anims:[[['SW','B'],F,'A → B'],[['SW','C'],F,'A → B'],[['SW','D'],F,'A → B']]},
    {badge:['info','Passo 5'],title:'Quem não é o destino descarta',
     text:'Cada placa de rede compara o MAC de destino com o seu. PC-C e Notebook-D veem que não é com eles e <b>descartam</b>. PC-B <b>aceita</b>.',
     hint:'',active:['B'],dim:true,no:['C','D'],ok:['B']},
    {badge:['uni','Passo 6'],title:'PC-B responde para PC-A',
     text:'Agora é um quadro novo: origem <b>'+M('B')+'</b>, destino <b>'+M('A')+'</b>. Ele entra pela <b>P2</b>.',
     hint:'',active:['B'],hp:{2:'in'},pre:()=>setFrame('B','A'),anims:[[['B','SW'],U,'B → A']],mut:()=>{frame.in=2;}},
    {badge:['learn','Passo 7'],title:'Aprender: PC-B está atrás da P2',
     text:'De novo o switch olha a origem e grava <b>'+M('B')+' → P2</b>. A tabela agora tem duas entradas.',
     hint:'',active:['B'],hp:{2:'in'},mut:()=>learn('B',2)},
    {badge:['uni','Passo 8'],title:'Destino conhecido: sai só pela P1',
     text:'O switch procura <b>'+M('A')+'</b> e encontra: <b>P1</b>. O quadro sai <b>apenas</b> por essa porta. PC-C e Notebook-D nem ficam sabendo.',
     hint:'Isso é o encaminhamento (ou filtragem) do switch.',active:['A','B'],hp:{2:'in',1:'out'},
     pre:()=>{setFwd(M('A')+' está na P1 → encaminhar só por ela');},anims:[[['SW','A'],U,'B → A']]},
    {badge:['done','Concluído'],title:'O switch aprendeu sozinho ✓',
     text:'Bastaram dois quadros para o switch saber onde estão PC-A e PC-B. Daqui em diante, o tráfego entre eles <b>não é mais inundado</b>.',
     hint:'PC-C e Notebook-D ainda não aparecem na tabela: só entram quando enviarem algum quadro.',active:['A','B']}
  ]};
}
function scenFull(){
  return {seed:seedFull,steps:[
    {badge:['info','Situação'],title:'A tabela já está completa',
     text:'Todos já transmitiram alguma vez, então o switch sabe a porta de cada um (veja a tabela abaixo). PC-C vai enviar um quadro para Notebook-D.',
     hint:'',active:['C'],pre:()=>setFrame('C','D')},
    {badge:['uni','Passo 1'],title:'O quadro entra pela P3',
     text:'Origem <b>'+M('C')+'</b>, destino <b>'+M('D')+'</b>.',hint:'',active:['C'],hp:{3:'in'},
     anims:[[['C','SW'],U,'C → D']],mut:()=>{frame.in=3;}},
    {badge:['learn','Passo 2'],title:'Aprender: a entrada já existia',
     text:'O MAC de origem já está associado à <b>P3</b>. O switch não cria nada novo: só <b>renova o tempo</b> da entrada, para ela não expirar.',
     hint:'Entradas que ninguém renova somem depois de um tempo (envelhecimento).',active:['C'],hp:{3:'in'},mut:()=>learn('C',3)},
    {badge:['uni','Passo 3'],title:'Encaminhar: destino na P4',
     text:'<b>'+M('D')+'</b> está na tabela, na <b>P4</b>. O quadro sai só por ela. PC-A e PC-B não recebem nada.',
     hint:'',active:['C','D'],hp:{3:'in',4:'out'},pre:()=>{setFwd(M('D')+' está na P4 → encaminhar só por ela');},
     anims:[[['SW','D'],U,'C → D']]},
    {badge:['uni','Passo 4'],title:'Duas conversas ao mesmo tempo',
     text:'Enquanto C fala com D, A envia para B. Como cada quadro só sai pela porta do seu destino, os dois caminhos <b>não se cruzam</b> e acontecem em paralelo.',
     hint:'Em um hub (que repete tudo para todos), esses quadros colidiriam.',active:['A','B','C','D'],hp:{1:'in',3:'in',2:'out',4:'out'},
     anims:[[['A','SW','B'],U,'A → B'],[['C','SW','D'],U,'C → D']]},
    {badge:['done','Lição'],title:'Tabela cheia = tráfego só onde precisa',
     text:'Com a tabela preenchida, o switch entrega cada quadro unicast <b>apenas</b> na porta do destino. Resultado: menos tráfego nas outras portas, mais desempenho e mais privacidade.',
     hint:'',active:['A','B','C','D']}
  ]};
}
function scenBroadcast(){
  return {seed:seedFull,steps:[
    {badge:['info','Objetivo'],title:'PC-A envia um quadro de broadcast',
     text:'Às vezes um computador precisa falar com <b>todos</b> da rede, como no ARP Request ("quem tem este IP?"). O destino é o MAC especial <b>'+BCAST+'</b>.',
     hint:'A tabela do switch já está completa.',active:['A'],pre:()=>setFrame('A','FF')},
    {badge:['bc','Passo 1'],title:'O quadro entra pela P1',
     text:'O switch recebe o broadcast na porta de PC-A.',hint:'',active:['A'],hp:{1:'in'},
     anims:[[['A','SW'],BC,'Broadcast']],mut:()=>{frame.in=1;}},
    {badge:['learn','Passo 2'],title:'Aprender continua igual',
     text:'Mesmo num broadcast, a origem é um MAC normal: <b>'+M('A')+'</b> na P1. A entrada é renovada.',
     hint:'',active:['A'],hp:{1:'in'},mut:()=>learn('A',1)},
    {badge:['bc','Passo 3'],title:'Broadcast: sai por todas as portas',
     text:''+BCAST+' nunca aparece na tabela: ele significa "todos". Por isso o switch envia uma cópia por <b>todas as portas, menos a de entrada</b>, mesmo com a tabela cheia.',
     hint:'',active:['B','C','D'],hp:{1:'in',2:'bc',3:'bc',4:'bc'},pre:()=>{setFwd('broadcast → todas as portas, menos a P1');},
     anims:[[['SW','B'],BC,'Broadcast'],[['SW','C'],BC,'Broadcast'],[['SW','D'],BC,'Broadcast']]},
    {badge:['info','Passo 4'],title:'Todos aceitam',
     text:'Diferente do caso anterior, ninguém descarta: o broadcast é endereçado a todos. Cada um processa o quadro.',
     hint:'No ARP, depois cada um olha o IP perguntado e só o dono responde.',active:['B','C','D'],ok:['B','C','D']},
    {badge:['done','Lição'],title:'O switch não bloqueia broadcast',
     text:'Todas as portas de um switch formam um só <b>domínio de broadcast</b>. Quem separa domínios de broadcast é o <b>roteador</b> ou a divisão em <b>VLANs</b>.',
     hint:'Por isso redes planas muito grandes ficam "barulhentas".',active:['A','B','C','D']}
  ]};
}
function scenMove(){
  return {seed:seedFull,steps:[
    {badge:['info','Situação'],title:'O notebook vai mudar de porta',
     text:'A tabela está completa e diz que <b>'+M('D')+'</b> está na <b>P4</b>. O usuário vai tirar o cabo do notebook e ligá-lo na <b>P5</b>.',
     hint:'',active:['D']},
    {badge:['drop','Passo 1'],title:'Cabo desligado da P4',
     text:'O link da P4 cai. O switch percebe e <b>apaga</b> as entradas que tinha aprendido nessa porta: elas não servem mais.',
     hint:'',active:['D'],hp:{4:'down'},mut:()=>{lastPos.D=hostPos('D');ports.D=null;flushPort(4);}},
    {badge:['info','Passo 2'],title:'Notebook ligado na P5',
     text:'O notebook agora está na <b>P5</b>, mas ainda não enviou nada. O switch <b>não sabe</b> onde ele está.',
     hint:'O switch só aprende quando o host transmite.',active:['D'],mut:()=>{ports.D=5;}},
    {badge:['uni','Passo 3'],title:'PC-A envia um quadro para o notebook',
     text:'O quadro entra pela P1. A origem de PC-A já estava na tabela: o tempo é renovado.',
     hint:'',active:['A'],hp:{1:'in'},pre:()=>setFrame('A','D'),anims:[[['A','SW'],U,'A → D']],mut:()=>{frame.in=1;learn('A',1);}},
    {badge:['flood','Passo 4'],title:'Destino desconhecido: inundação',
     text:'<b>'+M('D')+'</b> foi apagado, então o switch inunda: P2, P3 e <b>P5</b>. A P4 está sem nada ligado e não recebe cópia.',
     hint:'',active:['B','C','D'],hp:{1:'in',2:'flood',3:'flood',5:'flood'},pre:()=>{setFwd(M('D')+' não está na tabela → inundar');},
     anims:[[['SW','B'],F,'A → D'],[['SW','C'],F,'A → D'],[['SW','D'],F,'A → D']]},
    {badge:['info','Passo 5'],title:'Só o notebook aceita',
     text:'PC-B e PC-C descartam. O notebook, na nova porta, recebe normalmente.',hint:'',active:['D'],dim:true,no:['B','C'],ok:['D']},
    {badge:['uni','Passo 6'],title:'O notebook responde',
     text:'Origem <b>'+M('D')+'</b>, destino PC-A. O quadro entra pela <b>P5</b>.',hint:'',active:['D'],hp:{5:'in'},
     pre:()=>setFrame('D','A'),anims:[[['D','SW'],U,'D → A']],mut:()=>{frame.in=5;}},
    {badge:['learn','Passo 7'],title:'Aprender: notebook agora na P5',
     text:'O switch grava <b>'+M('D')+' → P5</b>. A tabela voltou a estar correta, sem ninguém configurar nada.',
     hint:'',active:['D'],hp:{5:'in'},mut:()=>learn('D',5)},
    {badge:['uni','Passo 8'],title:'Encaminhado só para a P1',
     text:'O destino '+M('A')+' é conhecido (P1). O quadro sai só por lá.',hint:'',active:['A','D'],hp:{5:'in',1:'out'},
     pre:()=>{setFwd(M('A')+' está na P1 → encaminhar só por ela');},anims:[[['SW','A'],U,'D → A']]},
    {badge:['done','Lição'],title:'A tabela se corrige sozinha ✓',
     text:'O switch reaprende a posição de um host sempre que vê o MAC dele como <b>origem</b> numa porta. Mudar de porta não exige configuração.',
     hint:'Se o link não caísse (por exemplo, o notebook mudou de lugar atrás de outro switch), a entrada antiga ficaria até o host transmitir de novo ou até expirar.',active:['A','D']}
  ]};
}
const SCENARIOS=[
  {t:'Aprender e inundar',s:'Tabela vazia: PC-A fala com PC-B e o switch aprende pela origem.',build:scenLearn},
  {t:'Tabela completa',s:'Cada quadro sai só pela porta do destino; duas conversas em paralelo.',build:scenFull},
  {t:'Broadcast',s:'Um quadro para todos sai por todas as portas, mesmo com a tabela cheia.',build:scenBroadcast},
  {t:'Host muda de porta',s:'O notebook troca de porta e o switch reaprende sozinho.',build:scenMove}
];

/* ===== Motor de passos ===== */
function resetState(){tbl={};removed=[];ports={...DEFAULT_PORTS};lastPos={};frame=null;}
function applyUpTo(n){ // reconstrói o estado deterministicamente até o passo n (sem animar)
  resetState();STEPS.seed();
  for(let i=0;i<=n;i++){const s=STEPS.steps[i];clearFlags();if(s.pre)s.pre();if(s.mut)s.mut();}
}
function renderStep(s){
  const b=document.getElementById('badge');b.className='badge '+s.badge[0];b.textContent=s.badge[1];
  document.getElementById('stTitle').innerHTML=s.title;
  document.getElementById('stText').innerHTML=s.text;
  document.getElementById('stHint').innerHTML=s.hint||'';
  renderTopo(s);renderTable();renderFrame();
  const dots=document.getElementById('dots');dots.innerHTML='';
  STEPS.steps.forEach((_,i)=>{const d=document.createElement('i');d.className=i===step?'on':(i<step?'past':'');dots.appendChild(d);});
  document.getElementById('stepNo').textContent=`passo ${step+1}/${STEPS.steps.length}`;
  document.getElementById('prevBtn').disabled=step===0||animating;
  document.getElementById('nextBtn').disabled=step===STEPS.steps.length-1||animating;
  document.getElementById('restartBtn').disabled=animating;
}
async function goNext(){
  if(animating||step>=STEPS.steps.length-1)return;
  step++;selField='';const s=STEPS.steps[step];
  animating=true;clearFlags();if(s.pre)s.pre();renderStep(s);
  gP.innerHTML='';
  if(s.anims)await Promise.all(s.anims.map(a=>animate(...a)));
  if(s.no||s.ok)await marks(s.no,s.ok);
  if(s.mut)s.mut();
  animating=false;renderStep(s);
}
function goPrev(){
  if(animating||step===0)return;
  step--;selField='';applyUpTo(step);gP.innerHTML='';renderStep(STEPS.steps[step]);
}
function startScenario(i){
  curScen=i;STEPS=SCENARIOS[i].build();
  document.querySelectorAll('#scen button').forEach((b,bi)=>b.classList.toggle('on',bi===i));
  step=0;selField='';applyUpTo(0);gP.innerHTML='';renderStep(STEPS.steps[0]);
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
 {q:'O que fica guardado na tabela MAC de um switch?',
  opts:['Endereço IP → endereço MAC','Endereço MAC → porta do switch','Nome do computador → porta','Endereço IP → porta do switch'],
  a:1,why:'O switch trabalha na camada 2: ele associa cada endereço MAC à porta por onde ele foi visto. IP → MAC é a cache ARP dos computadores.'},
 {q:'Para APRENDER onde está um computador, o switch olha qual campo do quadro?',
  opts:['O MAC de destino','O MAC de origem','O endereço IP de origem','O tamanho do quadro'],
  a:1,why:'Se um quadro com certa origem chegou pela porta X, aquele MAC está atrás da porta X. O destino é usado para decidir para onde enviar, não para aprender.'},
 {q:'O switch recebe um quadro cujo MAC de destino não está na tabela. O que ele faz?',
  opts:['Descarta o quadro','Devolve o quadro ao remetente','Envia por todas as portas, menos a de entrada','Pergunta ao roteador'],
  a:2,why:'É a inundação: sem saber onde está o destino, ele manda uma cópia para todas as outras portas. Quem não é o destino descarta.'},
 {q:'A tabela está completa. PC-C envia um quadro unicast para Notebook-D. Quem recebe?',
  opts:['Todos os computadores','Apenas Notebook-D','Notebook-D e o roteador','Ninguém, porque o switch espera o ARP'],
  a:1,why:'Com o destino na tabela, o quadro sai apenas pela porta do destino. As outras portas não recebem nada.'},
 {q:'Mesmo com a tabela completa, um quadro para FF:FF:FF:FF:FF:FF é enviado para…',
  opts:['Ninguém','Somente o primeiro computador da tabela','Todas as portas, menos a de entrada','Somente o gateway'],
  a:2,why:'Esse é o endereço de broadcast, que significa "todos". O switch sempre o repassa a todas as outras portas.'},
 {q:'Qual a principal vantagem de um switch em relação a um hub?',
  opts:['O switch atribui endereços IP','O switch entrega cada quadro só na porta do destino, permitindo conversas em paralelo','O switch bloqueia todos os broadcasts','O switch dispensa os endereços MAC'],
  a:1,why:'O hub repete tudo para todos. O switch filtra pelo MAC de destino, então pares diferentes podem conversar ao mesmo tempo sem colisão.'},
 {q:'Um notebook é desligado da porta 4 e ligado na porta 5. Como o switch descobre a nova porta?',
  opts:['O administrador precisa configurar manualmente','Quando o notebook envia um quadro, o switch vê o MAC de origem na porta 5 e atualiza a tabela','Pelo endereço IP do notebook','Nunca descobre: a entrada fica errada para sempre'],
  a:1,why:'O switch reaprende pela origem sempre que o host transmite. Além disso, quando o link cai, as entradas daquela porta são apagadas, e entradas sem uso expiram.'},
 {q:'No cabeçalho do quadro Ethernet II, em que ordem vêm os campos?',
  opts:['MAC de origem, MAC de destino, EtherType','MAC de destino, MAC de origem, EtherType','EtherType, MAC de destino, MAC de origem','IP de destino, MAC de destino, MAC de origem'],
  a:1,why:'Depois do preâmbulo e do SFD vem primeiro o MAC de destino (6 bytes), depois o de origem (6 bytes) e o EtherType (2 bytes): 14 bytes de cabeçalho. O destino vir primeiro permite decidir o encaminhamento cedo.'},
 {q:'Um quadro chega com o campo FCS que não bate com o conteúdo. O que acontece?',
  opts:['É encaminhado normalmente','O switch corrige o erro','O quadro é descartado','O switch pede uma retransmissão ao remetente'],
  a:2,why:'O FCS (CRC-32) serve para detectar erros. Se a conta não bate, o quadro está corrompido e é descartado. A Ethernet não retransmite: se for preciso, uma camada superior (como o TCP) cuida disso.'},
 {q:'Qual valor de EtherType indica que os dados do quadro são uma mensagem ARP?',
  opts:['0x0800','0x0806','0x86DD','FF:FF'],
  a:1,why:'0x0806 é ARP; 0x0800 é IPv4 e 0x86DD é IPv6. O EtherType diz ao computador que recebe a qual protocolo entregar os dados.'},
 {q:'Para dividir uma rede em domínios de broadcast diferentes, usa-se…',
  opts:['Um switch com mais portas','Um hub','Um roteador ou VLANs','Cabos mais curtos'],
  a:2,why:'Todas as portas de um switch comum estão no mesmo domínio de broadcast. Roteadores e VLANs criam domínios separados.'}
];
let answered=0;
function buildQuiz(){
  answered=0;const box=document.getElementById('qlist');box.innerHTML='';
  document.getElementById('score').textContent=`0 de ${QUIZ.length} respondidas`;
  document.getElementById('scoreBar').style.width='0%';
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

/* ===== Exibição opcional do formato do quadro ===== */
function setEF(on){
  document.getElementById('efToggle').checked=on;
  document.getElementById('efbody').hidden=!on;
  document.getElementById('efTglTxt').textContent=on?'Ocultar':'Mostrar';
  try{localStorage.setItem('sw-ef',on?'1':'0');}catch(e){}
}
document.getElementById('efToggle').onchange=e=>setEF(e.target.checked);
let efPref=false;try{efPref=localStorage.getItem('sw-ef')==='1';}catch(e){}

/* ===== Início ===== */
drawStatic();buildScenBar();resetState();buildQuiz();setEF(efPref);startScenario(0);
