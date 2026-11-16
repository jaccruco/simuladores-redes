/* ===== Abas ===== */
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('on',x===b));
  document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('on',t.id===b.dataset.tab));
});

/* ===== Rede ===== */
const NS='http://www.w3.org/2000/svg';
const VL={10:{n:'Vendas',hex:'#2457c5',bg:'#e3ebfb'},20:{n:'TI',hex:'#c77700',bg:'#fbefdc'},0:{n:'roteamento',hex:'#7a3fb5',bg:'#f1e8fa'}};
const DEV={
  A:{name:'PC-A',vlan:10,ip:'192.168.10.11',mac:'AA:AA:AA:AA:AA:0A'},
  B:{name:'PC-B',vlan:20,ip:'192.168.20.12',mac:'BB:BB:BB:BB:BB:0B'},
  C:{name:'PC-C',vlan:10,ip:'192.168.10.13',mac:'CC:CC:CC:CC:CC:0C'},
  D:{name:'PC-D',vlan:20,ip:'192.168.20.14',mac:'DD:DD:DD:DD:DD:0D'},
  R:{name:'SW1 · interface VLAN (gateway)',mac:'EE:EE:EE:EE:EE:01'}
};
const HOSTS=['A','B','C','D'];
const BCAST='FF:FF:FF:FF:FF:FF';
const HP={A:{x:100,y:395},B:{x:310,y:395},C:{x:490,y:395},D:{x:700,y:395}};
const MARK={V10:{x:298,y:84},V20:{x:502,y:84}}; // marcas ✓/✕ das SVIs
const SWC={S1:{x:400,y:145,name:'SW1',sub:'MAC EE:EE:EE:EE:EE:01'},
           S2:{x:210,y:265,name:'SW2',sub:'switch camada 2'},
           S3:{x:590,y:265,name:'SW3',sub:'switch camada 2'}};
const PT={A:{x:100,y:359},B:{x:310,y:359},C:{x:490,y:359},D:{x:700,y:359},
  S1:{x:400,y:145},S2:{x:210,y:265},S3:{x:590,y:265},
  V10:{x:352,y:76},V20:{x:448,y:76},V10l:{x:370,y:118},V20l:{x:430,y:118},
  'S1.1':{x:340,y:172},'S1.2':{x:460,y:172},
  'S2.1':{x:150,y:292},'S2.2':{x:270,y:292},'S2.3':{x:250,y:238},
  'S3.1':{x:530,y:292},'S3.2':{x:650,y:292},'S3.3':{x:550,y:238}};
const PORTCFG={
  S1:[{p:1,to:'SW2',mode:'trunk'},{p:2,to:'SW3',mode:'trunk'}],
  S2:[{p:1,to:'PC-A',mode:'acesso',vlan:10},{p:2,to:'PC-B',mode:'acesso',vlan:20},{p:3,to:'SW1',mode:'trunk'}],
  S3:[{p:1,to:'PC-C',mode:'acesso',vlan:10},{p:2,to:'PC-D',mode:'acesso',vlan:20},{p:3,to:'SW1',mode:'trunk'}]
};
const HOSTPORT={A:'S2.1',B:'S2.2',C:'S3.1',D:'S3.2'};
const PATH={
  A_S2:['A','S2.1','S2'],B_S2:['B','S2.2','S2'],S2_A:['S2','S2.1','A'],S2_B:['S2','S2.2','B'],
  C_S3:['C','S3.1','S3'],D_S3:['D','S3.2','S3'],S3_C:['S3','S3.1','C'],S3_D:['S3','S3.2','D'],
  S2_S1:['S2','S2.3','S1.1','S1'],S1_S2:['S1','S1.1','S2.3','S2'],
  S1_S3:['S1','S1.2','S3.3','S3'],S3_S1:['S3','S3.3','S1.2','S1'],
  S1_V10:['S1','V10l','V10'],S1_V20:['S1','V20l','V20'],V10_V20:['V10','V20'],V20_S1:['V20','V20l','S1']
};
const macName=m=>m===BCAST?'broadcast (todos)':((Object.values(DEV).find(d=>d.mac===m)||{}).name||'');

/* Estado */
let nat,natFlash,frame,dec,focus='',step,STEPS,curScen=-1,animating=false,curStep=null;

/* ===== Desenho ===== */
const svg=document.getElementById('svg'),gL=document.getElementById('links'),gT=document.getElementById('tlbl'),
      gD=document.getElementById('devs'),gP=document.getElementById('pkts');
