/* Kani Home — static, Markdown-backed reader. No credentials are stored here. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  let chapters = [], settings = {}, current = null, routeVersion = 0, searchVersion = 0;
  const cache = new Map();
  const snapshot = document.documentElement.dataset.snapshot === 'true';
  const offline = location.protocol === 'file:' || snapshot;
  function chartFromText(text) {
    const figure=document.createElement('figure');figure.className='org-chart';
    const caption=document.createElement('figcaption');caption.textContent='Project structure';figure.append(caption);
    const root=document.createElement('ul');root.className='org-tree';figure.append(root);
    const lists=[root];let previous=null,depthBefore=0;
    for(const line of text.trimEnd().split('\n')) {
      if(!line.trim())continue;
      const match=line.match(/^( *)(?:- )(.+)$/);
      if(!match||match[1].length%2)return null;
      const depth=match[1].length/2;if(depth>6||depth>depthBefore+1||(!previous&&depth!==0))return null;
      if(depth>depthBefore){const children=document.createElement('ul');previous.append(children);lists[depth]=children;}
      const item=document.createElement('li'),card=document.createElement('div');card.className='org-node';
      const [title,...notes]=match[2].split('|');const strong=document.createElement('strong');strong.textContent=title.trim();card.append(strong);
      if(notes.length){const small=document.createElement('small');small.textContent=notes.join('|').trim();card.append(small);}
      item.append(card);lists[depth].append(item);previous=item;depthBefore=depth;
    }
    return root.children.length?figure:null;
  }
  const allowed = new Set('P BR HR STRONG EM DEL S BLOCKQUOTE UL OL LI H1 H2 H3 H4 H5 H6 TABLE THEAD TBODY TR TH TD CODE PRE A INPUT'.split(' '));
  function renderMarkdown(md) {
    const template = document.createElement('template');
    template.innerHTML = marked.parse(md, {gfm:true, breaks:false});
    const charts=[...template.content.querySelectorAll('pre > code.language-kani-chart')].map(code=>({pre:code.parentElement,chart:chartFromText(code.textContent)}));
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
    for(const {pre,chart} of charts)if(chart)pre.replaceWith(chart);
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
      if(c.id==='home'){$('toc').append(navLink(c));continue;}
      let group=[...$('toc').querySelectorAll('details')].find(d=>d.dataset.group===c.group);
      if(!group){group=document.createElement('details');group.dataset.group=c.group;const summary=document.createElement('summary');summary.textContent=c.group;const list=document.createElement('div');list.className='subnav';group.append(summary,list);$('toc').append(group);}
      group.querySelector('.subnav').append(navLink(c));
    }
  }
  function closeMenu() {document.body.classList.remove('menu-open');$('menu').setAttribute('aria-expanded','false');$('shade').hidden=true;}
  function markActive() {
    for(const a of document.querySelectorAll('[data-chapter]')){
      if(a.dataset.chapter===current.id){a.setAttribute('aria-current','page');const group=a.closest('details');if(group)group.open=true;}
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
  }
  async function route() {
    const version=++routeVersion;
    let id;try{id=decodeURIComponent(location.hash.slice(1))||'home';}catch{id='home';}
    const found=chapters.find(c=>c.id===id);current=found||chapters[0];
    const c=current;
    document.title=c.title+' · Kani Home';$('title').textContent=c.title;
    $('breadcrumb').textContent=c.id==='home'?'Programme & organisation':c.group;
    $('kicker').textContent=c.id==='home'?(settings.kicker||'An evolving manifesto'):c.group;
    $('lead').textContent=c.description||'';$('home-cards').hidden=c.id!=='home';
    $('notice').hidden=true;
    if(!found&&id!=='home'){$('notice').textContent='That chapter was not found. Showing Home.';$('notice').hidden=false;}
    const url=editURL(c);$('edit').hidden=snapshot||!url;if(url)$('edit').href=url;
    if(snapshot){$('notice').textContent='Preserved edition — this snapshot stays unchanged. The main website carries the latest version.';$('notice').hidden=false;}
    markActive();closeMenu();$('article').textContent='Loading chapter…';$('pager').replaceChildren();
    try{const md=await markdown(c);if(version!==routeVersion)return;$('article').replaceChildren(renderMarkdown(md));
      const first=$('article').firstElementChild;if(first?.tagName==='P'&&first.textContent.trim()===c.description?.trim())first.remove();}
    catch(e){if(version!==routeVersion)return;$('article').textContent=e.message;return;}
    const index=chapters.findIndex(x=>x.id===c.id);
    for(const [n,label] of [[index-1,'Previous chapter'],[index+1,'Next chapter']]){
      if(!chapters[n])continue;const a=document.createElement('a');a.href='#'+chapters[n].id;
      const small=document.createElement('small');small.textContent=label;a.append(small,document.createTextNode(chapters[n].title));$('pager').append(a);
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
    try{const all=await allMarkdown();const text='# Kani Home — '+(settings.version||'Working draft')+' · '+(settings.stage||'')+'\n\nUpdated '+(settings.updated||'')+'\n\n'+all.map(({c,md})=>'# '+c.title+'\n\n'+md).join('\n\n---\n\n');
      const url=URL.createObjectURL(new Blob([text],{type:'text/markdown;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='Kani-Home-'+(settings.version||'Working-Draft')+'.md';a.hidden=true;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
    }catch(e){$('notice').textContent='Export failed: '+e.message;$('notice').hidden=false;}finally{$('export').disabled=false;}
  };
  function clearPrint(){document.body.classList.remove('print-all');document.getElementById('print-document')?.remove();}
  $('print').onclick=async()=>{
    $('print').disabled=true;
    try{const all=await allMarkdown();clearPrint();const doc=document.createElement('div');doc.id='print-document';
      for(const {c,md} of all){const section=document.createElement('section');section.className='print-chapter prose';const h=document.createElement('h1');h.textContent=c.title;const label=document.createElement('p');label.textContent=(settings.version||'Working draft')+' · '+(settings.stage||'')+' · '+(settings.updated||'');section.append(label,h,renderMarkdown(md));doc.append(section);}
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
