/* Kani Home — static, Markdown-backed reader. No credentials are stored here. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  let chapters = [], settings = {}, current = null, routeVersion = 0, searchVersion = 0;
  const cache = new Map();
  const snapshot = document.documentElement.dataset.snapshot === 'true';
  const offline = location.protocol === 'file:' || snapshot;
  let roleDialog = null, roleTrigger = null, mapDialog = null;
  function showExplainer(title, note, details, trigger) {
    if (!roleDialog) {
      roleDialog = document.createElement('dialog');roleDialog.className='role-dialog';
      roleDialog.setAttribute('aria-labelledby','role-dialog-title');
      document.body.append(roleDialog);
      roleDialog.addEventListener('close',()=>{document.body.classList.remove('role-open');if(roleTrigger?.isConnected)roleTrigger.focus({preventScroll:true});});
      roleDialog.addEventListener('click',e=>{if(e.target===roleDialog){const r=roleDialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)roleDialog.close();}});
    }
    roleTrigger=trigger;roleDialog.replaceChildren();
    const close=document.createElement('button');close.className='role-close';close.textContent='Close ×';close.setAttribute('aria-label','Close explainer');close.onclick=()=>roleDialog.close();
    const label=document.createElement('p');label.className='eyebrow';label.textContent='Working map · Explainer';
    const h=document.createElement('h2');h.id='role-dialog-title';h.textContent=title;
    const intro=document.createElement('p');intro.className='role-summary';intro.textContent=note;
    roleDialog.append(close,label,h,intro);
    for(const detail of details){const heading=document.createElement('h3');heading.textContent=detail.label;const para=document.createElement('p');para.textContent=detail.text;roleDialog.append(heading,para);}
    roleDialog.showModal();document.body.classList.add('role-open');close.focus();
  }
  function chartFromText(text, explanations, kind='chart') {
    const figure=document.createElement('figure');figure.className='org-chart map-'+kind;
    const caption=document.createElement('figcaption');caption.textContent=({chart:'Project structure',support:'Shared support · works with both festival leads',flow:'Follow the steps'})[kind]+' · Select a box';figure.append(caption);
    const root=document.createElement(kind==='flow'?'ol':'ul');root.className=kind==='chart'?'org-tree':'map-cards';figure.append(root);
    const lists=[root];let previous=null,depthBefore=0,tone='';
    for(const line of text.trimEnd().split('\n')) {
      if(!line.trim())continue;
      const match=line.match(/^( *)(?:- )(.+)$/);
      if(!match||match[1].length%2)return null;
      const depth=match[1].length/2;if(depth>6||depth>depthBefore+1||(!previous&&depth!==0)||(kind!=='chart'&&depth!==0))return null;
      if(depth>depthBefore){const children=document.createElement('ul');previous.append(children);lists[depth]=children;}
      const item=document.createElement('li'),card=document.createElement('button');card.type='button';card.className='org-node';
      const [rawTitle,...notes]=match[2].split('|');const title=rawTitle.trim(),note=notes.join('|').trim();
      if(depth===1)tone=title==='Festival Curator'?'creative':title==='Festival Producer'?'delivery':'';
      if(tone&&depth>0)item.classList.add('tone-'+tone);
      const strong=document.createElement('strong');strong.textContent=title;card.append(strong);
      if(note){const small=document.createElement('small');small.textContent=note;card.append(small);}
      const hint=document.createElement('span');hint.className='node-hint';hint.textContent='Read explainer ↗';hint.setAttribute('aria-hidden','true');card.append(hint);
      card.setAttribute('aria-haspopup','dialog');card.setAttribute('aria-label',title+' — read explainer');
      const details=explanations.get(title)||[{label:'About this role',text:note||'See the roles and working arrangements in this chapter.'}];
      card.onclick=()=>showExplainer(title,note,details,card);
      item.append(card);lists[depth].append(item);previous=item;depthBefore=depth;
    }
    return root.children.length?figure:null;
  }
  function unifiedMapFromText(text, explanations, expanded=false) {
    const sections=new Map();let section=null;
    for(const line of text.split('\n')){
      const heading=line.match(/^\[([^\]]+)\]$/);
      if(heading){if(!['Festival team','Shared resources','Collaborations'].includes(heading[1])||sections.has(heading[1]))return null;section=heading[1];sections.set(section,[]);}
      else if(line.trim()){if(!section)return null;sections.get(section).push(line);}
    }
    if(sections.size!==3)return null;
    const links=sections.get('Collaborations').map(line=>{const m=line.match(/^- (.+?) <> (.+?) \| (.+)$/);return m?{from:m[1],to:m[2],label:m[3]}:null;});
    if(links.some(x=>!x))return null;
    const figure=document.createElement('figure');figure.className='unified-map draggable-map';
    const header=document.createElement('figcaption');header.className='map-toolbar';
    const title=document.createElement('strong');title.textContent='Kani Fest · People & shared resources';header.append(title);
    const controls=document.createElement('div');controls.className='map-view-controls';
    function control(label,fn){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;controls.append(b);return b;}
    if(!expanded)control('Expand map ↗',()=>{
      if(mapDialog)mapDialog.remove();
      mapDialog=document.createElement('dialog');mapDialog.className='map-dialog';mapDialog.setAttribute('aria-label','Expanded Kani Fest map');
      const close=document.createElement('button');close.type='button';close.className='map-close';close.textContent='Close expanded map ×';close.onclick=()=>mapDialog.close();
      const expandedMap=unifiedMapFromText(text,explanations,true);if(!expandedMap)return;
      mapDialog.append(close,expandedMap);document.body.append(mapDialog);mapDialog.addEventListener('close',()=>{document.body.classList.remove('map-open');if(figure.isConnected)controls.querySelector('button').focus({preventScroll:true});});
      mapDialog.showModal();document.body.classList.add('map-open');close.focus();
    });
    const scroll=document.createElement('div');scroll.className='map-viewport';scroll.tabIndex=0;scroll.setAttribute('role','region');scroll.setAttribute('aria-label','Draggable festival map. Drag the background or use arrow keys to pan. Select a role for details.');
    const stage=document.createElement('div');stage.className='map-stage';
    const canvas=document.createElement('div');canvas.className='map-canvas prose';
    const top=document.createElement('div');top.className='map-organisation';
    const team=chartFromText(sections.get('Festival team').join('\n'),explanations,'chart');
    const shared=chartFromText(sections.get('Shared resources').join('\n'),explanations,'support');if(!team||!shared)return null;
    team.querySelector('figcaption').textContent='Festival team';shared.querySelector('figcaption').textContent='Shared resources';
    top.append(team,shared);canvas.append(top);stage.append(canvas);scroll.append(stage);
    const nodeMap=new Map([...canvas.querySelectorAll('.org-node')].map(el=>[el.querySelector('strong').textContent,el]));nodeMap.set('Shared resources',shared);
    if(links.some(x=>!nodeMap.has(x.from)||!nodeMap.has(x.to)))return null;
    const ns='http://www.w3.org/2000/svg';const svg=document.createElementNS(ns,'svg');svg.classList.add('collaboration-lines');svg.setAttribute('aria-hidden','true');canvas.prepend(svg);
    let scale=1,naturalHeight=700;
    const status=document.createElement('span');status.className='map-zoom-status';status.setAttribute('aria-live','polite');
    function setScale(next,center=true){
      const cx=(scroll.scrollLeft+scroll.clientWidth/2)/scale,cy=(scroll.scrollTop+scroll.clientHeight/2)/scale;
      scale=Math.max(.15,Math.min(2,next));canvas.style.transform='scale('+scale+')';stage.style.width=(1260*scale)+'px';stage.style.height=(naturalHeight*scale)+'px';status.textContent=Math.round(scale*100)+'%';
      if(center){scroll.scrollLeft=cx*scale-scroll.clientWidth/2;scroll.scrollTop=cy*scale-scroll.clientHeight/2;}
    }
    function fit(){naturalHeight=canvas.offsetHeight;setScale(Math.min(1,(scroll.clientWidth-24)/1260,(scroll.clientHeight-24)/naturalHeight),false);scroll.scrollLeft=0;scroll.scrollTop=0;}
    control('−',()=>setScale(scale/1.2)).setAttribute('aria-label','Zoom out');
    control('+',()=>setScale(scale*1.2)).setAttribute('aria-label','Zoom in');
    control('100%',()=>setScale(1));control('Reset view',fit);controls.append(status);header.append(controls);figure.append(header);
    const hint=document.createElement('p');hint.className='map-instructions';hint.textContent='Drag background to move · + / − to zoom · Click a box for details';figure.append(hint,scroll);
    const legend=document.createElement('p');legend.className='collaboration-key';
    legend.textContent='Solid lines show project accountability. Dotted lines indicate collaboration and shared support.';figure.append(legend);
    function drawLines(){
      if(!figure.isConnected)return;
      const base=canvas.getBoundingClientRect();const factor=base.width/1260;
      if(!factor)return;
      const box=el=>{const r=el.getBoundingClientRect();return{x:(r.left-base.left)/factor,y:(r.top-base.top)/factor,w:r.width/factor,h:r.height/factor};};
      svg.replaceChildren();svg.setAttribute('viewBox','0 0 1260 '+canvas.offsetHeight);svg.setAttribute('width','1260');svg.setAttribute('height',String(canvas.offsetHeight));
      links.forEach(link=>{
        const a=box(nodeMap.get(link.from)),b=box(nodeMap.get(link.to));let d;
        if(link.from==='Shared resources'){
          const y=b.y-46,x=b.x+b.w*.15;
          d=`M ${a.x} ${a.y+15} H ${a.x-38} V ${y} H ${x} V ${b.y}`;
        }else{
          const y=Math.min(a.y,b.y)-16;
          d=`M ${a.x+a.w*.8} ${a.y} V ${y} H ${b.x+b.w*.2} V ${b.y}`;
        }
        const g=document.createElementNS(ns,'g');
        for(const cls of ['collab-halo','collab-path']){const path=document.createElementNS(ns,'path');path.setAttribute('d',d);path.setAttribute('class',cls);g.append(path);}
        svg.append(g);
      });
    }
    let pan=null;
    scroll.addEventListener('pointerdown',e=>{if(e.button!==0||e.target.closest('button'))return;pan={id:e.pointerId,x:e.clientX,y:e.clientY,left:scroll.scrollLeft,top:scroll.scrollTop};scroll.setPointerCapture(e.pointerId);scroll.classList.add('is-dragging');scroll.focus({preventScroll:true});e.preventDefault();});
    scroll.addEventListener('pointermove',e=>{if(!pan||pan.id!==e.pointerId)return;scroll.scrollLeft=pan.left-(e.clientX-pan.x);scroll.scrollTop=pan.top-(e.clientY-pan.y);});
    const endPan=()=>{pan=null;scroll.classList.remove('is-dragging');};scroll.addEventListener('pointerup',endPan);scroll.addEventListener('pointercancel',endPan);scroll.addEventListener('lostpointercapture',endPan);
    scroll.addEventListener('keydown',e=>{if(e.target!==scroll)return;const moves={ArrowLeft:[-70,0],ArrowRight:[70,0],ArrowUp:[0,-70],ArrowDown:[0,70]};if(moves[e.key]){e.preventDefault();scroll.scrollBy(...moves[e.key]);}});
    requestAnimationFrame(()=>{if(figure.isConnected){naturalHeight=canvas.offsetHeight;fit();drawLines();const observer=new ResizeObserver(()=>{if(!figure.isConnected){observer.disconnect();return;}naturalHeight=canvas.offsetHeight;setScale(scale,false);drawLines();});observer.observe(canvas);}});
    return figure;
  }
  function structureMapFromText(text) {
    const entries=text.trim().split('\n').filter(Boolean).map(line=>{
      const match=line.trim().match(/^- \[([^\]]+)\]\((#[a-z0-9-]+)\)\s*\|\s*(.+)$/i);
      return match?{title:match[1],href:match[2],description:match[3]}:null;
    });
    if(entries.length!==4||entries.some(x=>!x))return null;
    const figure=document.createElement('figure');figure.className='structure-synopsis-map';
    const caption=document.createElement('figcaption');caption.textContent='How Kani is supported, governed and delivered';figure.append(caption);
    const card=(entry,tone)=>{
      const link=document.createElement('a');link.className='structure-synopsis-card '+tone;link.href=entry.href;
      const heading=document.createElement('strong');heading.textContent=entry.title;
      const description=document.createElement('span');description.textContent=entry.description;
      const prompt=document.createElement('small');prompt.textContent='Read this section →';
      link.append(heading,description,prompt);return link;
    };
    const advisory=card(entries[0],'is-advisory');
    const advice=document.createElement('div');advice.className='structure-connector is-advice';advice.textContent='advises and strengthens';
    const council=card(entries[1],'is-council');
    const mandate=document.createElement('div');mandate.className='structure-connector is-mandate';mandate.textContent='sets direction and gives mandates';
    const teams=document.createElement('div');teams.className='structure-team-branches';teams.append(card(entries[2],'is-working'),card(entries[3],'is-programme'));
    figure.append(advisory,advice,council,mandate,teams);return figure;
  }
  const allowed = new Set('P BR HR STRONG EM DEL S BLOCKQUOTE UL OL LI H1 H2 H3 H4 H5 H6 TABLE THEAD TBODY TR TH TD CODE PRE A INPUT'.split(' '));
  function renderMarkdown(md) {
    const template = document.createElement('template');
    template.innerHTML = marked.parse(md, {gfm:true, breaks:false});
    // Detail blocks remain editable in Markdown and available in print, without repeating on screen.
    const detailBlocks=[...template.content.querySelectorAll('pre > code.language-kani-details')].map(code=>{
      const details=document.createElement('template');details.innerHTML=marked.parse(code.textContent,{gfm:true,breaks:false});
      const wrapper=document.createElement('div');wrapper.append(details.content);return {pre:code.parentElement,wrapper};
    });
    const explanations=new Map();
    const tables=[...template.content.querySelectorAll('table'),...detailBlocks.flatMap(({wrapper})=>[...wrapper.querySelectorAll('table')])];
    for(const table of tables){
      const headings=[...table.querySelectorAll('thead th')].map(c=>c.textContent.trim());
      for(const row of table.querySelectorAll('tbody tr')){const cells=[...row.querySelectorAll('td')];if(cells.length>1)explanations.set(cells[0].textContent.trim(),cells.slice(1).map((c,i)=>({label:headings[i+1]||'Details',text:c.textContent.trim()})));}
    }
    const charts=[...template.content.querySelectorAll('pre > code')].filter(c=>/^language-kani-(chart|support|flow|map|structure)$/.test(c.className)).map(code=>({pre:code.parentElement,chart:code.className==='language-kani-map'?unifiedMapFromText(code.textContent,explanations):code.className==='language-kani-structure'?structureMapFromText(code.textContent):chartFromText(code.textContent,explanations,code.className.replace('language-kani-',''))}));
    const clean = node => {
      for (const el of [...node.children]) {
        if (!allowed.has(el.tagName)) { el.remove(); continue; }
        const href = el.getAttribute('href'), checked = el.hasAttribute('checked');
        const align = el.getAttribute('align');
        for (const a of [...el.attributes]) el.removeAttribute(a.name);
        if (el.tagName === 'A' && href && (/^https?:\/\//i.test(href) || /^#[a-z0-9-]+$/i.test(href))) {
          el.setAttribute('href', href);
          if (/^https?:/i.test(href)) {el.setAttribute('target','_blank');el.setAttribute('rel','noopener noreferrer');}
        }
        if (el.tagName === 'INPUT') {el.type='checkbox';el.disabled=true;el.checked=checked;}
        if (['TH','TD'].includes(el.tagName) && ['left','right','center'].includes(align)) el.style.textAlign=align;
        clean(el);
      }
    };
    clean(template.content);
    for(const {pre,wrapper} of detailBlocks){clean(wrapper);wrapper.className='flow-details-print';pre.replaceWith(wrapper);}
    for(const {pre,chart} of charts)if(chart)pre.replaceWith(chart);
    const ethosHeading=[...template.content.querySelectorAll('h2')].find(h=>h.textContent.trim()==='Our ethos');
    if(ethosHeading){let list=ethosHeading.nextElementSibling;while(list&&list.tagName!=='H2'&&list.tagName!=='UL')list=list.nextElementSibling;if(list?.tagName==='UL'){list.className='ethos-grid';for(const item of list.children)item.className='ethos-card';}}
    for(const table of template.content.querySelectorAll('table')) {
      const wrap=document.createElement('div');wrap.className='table-scroll';wrap.tabIndex=0;
      wrap.setAttribute('role','region');wrap.setAttribute('aria-label','Scrollable table');
      table.replaceWith(wrap);wrap.append(table);
    }
    return template.content;
  }
  async function readJSON(path) {
    const res=await fetch(path,{cache:'no-store'});if(!res.ok)throw Error(`Could not load ${path} (${res.status}).`);return res.json();
  }
  async function markdown(chapter) {
    if(cache.has(chapter.id))return cache.get(chapter.id);
    let text;
    if(offline) text=window.KANI_BOOTSTRAP.content[chapter.id];
    else {const r=await fetch(chapter.file,{cache:'no-store'});if(!r.ok)throw Error(`The chapter could not be loaded (${r.status}). Please refresh or check its Markdown file.`);text=await r.text();}
    cache.set(chapter.id,text);return text;
  }
  function repository() {
    if(settings.repository)return settings.repository;
    if(location.hostname.endsWith('.github.io')) {
      const owner=location.hostname.split('.')[0];
      const segment=location.pathname.split('/').filter(Boolean)[0];
      const repo=segment && !segment.endsWith('.html') ? segment : owner+'.github.io';
      return owner+'/'+repo;
    }
    return '';
  }
  function editURL(chapter) {
    const repo=repository();
    if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo))return null;
    return 'https://github.com/'+repo+'/edit/'+encodeURIComponent(settings.branch||'main')+'/'+chapter.file.split('/').map(encodeURIComponent).join('/');
  }
  function navLink(chapter) {
    const a=document.createElement('a');a.href='#'+chapter.id;a.textContent=chapter.title;a.dataset.chapter=chapter.id;return a;
  }
  function makeNavigation() {
    $('toc').replaceChildren();
    for(const c of chapters) {
      if(c.archived)continue;
      if(c.id==='home'){$('toc').append(navLink(c));continue;}
      let group=[...$('toc').querySelectorAll('details')].find(d=>d.dataset.group===c.group);
      if(!group){group=document.createElement('details');group.dataset.group=c.group;const summary=document.createElement('summary');summary.textContent=c.group;const list=document.createElement('div');list.className='subnav';group.append(summary,list);$('toc').append(group);}
      group.querySelector('.subnav').append(navLink(c));
    }
  }
  function closeMenu() {document.body.classList.remove('menu-open');$('menu').setAttribute('aria-expanded','false');$('shade').hidden=true;}
  function markActive() {
    for(const a of document.querySelectorAll('[data-chapter]')){
      if(a.dataset.chapter===current.id||(current.archived&&a.dataset.chapter==='structure-archive')){a.setAttribute('aria-current','page');const group=a.closest('details');if(group)group.open=true;}
      else a.removeAttribute('aria-current');
    }
  }
  function homeCards() {
    $('home-cards').replaceChildren();
    for(const id of ['research','creative-experiences','commercial']){
      const c=chapters.find(x=>x.id===id);const a=document.createElement('a');a.href='#'+id;a.className='pillar-card';
      const num=document.createElement('small');num.textContent='PILLAR '+($('home-cards').children.length+1);
      const h=document.createElement('h2');h.textContent=c.title;
      const p=document.createElement('p');p.textContent=c.description;
      const arrow=document.createElement('span');arrow.className='arrow';arrow.textContent='Explore the pillar →';a.append(num,h,p,arrow);$('home-cards').append(a);
    }
    if(settings.foundation){
      const base=document.createElement('section');base.className='heart-foundation';base.setAttribute('aria-label','Shared foundation for all three pillars');
      const heading=document.createElement('h2');heading.textContent=settings.foundation.title;
      const description=document.createElement('p');description.textContent=settings.foundation.description;
      base.append(heading,description);$('home-cards').append(base);
    }
  }
  async function route() {
    if(roleDialog?.open)roleDialog.close();
    if(mapDialog?.open)mapDialog.close();
    const version=++routeVersion;
    let id;try{id=decodeURIComponent(location.hash.slice(1))||'home';}catch{id='home';}
    const found=chapters.find(c=>c.id===id);current=found||chapters[0];
    const c=current;
    document.title=c.id==='home'?'Kani Manifesto':c.title+' · Kani Manifesto';$('title').textContent=c.title;
    $('breadcrumb').textContent=c.id==='home'?'Programme & organisation':c.group;
    $('kicker').textContent=c.id==='home'?(settings.kicker||'An evolving manifesto'):c.group;
    $('lead').textContent=c.description||'';$('home-cards').hidden=c.id!=='home';
    $('notice').hidden=true;
    if(!found&&id!=='home'){$('notice').textContent='That chapter was not found. Showing Home.';$('notice').hidden=false;}
    if(c.archived){
      const archiveLink=document.createElement('a');archiveLink.href='#structure-archive';archiveLink.textContent='Earlier Structures';
      const currentLink=document.createElement('a');currentLink.href='#structure';currentLink.textContent='How Kani Works';
      $('notice').replaceChildren(document.createTextNode('Archived proposal — preserved for reference. Browse '),archiveLink,document.createTextNode(' or read the current proposal in '),currentLink,document.createTextNode('.'));$('notice').hidden=false;
    }
    const url=editURL(c);$('edit').hidden=snapshot||!url;if(url)$('edit').href=url;
    if(snapshot){$('notice').textContent='Preserved edition — this snapshot stays unchanged. The main website carries the latest version.';$('notice').hidden=false;}
    markActive();closeMenu();$('article').textContent='Loading chapter…';$('pager').replaceChildren();
    try{const md=await markdown(c);if(version!==routeVersion)return;$('article').replaceChildren(renderMarkdown(md));
      const first=$('article').firstElementChild;if(first?.tagName==='P'&&first.textContent.trim()===c.description?.trim())first.remove();}
    catch(e){if(version!==routeVersion)return;$('article').textContent=e.message;return;}
    const readingOrder=c.archived?chapters.filter(x=>x.id==='structure-archive'||x.archived):chapters.filter(x=>!x.archived);
    const index=readingOrder.findIndex(x=>x.id===c.id);
    for(const [n,label] of [[index-1,'Previous chapter'],[index+1,'Next chapter']]){
      if(!readingOrder[n])continue;const a=document.createElement('a');a.href='#'+readingOrder[n].id;
      const small=document.createElement('small');small.textContent=label;a.append(small,document.createTextNode(readingOrder[n].title));$('pager').append(a);
    }
    window.scrollTo({top:0,behavior:'instant'});$('main').focus({preventScroll:true});
  }
  async function search() {
    const version=++searchVersion;const q=$('search').value.trim().toLowerCase();
    $('results').hidden=!q;$('toc').hidden=!!q;$('results').replaceChildren();
    if(!q){$('search-status').textContent='';return;}
    $('search-status').textContent='Searching chapters…';
    const loaded=await Promise.allSettled(chapters.map(async c=>({c,text:await markdown(c)})));
    if(version!==searchVersion)return;
    let count=0,failed=0;
    for(const r of loaded){if(r.status!=='fulfilled'){failed++;continue;}const {c,text}=r.value;
      if(!(c.title+' '+c.group+' '+text).toLowerCase().includes(q))continue;
      count++;const a=navLink(c);const small=document.createElement('small');small.textContent=c.group||'Overview';a.append(small);$('results').append(a);
    }
    $('search-status').textContent=`${count} matching chapter${count===1?'':'s'}`+(failed?` · ${failed} could not load`:'');markActive();
  }
  async function allMarkdown() {return Promise.all(chapters.map(async c=>({c,md:await markdown(c)})));}
  $('export').onclick=async()=>{
    $('export').disabled=true;
    try{const all=await allMarkdown();const text='# Kani Manifesto — '+(settings.version||'Working draft')+' · '+(settings.stage||'')+'\n\nUpdated '+(settings.updated||'')+'\n\n'+all.map(({c,md})=>'# '+c.title+'\n\n'+(c.archived?'**Archived proposal — preserved for reference. See How Kani Works for the current proposal.**\n\n':'')+md).join('\n\n---\n\n');
      const url=URL.createObjectURL(new Blob([text],{type:'text/markdown;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='Kani-Manifesto-'+(settings.version||'Working-Draft')+'.md';a.hidden=true;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
    }catch(e){$('notice').textContent='Export failed: '+e.message;$('notice').hidden=false;}finally{$('export').disabled=false;}
  };
  function clearPrint(){document.body.classList.remove('print-all');document.getElementById('print-document')?.remove();}
  $('print').onclick=async()=>{
    $('print').disabled=true;
    try{const all=await allMarkdown();clearPrint();const doc=document.createElement('div');doc.id='print-document';
      for(const {c,md} of all){const section=document.createElement('section');section.className='print-chapter prose';const h=document.createElement('h1');h.textContent=c.title;const label=document.createElement('p');label.textContent=(settings.version||'Working draft')+' · '+(settings.stage||'')+' · '+(settings.updated||'');section.append(label,h);if(c.archived){const warning=document.createElement('p');warning.textContent='Archived proposal — preserved for reference. See How Kani Works for the current proposal.';section.append(warning);}section.append(renderMarkdown(md));doc.append(section);}
      document.body.append(doc);document.body.classList.add('print-all');requestAnimationFrame(()=>window.print());
    }catch(e){$('notice').textContent='Print preparation failed: '+e.message;$('notice').hidden=false;}finally{$('print').disabled=false;}
  };
  window.addEventListener('afterprint',clearPrint);
  $('menu').onclick=()=>{const open=!document.body.classList.contains('menu-open');document.body.classList.toggle('menu-open',open);$('menu').setAttribute('aria-expanded',String(open));$('shade').hidden=!open;};
  $('shade').onclick=closeMenu;document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();});
  $('search').addEventListener('input',search);
  document.querySelector('.skip').onclick=e=>{e.preventDefault();$('main').focus();};
  window.addEventListener('hashchange',()=>{if(chapters.length)route();});
  async function start(){
    try{if(offline){chapters=window.KANI_BOOTSTRAP.chapters;settings=window.KANI_BOOTSTRAP.settings;}
      else{[chapters,settings]=await Promise.all([readJSON('chapters.json'),readJSON('site.json')]);}
      $('version-label').textContent=(settings.version||'Draft')+' · '+(settings.stage||'Discussion');
      $('edition-meta').textContent=(settings.version||'Draft')+' · '+(settings.stage||'Discussion')+' — For discussion · Updated '+(settings.updated||'');
      makeNavigation();homeCards();await route();
      if(offline&&!snapshot){$('notice').textContent='Local preview snapshot. Online edits are made through GitHub after publishing.';$('notice').hidden=false;}
    }catch(e){$('article').textContent='The document could not load. '+e.message;}
  }
  start();
})();