function el(tag,at,parent,html){const e=document.createElementNS(NS,tag);for(const a in at)e.setAttribute(a,at[a]);if(html!=null)e.innerHTML=html;(parent||svg).appendChild(e);return e;}
function trunkLine(a,b){
  const dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy),nx=-dy/l*2.6,ny=dx/l*2.6;
  el('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:'#3d4b58','stroke-width':11,'stroke-opacity':.18,'stroke-linecap':'round'},gL);
  el('line',{x1:a.x+nx,y1:a.y+ny,x2:b.x+nx,y2:b.y+ny,stroke:VL[10].hex,'stroke-width':3},gL);
  el('line',{x1:a.x-nx,y1:a.y-ny,x2:b.x-nx,y2:b.y-ny,stroke:VL[20].hex,'stroke-width':3},gL);
}
function drawStatic(){
  gL.innerHTML='';gD.innerHTML='';
  // SW1 = switch camada 3: moldura com o motor de roteamento e as SVIs
  el('rect',{x:286,y:6,width:228,height:178,rx:14,fill:'#eaf0f4',stroke:'#9aa7b4','stroke-dasharray':'6 4'},gL);
  el('text',{x:400,y:22,'text-anchor':'middle',class:'l3t'},gL,'SW1 · switch camada 3 (núcleo)');
  el('line',{x1:PT.V10.x,y1:PT.V10.y+20,x2:PT.V10l.x,y2:PT.V10l.y,stroke:VL[10].hex,'stroke-width':2.5,'stroke-dasharray':'5 3'},gL);
  el('line',{x1:PT.V20.x,y1:PT.V20.y+20,x2:PT.V20l.x,y2:PT.V20l.y,stroke:VL[20].hex,'stroke-width':2.5,'stroke-dasharray':'5 3'},gL);
  for(const k of HOSTS) el('line',{x1:PT[k].x,y1:PT[k].y,x2:PT[HOSTPORT[k]].x,y2:PT[HOSTPORT[k]].y,class:'alink',stroke:VL[DEV[k].vlan].hex,'stroke-opacity':.7},gL);
  trunkLine(PT['S1.1'],PT['S2.3']);
  trunkLine(PT['S1.2'],PT['S3.3']);
  const g=el('g',{class:'dev',id:'dev-R'},gD);
  el('rect',{x:305,y:30,width:190,height:74,rx:9,class:'box'},g);
  el('text',{x:400,y:44,'text-anchor':'middle',class:'ad',style:'font-family:IBM Plex Sans,sans-serif;font-weight:600'},g,'roteamento interno (ip routing)');
  for(const v of [10,20]){const p=PT['V'+v];
    el('rect',{x:p.x-44,y:p.y-20,width:88,height:40,rx:7,fill:VL[v].bg,stroke:VL[v].hex,'stroke-width':1.5},g);
    el('text',{x:p.x,y:p.y-4,'text-anchor':'middle',class:'svi',fill:VL[v].hex},g,'interface vlan '+v);
    el('text',{x:p.x,y:p.y+12,'text-anchor':'middle',class:'ad'},g,'192.168.'+v+'.1');
  }
  for(const s in SWC){
    const c=SWC[s],g=el('g',{class:'sw'},gD);
    el('rect',{x:c.x-90,y:c.y-27,width:180,height:54,rx:9,class:'body'},g);
    el('text',{x:c.x,y:c.y-1,'text-anchor':'middle',class:'t'},g,c.name);
    el('text',{x:c.x,y:c.y+15,'text-anchor':'middle',class:'s'},g,c.sub);
    for(const pc of PORTCFG[s]){
      const key=s+'.'+pc.p,p=PT[key],g2=el('g',{class:'port',id:'port-'+key},gD);
      el('rect',{x:p.x-13,y:p.y-8,width:26,height:16,rx:3,fill:pc.mode==='acesso'?VL[pc.vlan].hex:'#3d4b58'},g2);
      el('text',{x:p.x,y:p.y+4,'text-anchor':'middle'},g2,'P'+pc.p);
    }
  }
  for(const k of HOSTS){
    const d=DEV[k],g=el('g',{class:'dev',id:'dev-'+k,transform:`translate(${HP[k].x},${HP[k].y})`},gD);
    el('rect',{x:-75,y:-36,width:150,height:72,rx:10,class:'box'},g);
    el('rect',{x:-75,y:-36,width:7,height:72,rx:3,fill:VL[d.vlan].hex},g);
    el('text',{x:3,y:-16,'text-anchor':'middle',class:'nm'},g,d.name);
    el('text',{x:3,y:-1,'text-anchor':'middle',class:'vl',fill:VL[d.vlan].hex},g,`VLAN ${d.vlan} · ${VL[d.vlan].n}`);
    el('text',{x:3,y:14,'text-anchor':'middle',class:'ad'},g,d.ip);
    el('text',{x:3,y:28,'text-anchor':'middle',class:'ad'},g,d.mac);
  }
}
function renderTopo(s){
  const act=s.active||[];
  for(const k of [...HOSTS,'R']){
    const g=document.getElementById('dev-'+k);
    g.classList.toggle('active',act.includes(k));
    g.classList.toggle('dim',!!s.dim&&!act.includes(k));
    const box=g.querySelector('rect.box');
    box.style.fill=s.halo&&DEV[k].vlan?VL[DEV[k].vlan].bg:'';
  }
  for(const sw in PORTCFG) for(const pc of PORTCFG[sw]){
    const key=sw+'.'+pc.p,cls=(s.hp&&s.hp[key])||'';
    document.getElementById('port-'+key).setAttribute('class','port'+(cls?' '+cls:''));
  }
  gT.innerHTML='';
  const lbl=(x,anchor,a,b)=>{
    const mm=a!==b;
    el('text',{x,y:192,'text-anchor':anchor,class:'tl'},gT,'trunk 802.1Q');
    el('text',{x,y:206,'text-anchor':anchor,class:'tl2'+(mm?' mm':'')},gT,mm?`nativa ${a} ≠ ${b} ⚠`:`nativa ${a}`);
  };
  lbl(272,'end',nat['S2.3'],nat['S1.1']);
  lbl(528,'start',nat['S1.2'],nat['S3.3']);
}
function animate(pk,vlan,tagged,label,dur=900){
  return new Promise(res=>{
    const pts=PATH[pk].map(n=>PT[n]),g=el('g',{class:'pkt'},gP);
    const lw=label.length*6.7+16,tw=tagged?48:0,w=lw+tw;
    el('rect',{x:-w/2,y:-12,width:w,height:24,rx:7,fill:VL[vlan].hex,stroke:'#fff','stroke-width':1.5},g);
    if(tagged){
      el('rect',{x:-w/2+3,y:-9,width:tw-3,height:18,rx:4,fill:'#fff'},g);
      el('text',{x:-w/2+3+(tw-3)/2,y:4,'text-anchor':'middle',class:'tg',fill:VL[vlan].hex},g,'tag '+vlan);
    }
    el('text',{x:-w/2+tw+lw/2,y:4,'text-anchor':'middle',class:'lb'},g,label);
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
  const ts=[],at=k=>MARK[k]||({x:HP[k].x+64,y:HP[k].y-26});
  for(const k of no||[]){const p=at(k);ts.push(el('text',{x:p.x,y:p.y,class:'mark no','text-anchor':'middle'},gP,'✕'));}
  for(const k of ok||[]){const p=at(k);ts.push(el('text',{x:p.x,y:p.y,class:'mark ok','text-anchor':'middle'},gP,'✓'));}
  await new Promise(r=>setTimeout(r,950));ts.forEach(t=>t.remove());
}

/* ===== Quadro, decisão e configuração ===== */
function F(src,dst,vlan,o={}){
  const bc=dst==='FF';
  frame={src:DEV[src].mac,dst:bc?BCAST:DEV[dst].mac,vlan,tagged:false,link:'',
    type:bc?'0x0806':'0x0800',typeName:bc?'ARP':'IPv4',data:bc?'ARP Request':(o.data||'pacote IPv4')};
}
function L(txt,tagged){frame.link=txt;frame.tagged=tagged;focus='tag';}
function D(who,labels){dec={who,rows:(labels||['Porta de entrada','Classificar a VLAN','Encaminhar (só portas da mesma VLAN)']).map(k=>({k,v:''}))};}
function R(i,v){dec.rows[i].v=Array.isArray(v)?v.map(x=>x[0]==='✕'?`<div class="o no">${x}</div>`:`<div class="o">${x}</div>`).join(''):v;}
function setNat(p,v){nat[p]=v;natFlash.add(p);}
function clearFlags(){natFlash.clear();focus='';}

function renderPorts(s){
  const hp=(s&&s.hp)||{};let h='';
  for(const sw of ['S1','S2','S3']){
    h+=`<div><div class="pth">${SWC[sw].name} <span class="sm">${sw==='S1'?'camada 3':'camada 2'}</span></div><table class="mt"><tr><th>Porta</th><th>Ligada a</th><th>Modo · VLAN</th></tr>`;
    for(const c of PORTCFG[sw]){
      const key=sw+'.'+c.p,cls=hp[key]||'';
      const vl=c.mode==='acesso'
        ?`acesso <span class="vc" style="background:${VL[c.vlan].hex}">${c.vlan}</span>`
        :`trunk <span class="sm">nativa</span> <b class="${natFlash.has(key)?'nf':''}">${nat[key]}</b>`;
      h+=`<tr class="${cls?'r-'+cls:''}"><td>P${c.p}</td><td class="who">${c.to}</td><td>${vl}</td></tr>`;
    }
    h+='</table></div>';
  }
  document.getElementById('ptab').innerHTML=h;
}

const EF=[
  {id:'dst',name:'MAC de destino',bytes:'6 bytes',w:1.7,cls:'hdr',val:f=>f.dst,who:f=>macName(f.dst),
   info:'<b>MAC de destino (6 bytes):</b> para quem é o quadro. O switch procura este endereço na tabela MAC <b>da VLAN do quadro</b>: cada VLAN tem suas próprias entradas. Quando o destino está em outra rede, aqui vai o MAC do <b>gateway</b> (a interface VLAN do switch L3), e não o do destino final.'},
  {id:'src',name:'MAC de origem',bytes:'6 bytes',w:1.7,cls:'hdr',val:f=>f.src,who:f=>macName(f.src),
   info:'<b>MAC de origem (6 bytes):</b> quem enviou. O switch aprende por este campo e grava o trio <b>MAC + porta + VLAN</b>. Depois de roteado, o quadro novo tem como origem o MAC do switch L3.'},
  {id:'tag',name:'Tag 802.1Q',bytes:'4 bytes',w:2.6,cls:'tagf',
   info:'<b>Tag 802.1Q (4 bytes):</b> só aparece nos <b>trunks</b>. Fica entre o MAC de origem e o EtherType. <b>TPID</b> (16 bits) = 0x8100: avisa “este quadro tem tag”. <b>PCP</b> (3 bits): prioridade, usada em QoS. <b>DEI</b> (1 bit): marca quadros que podem ser descartados primeiro em congestionamento. <b>VID</b> (12 bits): o número da VLAN, de 1 a 4094 (0 e 4095 são reservados). Em portas de acesso, e para a VLAN nativa no trunk, o quadro viaja <b>sem</b> este campo.'},
  {id:'type',name:'EtherType',bytes:'2 bytes',w:.95,cls:'hdr',val:f=>f.type,who:f=>f.typeName,
   info:'<b>EtherType (2 bytes):</b> protocolo que vai nos dados: 0x0800 = IPv4, 0x0806 = ARP. Quando há tag, ele fica logo depois dela; o valor 0x8100 do TPID ocupa a posição onde um quadro comum teria o EtherType.'},
  {id:'data',name:'Dados',bytes:'46–1500 bytes',w:1.3,cls:'',val:f=>f.data,
   info:'<b>Dados (46 a 1500 bytes):</b> o conteúdo transportado: aqui, uma mensagem ARP ou um pacote IPv4. A tag não diminui a carga útil: o quadro é que fica 4 bytes maior (até 1522 bytes).'},
  {id:'fcs',name:'FCS',bytes:'4 bytes',w:.8,cls:'',val:()=>'CRC-32',
   info:'<b>FCS (4 bytes):</b> CRC-32 para detectar erros. Sempre que o switch <b>insere ou remove a tag</b>, o quadro muda, então o FCS é recalculado.'}
];
let selField='';
function renderEF(){
  const f=frame,strip=document.getElementById('efstrip');
  document.getElementById('eflink').innerHTML=f
    ?`Quadro no enlace: <b>${f.link||'—'}</b>${f.tagged?'<span class="chip t">com tag (tagged)</span>':'<span class="chip u">sem tag (untagged)</span>'}`
    :'Nenhum quadro em trânsito neste passo.';
  strip.innerHTML=EF.map(x=>{
    let inner,cls=x.cls;
    if(x.id==='tag'){
      if(f&&f.tagged){cls+=' on';
        inner=`<span class="tsub"><i>TPID<b>0x8100</b></i><i>PCP<b>0</b></i><i>DEI<b>0</b></i><i style="border-color:${VL[f.vlan].hex}">VID<b style="color:${VL[f.vlan].hex}">${f.vlan}</b></i></span>`;}
      else{cls+=' off';inner=`<span class="fv">${f?'ausente: sem tag':'—'}</span>`;}
    }else{
      inner=`<span class="fv">${f||x.id==='fcs'?x.val(f||{}):'—'}</span>${f&&x.who?`<span class="fw">${x.who(f)}</span>`:''}`;
    }
    const hl=f&&focus===x.id?' hl':'';
    return `<button class="eff ${cls}${hl}${selField===x.id?' sel':''}" data-f="${x.id}" style="flex-grow:${x.w}">
      <span class="fn">${x.name}</span><span class="fb2">${x.bytes}</span>${inner}</button>`;
  }).join('');
  strip.querySelectorAll('.eff').forEach(b=>b.onclick=()=>{selField=selField===b.dataset.f?'':b.dataset.f;renderEF();});
  const fx=EF.find(x=>x.id===selField);
  document.getElementById('efinfo').innerHTML=fx?fx.info:
    'Clique em um campo para ver para que ele serve (o preâmbulo e o SFD foram omitidos). Acompanhe a <b>Tag 802.1Q</b>: ela aparece quando o quadro passa por um trunk e some na porta de acesso.';
}
function renderDec(){
  const box=document.getElementById('frame');renderEF();
  let h='';
  if(frame){
    h+=`<div class="hdr3">
      <div><small>MAC de destino</small><b>${frame.dst}</b><div class="who">${macName(frame.dst)}</div></div>
      <div><small>MAC de origem</small><b>${frame.src}</b><div class="who">${macName(frame.src)}</div></div>
      <div><small>VLAN</small><b class="vchip" style="background:${VL[frame.vlan].hex}">${frame.vlan}</b><div class="who">${VL[frame.vlan].n}</div></div></div>`;
  }
  if(!dec) h+=`<div class="empty">${frame?'o quadro ainda não chegou a um equipamento de rede':'nenhum quadro no momento'}</div>`;
  else{
    h+=`<div class="whoh${dec.who.includes('roteamento')?' r':''}">${dec.who}</div>`;
    dec.rows.forEach((r,i)=>{h+=`<div class="row${r.v?' done':''}"><span class="num">${i===0?'⇢':i}</span><div><span class="k">${r.k}</span><br><span class="v">${r.v||'aguardando…'}</span></div></div>`;});
  }
  box.innerHTML=h;
}

/* ===== Cenários =====
   Passo: {badge,title,text,hint,active,dim,halo,hp:{'S1.1':classe},anims:[[caminho,vlan,tagged,rótulo]] ou seq:[[...],[...]],no,ok,pre,mut} */
const T=true,U=false;
const sw2in=v=>{D('SW2');R(0,`P${v===10?1:2} · acesso, VLAN ${v} · chegou sem tag`);R(1,`VLAN ${v} · definida pela porta de acesso`);};
function scenBroadcast(){
  return {seed:()=>{},steps:[
    {badge:['info','Objetivo'],title:'PC-A envia um broadcast na VLAN 10',
     text:'PC-A quer descobrir o MAC de 192.168.10.13 e envia um ARP Request para todos (<b>'+BCAST+'</b>). PC-A está na <b>VLAN 10 (Vendas)</b>. PC-B, ligado no <b>mesmo SW2</b>, está na <b>VLAN 20 (TI)</b>.',
     hint:'O computador não sabe nada de VLAN: ele envia um quadro Ethernet comum, sem tag.',active:['A'],
     pre:()=>{F('A','FF',10);L('PC-A → SW2 (porta de acesso)',U);}},
    {badge:['v10','Passo 1'],title:'O quadro entra pela P1 do SW2',
     text:'A P1 é uma <b>porta de acesso</b> (access) configurada na VLAN 10. Por ela os quadros entram e saem <b>sem tag</b>.',
     active:['A'],hp:{'S2.1':'in'},anims:[['A_S2',10,U,'Broadcast']],
     mut:()=>{D('SW2');R(0,'P1 · acesso, VLAN 10 · chegou sem tag');}},
    {badge:['v10','Passo 2'],title:'Classificar: o quadro é da VLAN 10',
     text:'Como chegou por uma porta de acesso, o switch associa o quadro à VLAN configurada nela: <b>VLAN 10</b>. A partir daqui, ele só circula dentro da VLAN 10.',
     hint:'Por dentro, é como se o SW2 fosse dois switches separados: um para cada VLAN.',active:['A'],hp:{'S2.1':'in'},
     mut:()=>R(1,'VLAN 10 · definida pela porta de acesso')},
    {badge:['v10','Passo 3'],title:'No SW2, só as portas da VLAN 10',
     text:'O broadcast sai por todas as portas da VLAN 10, menos a de entrada: só o <b>trunk P3</b>, que sobe para o SW1. A <b>P2</b> é da VLAN 20: PC-B, vizinho de PC-A, <b>não recebe nada</b>.',
     hint:'No trunk o quadro ganha uma tag 802.1Q com VID 10, para quem está do outro lado saber de que VLAN ele é.',
     active:['A'],hp:{'S2.1':'in','S2.3':'out','S2.2':'blk'},
     pre:()=>{R(2,['P3 trunk → com tag 10','✕ P2 (VLAN 20) → não recebe']);L('SW2 → SW1 (trunk)',T);},
     anims:[['S2_S1',10,T,'Broadcast']]},
    {badge:['tag','Passo 4'],title:'O SW1 repassa dentro da VLAN 10',
     text:'O SW1 lê <b>VID = 10</b>. Dentro de uma mesma VLAN ele comuta como qualquer switch: o broadcast desce pela <b>P2</b> (trunk para o SW3) com tag 10, e uma cópia vai, por dentro, para a <b>interface VLAN 10</b>.',
     active:['R'],hp:{'S1.1':'in','S1.2':'out'},
     pre:()=>{D('SW1');R(0,'P1 · trunk · chegou com tag 10');R(1,'VLAN 10 · lida da tag 802.1Q (VID)');R(2,['P2 trunk → com tag 10','interface vlan 10 (interna) → recebe']);L('SW1 → SW3 (trunk)',T);},
     anims:[['S1_S3',10,T,'Broadcast'],['S1_V10',10,U,'Broadcast']]},
    {badge:['route','Passo 5'],title:'A interface VLAN 10 também faz parte do domínio',
     text:'A <b>interface VLAN 10</b> do SW1 (o gateway 192.168.10.1) é membro da VLAN 10 como qualquer outro, então recebe o broadcast. O IP perguntado não é o dela, e ela <b>ignora</b>.',
     hint:'A parte de roteamento não repassa broadcasts para a VLAN 20: ela é a fronteira do domínio de broadcast.',active:['R'],no:['V10']},
    {badge:['v10','Passo 6'],title:'O SW3 tira a tag e entrega só na VLAN 10',
     text:'O SW3 lê <b>VID = 10</b> e envia o broadcast pela <b>P1</b> (acesso, VLAN 10), <b>removendo a tag</b>: PC-C recebe um quadro comum. A <b>P2</b> (VLAN 20) fica de fora.',
     active:['C'],hp:{'S3.3':'in','S3.1':'out','S3.2':'blk'},
     pre:()=>{D('SW3');R(0,'P3 · trunk · chegou com tag 10');R(1,'VLAN 10 · lida da tag 802.1Q (VID)');R(2,['P1 acesso → sem tag','✕ P2 (VLAN 20) → não recebe']);L('SW3 → PC-C (porta de acesso)',U);},
     anims:[['S3_C',10,U,'Broadcast']],ok:['C']},
    {badge:['info','Passo 7'],title:'Quem recebeu e quem não recebeu',
     text:'PC-C recebe e responde, porque o IP é dele. <b>PC-B e PC-D nunca viram o quadro</b>, embora PC-B esteja no mesmo switch que PC-A, e PC-D no mesmo switch que PC-C.',
     active:['A','C','R'],dim:true},
    {badge:['v20','Passo 8'],title:'E um broadcast da VLAN 20?',
     text:'Agora PC-B envia um broadcast. O raciocínio é o mesmo: entra pela P2 do SW2 (VLAN 20), atravessa os trunks com <b>tag 20</b> e só chega a <b>PC-D</b> e à <b>interface VLAN 20</b>.',
     active:['B','D','R'],dim:true,hp:{'S2.2':'in','S2.3':'out','S2.1':'blk','S1.1':'in','S1.2':'out','S3.3':'in','S3.2':'out','S3.1':'blk'},
     pre:()=>{F('B','FF',20);L('SW2 → SW1 → SW3 (trunks)',T);D('SW1');R(0,'P1 · trunk · chegou com tag 20');R(1,'VLAN 20 · lida da tag 802.1Q (VID)');R(2,['P2 trunk → com tag 20','interface vlan 20 (interna) → recebe']);},
     seq:[[['B_S2',20,U,'Broadcast']],[['S2_S1',20,T,'Broadcast']],[['S1_S3',20,T,'Broadcast'],['S1_V20',20,U,'Broadcast']],[['S3_D',20,U,'Broadcast']]],
     mut:()=>{L('SW3 → PC-D (porta de acesso)',U);},ok:['D']},
    {badge:['done','Lição'],title:'Uma VLAN = um domínio de broadcast',
     text:'Com duas VLANs, a mesma estrutura física virou <b>duas redes separadas</b>. VLAN 10: PC-A, PC-C e a interface VLAN 10. VLAN 20: PC-B, PC-D e a interface VLAN 20. Cada VLAN é um domínio de broadcast e, normalmente, uma sub-rede IP diferente.',
     hint:'Resultado: menos broadcast em cada rede e mais isolamento, pois um setor não enxerga o tráfego do outro, mesmo dividindo o mesmo switch.',
     active:['A','B','C','D'],halo:true}
  ]};
}
function scenTag(){
  return {seed:()=>{},steps:[
    {badge:['info','Situação'],title:'PC-A envia um quadro para PC-C',
     text:'Os dois estão na <b>VLAN 10</b> (mesma sub-rede, 192.168.10.0/24), mas em <b>switches de acesso diferentes</b> (SW2 e SW3). Os switches já aprenderam os MACs. Acompanhe a faixa <b>Formato do quadro</b>: ela mostra o quadro como ele está em cada cabo.',
     active:['A','C'],pre:()=>{F('A','C',10,{data:'pacote IPv4'});L('PC-A → SW2 (porta de acesso)',U);}},
    {badge:['v10','Passo 1'],title:'Enlace de acesso: quadro sem tag (untagged)',
     text:'Entre PC-A e o SW2 o quadro é Ethernet comum, <b>sem</b> o campo 802.1Q. O SW2 sabe que é da VLAN 10 por causa da porta: P1 é de acesso na VLAN 10.',
     active:['A'],hp:{'S2.1':'in'},anims:[['A_S2',10,U,'A → C']],mut:()=>sw2in(10)},
    {badge:['tag','Passo 2'],title:'No trunk, o quadro ganha a tag 802.1Q (tagged)',
     text:'Na tabela MAC <b>da VLAN 10</b>, PC-C está atrás da P3, o trunk para o SW1. Antes de sair, o SW2 <b>insere 4 bytes</b> entre o MAC de origem e o EtherType: a tag 802.1Q, com <b>VID = 10</b>. O FCS é recalculado.',
     hint:'Clique no campo “Tag 802.1Q” da faixa para ver para que serve cada parte dele.',
     active:[],hp:{'S2.1':'in','S2.3':'out'},
     pre:()=>{R(2,['PC-C está atrás da P3 (trunk) → sai com tag 10']);L('SW2 → SW1 (trunk)',T);},anims:[['S2_S1',10,T,'A → C']]},
    {badge:['tag','Passo 3'],title:'De trunk para trunk, a tag continua',
     text:'O SW1 lê <b>VID = 10</b> e acha PC-C atrás da P2, outro trunk. O quadro segue <b>com a mesma tag 10</b>. Mesmo sendo camada 3, aqui o SW1 só comuta: origem e destino estão na mesma VLAN, não há roteamento.',
     active:[],hp:{'S1.1':'in','S1.2':'out'},
     pre:()=>{D('SW1');R(0,'P1 · trunk · chegou com tag 10');R(1,'VLAN 10 · lida da tag (VID)');R(2,['PC-C está atrás da P2 (trunk) → sai com tag 10']);L('SW1 → SW3 (trunk)',T);},
     anims:[['S1_S3',10,T,'A → C']]},
    {badge:['v10','Passo 4'],title:'Na porta de acesso a tag é removida',
     text:'O SW3 lê <b>VID = 10</b>, acha PC-C na P1 (acesso), <b>retira a tag</b> e entrega um quadro comum. PC-C nem fica sabendo que existiu uma VLAN no caminho.',
     active:['C'],hp:{'S3.3':'in','S3.1':'out'},
     pre:()=>{D('SW3');R(0,'P3 · trunk · chegou com tag 10');R(1,'VLAN 10 · lida da tag (VID)');R(2,['PC-C está atrás da P1 (acesso) → sai sem tag']);L('SW3 → PC-C (porta de acesso)',U);},
     anims:[['S3_C',10,U,'A → C']],ok:['C']},
    {badge:['done','Lição'],title:'Tagged no trunk, untagged no acesso',
     text:'<b>PC-A ↔ SW2:</b> sem tag. <b>SW2 ↔ SW1:</b> tag 10. <b>SW1 ↔ SW3:</b> tag 10. <b>SW3 ↔ PC-C:</b> sem tag. A porta de <b>acesso</b> pertence a uma VLAN só; o <b>trunk</b> leva várias VLANs no mesmo cabo e identifica cada quadro pela tag.',
     hint:'Sem a tag, um switch não teria como saber se um quadro vindo do trunk é da VLAN 10 ou da 20. A exceção é a VLAN nativa (cenário 3).',
     active:['A','C']}
  ]};
}
function scenNative(){
  const sw1=()=>{D('SW1');R(0,'P1 · trunk · chegou <b>sem tag</b>');R(1,'VLAN 10 · sem tag = nativa desta porta (10)');R(2,['P2 trunk (nativa 10) → <b>sem tag</b>','interface vlan 10 (interna) → recebe']);L('SW1 → SW3 (trunk, VLAN nativa)',U);};
  return {seed:()=>{},steps:[
    {badge:['info','Conceito'],title:'O que é a VLAN nativa',
     text:'Em um trunk, os quadros da <b>VLAN nativa</b> viajam <b>sem tag</b>. E todo quadro que chega sem tag por um trunk é colocado na VLAN nativa daquela porta. Por padrão, a nativa é a VLAN 1.',
     hint:'Para ver o efeito, o técnico configurou a <b>VLAN 10 como nativa</b> nas duas pontas dos dois trunks. Veja a tabela de portas.',
     active:[],hp:{'S1.1':'cfg','S1.2':'cfg','S2.3':'cfg','S3.3':'cfg'},
     mut:()=>{for(const p of ['S1.1','S1.2','S2.3','S3.3'])setNat(p,10);}},
    {badge:['v10','Passo 1'],title:'PC-A envia um broadcast',
     text:'O quadro da VLAN 10 entra pela P1 do SW2, como sempre: sem tag, porta de acesso.',
     active:['A'],hp:{'S2.1':'in'},pre:()=>{F('A','FF',10);L('PC-A → SW2 (porta de acesso)',U);},anims:[['A_S2',10,U,'Broadcast']],
     mut:()=>sw2in(10)},
    {badge:['v10','Passo 2'],title:'No trunk, a VLAN nativa sai sem tag',
     text:'Pela <b>P3</b> do SW2, cuja nativa é a 10, o quadro sai <b>sem tag</b>, como se fosse uma porta de acesso. Compare com o cenário 1, em que ele subia com tag 10.',
     hint:'Repare na faixa do quadro: o campo da tag está ausente mesmo dentro do trunk.',
     active:[],hp:{'S2.1':'in','S2.3':'out','S2.2':'blk'},
     pre:()=>{R(2,['P3 trunk (nativa 10) → <b>sem tag</b>','✕ P2 (VLAN 20) → não recebe']);L('SW2 → SW1 (trunk, VLAN nativa)',U);},
     anims:[['S2_S1',10,U,'Broadcast']]},
    {badge:['v10','Passo 3'],title:'SW1: sem tag → VLAN nativa (10)',
     text:'O SW1 recebe um quadro <b>sem tag</b> pela P1. Como a nativa dessa porta também é 10, conclui corretamente que é da VLAN 10. Ele o repassa pela P2, de novo sem tag, e para a interface VLAN 10.',
     active:['R'],hp:{'S1.1':'in','S1.2':'out'},pre:sw1,
     anims:[['S1_S3',10,U,'Broadcast'],['S1_V10',10,U,'Broadcast']]},
    {badge:['v10','Passo 4'],title:'SW3: sem tag → VLAN nativa (10)',
     text:'O SW3 também recebe sem tag, aplica a sua nativa (10) e entrega a PC-C. Tudo certo, porque <b>as duas pontas de cada trunk concordam</b>.',
     active:['C'],hp:{'S3.3':'in','S3.1':'out','S3.2':'blk'},
     pre:()=>{D('SW3');R(0,'P3 · trunk · chegou <b>sem tag</b>');R(1,'VLAN 10 · sem tag = nativa desta porta (10)');R(2,['P1 acesso → sem tag','✕ P2 (VLAN 20) → não recebe']);L('SW3 → PC-C (porta de acesso)',U);},
     anims:[['S3_C',10,U,'Broadcast']],ok:['C']},
    {badge:['drop','Erro de configuração'],title:'Alguém muda a nativa só no SW3',
     text:'Um técnico configura a VLAN nativa da P3 do <b>SW3 como 20</b> e esquece a outra ponta, no SW1. Agora o trunk SW1–SW3 tem <b>nativa 10 de um lado e 20 do outro</b>.',
     hint:'Repare no aviso em vermelho sobre o trunk e na tabela de portas.',
     active:[],hp:{'S1.2':'warn','S3.3':'warn'},mut:()=>{setNat('S3.3',20);frame=null;dec=null;}},
    {badge:['v10','Passo 6'],title:'PC-A envia outro broadcast',
     text:'Até o SW1 nada mudou: o quadro da VLAN 10 sobe sem tag e desce pela P2 do SW1 <b>sem tag</b>, porque a nativa desse lado continua sendo 10.',
     active:['A'],hp:{'S2.1':'in','S2.3':'out','S1.1':'in','S1.2':'out'},
     pre:()=>{F('A','FF',10);sw1();},
     seq:[[['A_S2',10,U,'Broadcast']],[['S2_S1',10,U,'Broadcast']],[['S1_S3',10,U,'Broadcast'],['S1_V10',10,U,'Broadcast']]]},
    {badge:['drop','Passo 7'],title:'O SW3 põe o quadro na VLAN errada',
     text:'O SW3 recebe um quadro <b>sem tag</b> e aplica a <b>sua</b> VLAN nativa: a <b>20</b>. O broadcast de PC-A vai parar em <b>PC-D</b>, que é da VLAN 20 (TI). PC-C, que deveria receber, fica sem nada.',
     active:['D'],hp:{'S3.3':'warn','S3.2':'out','S3.1':'blk'},
     pre:()=>{D('SW3');R(0,'P3 · trunk · chegou <b>sem tag</b>');R(1,'<b>VLAN 20</b> · sem tag = nativa desta porta (20) ⚠');R(2,['P2 acesso → PC-D','✕ P1 (VLAN 10) → não recebe']);L('SW3 → PC-D (porta de acesso)',U);frame.vlan=20;},
     anims:[['S3_D',20,U,'Broadcast de A!']],ok:['D']},
    {badge:['drop','Problema'],title:'Vazamento entre VLANs',
     text:'O tráfego da VLAN 10 “pulou” para a VLAN 20 <b>sem passar pelo roteamento</b> do SW1, furando o isolamento. E PC-A deixou de alcançar PC-C, que está na mesma VLAN. Switches Cisco avisam com a mensagem de CDP <i>native VLAN mismatch</i>.',
     active:['A','D'],dim:true,hp:{'S1.2':'warn','S3.3':'warn'}},
    {badge:['done','Lição'],title:'Boas práticas para a VLAN nativa',
     text:'<b>①</b> A nativa deve ser <b>igual nas duas pontas</b> de cada trunk. <b>②</b> Use como nativa uma VLAN <b>sem nenhum host</b> (por exemplo, a 99), e não a VLAN 1 nem uma VLAN de usuários. <b>③</b> Quando o equipamento permite, marque também a nativa com tag (<code>vlan dot1q tag native</code>).',
     hint:'Uma VLAN nativa com hosts também abre espaço para o ataque de <b>VLAN hopping por dupla marcação</b> (double tagging).',
     active:[]}
  ]};
}
function scenRoute(){
  return {seed:()=>{},steps:[
    {badge:['info','Objetivo'],title:'PC-A quer falar com PC-D, de outra VLAN',
     text:'PC-A (192.168.10.11) vai enviar um ping para PC-D (192.168.20.14). Ele percebe que o destino está em <b>outra rede</b> e entrega o pacote ao seu <b>gateway</b>, 192.168.10.1. Quem tem esse IP é a <b>interface VLAN 10</b> do SW1, o switch de núcleo.',
     hint:'O SW1 é um <b>switch camada 3</b>: além de comutar, ele roteia. Cada VLAN ganha uma interface virtual (SVI) com o IP do gateway. O SW2 e o SW3 são camada 2 e não roteiam. (Os MACs já foram resolvidos por ARP.)',
     active:['A','R'],pre:()=>{F('A','R',10,{data:'IP .10.11 → .20.14 · TTL 64'});L('PC-A → SW2 (porta de acesso)',U);}},
    {badge:['v10','Passo 1'],title:'O quadro vai para o MAC do SW1',
     text:'Repare no painel ao lado: o <b>MAC de destino é o do SW1</b> (da interface VLAN 10), não o de PC-D. Só o IP de destino aponta para PC-D. O quadro entra pela P1 do SW2 e é classificado na VLAN 10.',
     active:['A'],hp:{'S2.1':'in'},anims:[['A_S2',10,U,'A → gateway']],mut:()=>sw2in(10)},
    {badge:['tag','Passo 2'],title:'O SW2 (camada 2) só encaminha',
     text:'O SW2 não olha o IP. Na tabela da VLAN 10, o MAC do SW1 está atrás da <b>P3</b> (trunk). O quadro sobe com <b>tag 10</b>.',
     active:[],hp:{'S2.1':'in','S2.3':'out'},
     pre:()=>{R(2,['MAC do SW1 está atrás da P3 (trunk) → sai com tag 10']);L('SW2 → SW1 (trunk)',T);},anims:[['S2_S1',10,T,'A → gateway']]},
    {badge:['v10','Passo 3'],title:'O destino é o próprio SW1: sobe para a interface VLAN 10',
     text:'O SW1 lê <b>VID 10</b> e vê que o MAC de destino é <b>o dele</b>. Em vez de sair por uma porta, o quadro é entregue, por dentro, à <b>interface VLAN 10</b>.',
     active:['R'],hp:{'S1.1':'in'},
     pre:()=>{D('SW1');R(0,'P1 · trunk · chegou com tag 10');R(1,'VLAN 10 · lida da tag (VID)');R(2,['MAC de destino = MAC do SW1 → entregar à interface vlan 10']);L('dentro do SW1: VLAN 10 → interface vlan 10',U);},
     anims:[['S1_V10',10,U,'A → gateway']]},
    {badge:['route','Passo 4'],title:'Roteamento: da VLAN 10 para a VLAN 20',
     text:'O SW1 descarta o cabeçalho Ethernet, lê o IP de destino e consulta a tabela de rotas: 192.168.20.0/24 está <b>diretamente conectada</b> à <b>interface VLAN 20</b>. O TTL do pacote cai de 64 para 63.',
     hint:'Configuração Cisco no SW1: <code>ip routing</code> e, para cada VLAN, <code>interface vlan 10</code> + <code>ip address 192.168.10.1 255.255.255.0</code>.',
     active:['R'],
     pre:()=>{D('SW1 · roteamento',['Entrada','Decisão de roteamento','Saída']);R(0,'interface vlan 10 · 192.168.10.1');R(1,'192.168.20.14 está em 192.168.20.0/24 → conectada à interface vlan 20');},
     anims:[['V10_V20',0,U,'pacote IP']]},
    {badge:['route','Passo 5'],title:'Um quadro novo, agora na VLAN 20',
     text:'A interface VLAN 20 monta um <b>quadro novo</b>: origem = MAC do SW1, destino = MAC de PC-D. Ele é colocado na VLAN 20 como se tivesse entrado por uma porta dessa VLAN.',
     hint:'Tudo acontece dentro do SW1, em hardware.',
     active:['R'],
     pre:()=>{F('R','D',20,{data:'IP .10.11 → .20.14 · TTL 63'});R(2,'interface vlan 20 → quadro novo na VLAN 20, destino = MAC de PC-D');L('dentro do SW1: interface vlan 20 → VLAN 20',U);},
     anims:[['V20_S1',20,U,'gateway → D']]},
    {badge:['tag','Passo 6'],title:'Comutação na VLAN 20: desce pela P2 com tag 20',
     text:'Agora é comutação normal na VLAN 20: na tabela MAC dessa VLAN, PC-D está atrás da <b>P2</b> (trunk para o SW3). O quadro desce com <b>tag 20</b>.',
     active:[],hp:{'S1.2':'out'},
     pre:()=>{D('SW1');R(0,'interface vlan 20 (interna)');R(1,'VLAN 20 · a VLAN da interface de saída');R(2,['PC-D está atrás da P2 (trunk) → sai com tag 20']);L('SW1 → SW3 (trunk)',T);},
     anims:[['S1_S3',20,T,'gateway → D']]},
    {badge:['v20','Passo 7'],title:'O SW3 entrega a PC-D sem tag',
     text:'O SW3 lê <b>VID 20</b>, encontra PC-D na P2 (acesso, VLAN 20), remove a tag e entrega o quadro. Para ele, é só mais um quadro da VLAN 20.',
     active:['D'],hp:{'S3.3':'in','S3.2':'out'},
     pre:()=>{D('SW3');R(0,'P3 · trunk · chegou com tag 20');R(1,'VLAN 20 · lida da tag (VID)');R(2,['PC-D está atrás da P2 (acesso) → sai sem tag']);L('SW3 → PC-D (porta de acesso)',U);},
     anims:[['S3_D',20,U,'gateway → D']],ok:['D']},
    {badge:['done','Lição'],title:'Acesso em camada 2, roteamento no núcleo L3',
     text:'O ping chegou, mas <b>passou pelo roteamento</b> no SW1: o quadro da VLAN 10 terminou na interface VLAN 10 e um quadro novo nasceu na VLAN 20. Os switches de acesso (SW2, SW3) só separam as VLANs e levam o tráfego até o núcleo pelos trunks. A resposta de PC-D faz o caminho inverso.',
     hint:'Até PC-A e PC-B, ligados no mesmo SW2, precisam subir até o SW1: o quadro sobe pelo trunk com tag 10 e desce pelo mesmo trunk com tag 20. Outra solução é o <b>router-on-a-stick</b> (roteador com subinterfaces num único trunk), mas o switch L3 roteia em hardware e evita esse gargalo.',
     active:['A','D','R']}
  ]};
}
const SCENARIOS=[
  {t:'Domínios de broadcast',s:'Um broadcast da VLAN 10 não chega à VLAN 20, mesmo nos mesmos switches.',build:scenBroadcast},
  {t:'Tagged e untagged',s:'O quadro ganha a tag 802.1Q no trunk e perde na porta de acesso.',build:scenTag},
  {t:'VLAN nativa',s:'Quadros sem tag no trunk e o que acontece quando os lados discordam.',build:scenNative},
  {t:'Roteamento entre VLANs',s:'PC-A (VLAN 10) fala com PC-D (VLAN 20) pelas interfaces VLAN do switch L3.',build:scenRoute}
];

/* ===== Motor de passos ===== */
function resetState(){nat={'S1.1':1,'S1.2':1,'S2.3':1,'S3.3':1};natFlash=new Set();frame=null;dec=null;focus='';}
function applyUpTo(n){
  resetState();STEPS.seed();
  for(let i=0;i<=n;i++){const s=STEPS.steps[i];clearFlags();if(s.pre)s.pre();if(s.mut)s.mut();}
}
function renderStep(s){
  curStep=s;
  const b=document.getElementById('badge');b.className='badge '+s.badge[0];b.textContent=s.badge[1];
  document.getElementById('stTitle').innerHTML=s.title;
  document.getElementById('stText').innerHTML=s.text;
  document.getElementById('stHint').innerHTML=s.hint||'';
  renderTopo(s);renderPorts(s);renderDec();
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
  const stages=s.seq||(s.anims?[s.anims]:[]);
  for(const st of stages) await Promise.all(st.map(a=>animate(...a)));
  if(s.no||s.ok)await marks(s.no,s.ok);
  if(s.mut)s.mut();
  animating=false;renderStep(s);
}
function goPrev(){
  if(animating||step===0)return;
  step--;selField='';applyUpTo(step);gP.innerHTML='';renderStep(STEPS.steps[step]);
}
function startScenario(i){
  if(animating)return;
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
 {q:'O que caracteriza uma porta de acesso (access)?',
  opts:['Transporta várias VLANs, cada quadro com sua tag','Pertence a uma única VLAN e envia e recebe quadros sem tag','Só pode ser ligada a outros switches','Não participa de nenhuma VLAN'],
  a:1,why:'A porta de acesso é onde ficam os computadores: ela pertence a uma VLAN só, e os quadros passam por ela sem tag. O computador nem sabe que existe VLAN.'},
 {q:'Para que serve a tag 802.1Q?',
  opts:['Para criptografar o quadro','Para identificar a qual VLAN o quadro pertence quando ele passa por um trunk','Para informar o endereço IP de destino','Para substituir o MAC de destino'],
  a:1,why:'Como o trunk leva várias VLANs no mesmo cabo, cada quadro precisa de uma marca dizendo de qual VLAN ele é. Esse é o papel do VID dentro da tag.'},
 {q:'Quantos bytes a tag 802.1Q acrescenta ao quadro, e onde ela fica?',
  opts:['2 bytes, antes do MAC de destino','4 bytes, entre o MAC de origem e o EtherType','4 bytes, depois do FCS','8 bytes, no lugar do preâmbulo'],
  a:1,why:'São 4 bytes (TPID, PCP, DEI e VID) inseridos depois do MAC de origem. O FCS é recalculado porque o quadro mudou.'},
 {q:'O campo VID da tag tem 12 bits. Quantas VLANs utilizáveis isso permite?',
  opts:['256','1024','4094','65535'],
  a:2,why:'12 bits dão 4096 valores; 0 e 4095 são reservados, sobram 4094 VLANs (de 1 a 4094).'},
 {q:'PC-A (VLAN 10) envia um broadcast. Na topologia do simulador, quem recebe?',
  opts:['Todos os computadores','PC-C e a interface VLAN 10 (SVI) do SW1','Apenas PC-B, que está no mesmo switch','Ninguém, porque os switches bloqueiam broadcast'],
  a:1,why:'O broadcast fica restrito ao domínio de broadcast da VLAN 10: PC-C (pelo trunk) e a interface VLAN 10 do switch L3, que também é membro da VLAN 10. PC-B e PC-D estão na VLAN 20.'},
 {q:'Quantos domínios de broadcast existem na topologia do simulador?',
  opts:['1, porque é uma rede física só','2, um para cada VLAN','3, um por equipamento de rede','4, um por computador'],
  a:1,why:'Cada VLAN é um domínio de broadcast. Com as VLANs 10 e 20, a mesma estrutura física forma duas redes lógicas separadas.'},
 {q:'Um quadro chega SEM tag por uma porta trunk. Em qual VLAN o switch o coloca?',
  opts:['Na VLAN 1, sempre','Na VLAN nativa configurada naquela porta','Ele descarta o quadro','Na VLAN do computador de origem'],
  a:1,why:'É a definição de VLAN nativa: quadros dela viajam sem tag e quadros sem tag recebidos no trunk vão para ela. A VLAN 1 é só o valor padrão.'},
 {q:'O que acontece se a VLAN nativa for diferente nas duas pontas de um trunk?',
  opts:['Nada, cada switch usa a sua sem problema','O trunk vira porta de acesso automaticamente','Quadros sem tag de uma VLAN passam a aparecer em outra VLAN do outro lado','Todas as VLANs param de funcionar'],
  a:2,why:'Um lado envia sem tag achando que é a VLAN X; o outro recebe e coloca na sua nativa Y. O tráfego vaza de uma VLAN para outra, como no cenário 3.'},
 {q:'PC-A (192.168.10.11) quer enviar um ping a PC-D (192.168.20.14). Qual é o MAC de destino do quadro que PC-A envia?',
  opts:['O MAC de PC-D','O MAC do gateway: a interface VLAN 10 do SW1','FF:FF:FF:FF:FF:FF','O MAC do SW2, onde PC-A está ligado'],
  a:1,why:'O destino está em outra rede, então PC-A entrega o quadro ao gateway. O IP de destino continua sendo o de PC-D; o switch L3 é que monta um quadro novo na VLAN 20.'},
 {q:'O que é uma interface VLAN (SVI) em um switch camada 3?',
  opts:['Uma porta física reservada para o roteador','Uma interface virtual associada a uma VLAN, que recebe o IP do gateway dessa VLAN','Um tipo especial de cabo trunk','Uma VLAN sem hosts usada como nativa'],
  a:1,why:'Cada SVI (interface vlan 10, interface vlan 20) é o gateway da sua VLAN. Com ip routing ligado, o switch roteia entre elas internamente.'},
 {q:'No switch L3 Cisco, qual comando liga o roteamento entre as interfaces VLAN?',
  opts:['switchport mode trunk','ip routing','vlan dot1q tag native','encapsulation dot1Q 10'],
  a:1,why:'Sem ip routing, as SVIs só servem para gerenciar o switch. switchport mode trunk configura trunk, e encapsulation dot1Q é usado em subinterfaces de roteador (router-on-a-stick).'},
 {q:'Que vantagem o switch L3 tem sobre o router-on-a-stick?',
  opts:['Dispensa o uso de VLANs','Roteia por dentro, em hardware, sem que o tráfego entre VLANs passe duas vezes pelo mesmo cabo','Elimina a necessidade de gateway nos computadores','Faz o broadcast passar de uma VLAN para outra'],
  a:1,why:'No router-on-a-stick, todo o tráfego entre VLANs sobe e desce pelo único trunk do roteador. No switch L3, o roteamento acontece dentro da caixa.'},
 {q:'PC-A (VLAN 10) e PC-B (VLAN 20) estão ligados no mesmo SW2, que é camada 2. Como um ping de PC-A chega a PC-B?',
  opts:['Direto pelo SW2, porque estão no mesmo switch','Sobe pelo trunk até o SW1 com tag 10, é roteado e desce pelo mesmo trunk com tag 20','O SW2 troca a tag de 10 para 20 sozinho','Não chega de jeito nenhum'],
  a:1,why:'Estar no mesmo switch físico não importa: VLANs diferentes só se falam pela camada 3. O SW2 não roteia, então o tráfego vai até o switch L3 do núcleo e volta.'},
 {q:'Sem roteamento (roteador ou switch camada 3), PC-A, da VLAN 10, consegue se comunicar com PC-B, da VLAN 20?',
  opts:['Sim, porque estão no mesmo switch','Sim, se o trunk estiver configurado','Não: VLANs diferentes só se comunicam passando pela camada 3','Só por broadcast'],
  a:2,why:'Na camada 2, as VLANs são isoladas. Para ir de uma à outra é preciso roteamento entre VLANs.'},
 {q:'Qual é a boa prática para a VLAN nativa?',
  opts:['Deixar a VLAN 1 com os usuários','Usar uma VLAN sem hosts (ex.: 99), igual nas duas pontas do trunk','Usar uma nativa diferente em cada switch','Usar como nativa a VLAN do servidor mais importante'],
  a:1,why:'Uma nativa dedicada e sem hosts, igual nos dois lados, evita vazamentos e reduz o risco de VLAN hopping por dupla marcação.'}
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

/* ===== Formato do quadro: mostrar/ocultar ===== */
function setEF(on){
  document.getElementById('efToggle').checked=on;
  document.getElementById('efbody').hidden=!on;
  document.getElementById('efTglTxt').textContent=on?'Ocultar':'Mostrar';
  try{localStorage.setItem('vlan-ef',on?'1':'0');}catch(e){}
}
document.getElementById('efToggle').onchange=e=>setEF(e.target.checked);
let efPref=true;try{efPref=localStorage.getItem('vlan-ef')!=='0';}catch(e){}

/* ===== Início ===== */
drawStatic();buildScenBar();resetState();buildQuiz();setEF(efPref);startScenario(0);
