/* Image-only drafts never enter the account save queue or persistent storage. */
(() => {
  const el = id => document.getElementById(id);
  const dialog = el('introDialog');
  const canvas = el('introCanvas');
  const fields = ['Name', 'Subject', 'Education', 'Career', 'Introduction', 'Color'];
  let selected = null, photo = null, generation = 0, owner = '', loading = false;
  let logo = null;
  async function readImage(url) {
    const response = await fetch(url, { mode: 'cors', credentials: 'omit', cache: 'reload' });
    if (!response.ok) throw Error('image-response');
    const objectUrl = URL.createObjectURL(await response.blob());
    try {
      const image = new Image(); image.src = objectUrl;
      await image.decode();
      return image;
    } finally { URL.revokeObjectURL(objectUrl); }
  }
  const style = document.createElement('style');
  style.textContent = `
    .intro-group { margin:24px 0; }
    .intro-group h3 { font-size:16px; margin:0 0 12px; }
    .intro-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(190px,1fr)); gap:16px; }
    .intro-card { text-align:left; padding:0; background:white; border:1px solid #dce3ed; border-radius:8px; overflow:hidden; cursor:pointer; color:inherit; }
    .intro-card img,.intro-photo-empty { width:100%; height:220px; object-fit:contain; background:#f3f5f4; display:block; }
    .intro-photo-empty { display:grid; place-items:center; color:#66736c; }
    .intro-card strong,.intro-card small { display:block; padding:0 14px; overflow-wrap:anywhere; }
    .intro-card strong { margin-top:12px; font-size:16px; }
    .intro-card small { margin:6px 0 14px; }
    #introDialog { width:min(1080px,calc(100vw - 24px)); max-height:calc(100dvh - 24px); padding:0; border:1px solid #dce3ed; border-radius:8px; color:inherit; }
    #introDialog::backdrop { background:#14211c88; }
    .intro-dialog-head { display:flex; align-items:center; justify-content:space-between; padding:16px 20px; border-bottom:1px solid #dce3ed; }
    .intro-dialog-head h3 { margin:0; font-size:18px; }
    .intro-layout { display:grid; grid-template-columns:minmax(240px,1fr) minmax(0,1.2fr); gap:24px; padding:20px; }
    #introForm { display:grid; align-content:start; gap:8px; min-width:0; }
    #introForm label { font-size:12px; font-weight:700; margin-top:6px; }
    #introForm textarea { resize:vertical; min-height:70px; }
    .intro-actions { display:flex; flex-wrap:wrap; gap:8px; margin-top:14px; }
    .intro-preview { min-width:0; }
    #introCanvas { width:100%; height:auto; display:block; border:1px solid #dce3ed; }
    #introStatus { font-size:12px; line-height:1.5; overflow-wrap:anywhere; }
    @media(max-width:680px) { .intro-layout { grid-template-columns:minmax(0,1fr); padding:16px; } .intro-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } .intro-card img,.intro-photo-empty { height:180px; } }
  `;
  document.head.append(style);

  function controls() {
    for (const id of ['introDownload', 'introCopy']) el(id).disabled = loading || !photo || !selected || !state.isAdmin;
  }
  function close() {
    generation++;
    selected = null; photo = null; loading = false;
    canvas.width = canvas.height = 1;
    el('introForm').reset();
    if (dialog.open) dialog.close();
    controls();
  }
  dialog.addEventListener('close', () => { if (selected) close(); });
  el('introClose').addEventListener('click', close);

  function renderGroups() {
    if (!state.isAdmin || (owner && owner !== state.authUser?.uid)) { close(); el('introGroups').replaceChildren(); }
    owner = state.authUser?.uid || '';
    if (state.view !== 'introductions') return;
    const target = el('introGroups');
    target.replaceChildren();
    if (!state.isAdmin) { target.textContent = '로그인 후 이용할 수 있습니다.'; return; }
    const search = el('introSearch').value.trim().toLowerCase();
    const groups = new Map();
    for (const teacher of state.teachers.filter(t => t.status === 'ACTIVE')) {
      const subject = teacher.subject || '과목 미등록';
      if (!`${teacher.name} ${subject}`.toLowerCase().includes(search)) continue;
      if (!groups.has(subject)) groups.set(subject, []);
      groups.get(subject).push(teacher);
    }
    for (const [subject, teachers] of [...groups].sort(([a],[b])=>a.localeCompare(b,'ko'))) {
      const section = document.createElement('section'); section.className = 'intro-group';
      const heading = document.createElement('h3'); heading.textContent = `${subject} · ${teachers.length}`;
      const grid = document.createElement('div'); grid.className = 'intro-grid';
      for (const teacher of teachers.sort((a,b)=>a.name.localeCompare(b.name,'ko'))) {
        const card = document.createElement('button'); card.type = 'button'; card.className = 'intro-card';
        card.setAttribute('aria-label', `${teacher.name} 소개 프로필 편집`);
        const asset = teacherProfileAsset(teacher.uid);
        if (asset?.imageUrl) {
          const image = document.createElement('img'); image.src = asset.imageUrl; image.alt = ''; image.loading = 'lazy';
          image.onerror = () => { const fallback=document.createElement('span');fallback.className='intro-photo-empty';fallback.textContent='사진 확인 필요';image.replaceWith(fallback); };
          card.append(image);
        } else {
          const empty = document.createElement('span');empty.className='intro-photo-empty';empty.textContent='사진 미등록';card.append(empty);
        }
        const name = document.createElement('strong'); name.textContent = teacher.name;
        const detail = document.createElement('small'); detail.textContent = teacher.education || subject;
        card.append(name, detail); card.addEventListener('click', () => open(teacher));grid.append(card);
      }
      section.append(heading,grid);target.append(section);
    }
    if (!groups.size) target.textContent = '조건에 맞는 활성 강사가 없습니다.';
  }
  window.renderTeacherIntroductions = renderGroups;
  el('introSearch').addEventListener('input', renderGroups);

  function edgeColor(image) {
    const sample = document.createElement('canvas'); sample.width=sample.height=32;
    const ctx=sample.getContext('2d');ctx.drawImage(image,0,0,32,32);
    const buckets=new Map();
    for(const [x,y] of [[0,0],[31,0],[0,31],[31,31],[0,16],[31,16],[16,0]]) {
      const rgba=ctx.getImageData(x,y,1,1).data;
      if(rgba[3]<240) continue;
      const key=[...rgba].slice(0,3).map(v=>Math.round(v/16)).join(',');
      const entry=buckets.get(key)||{count:0,color:[...rgba].slice(0,3)};entry.count++;buckets.set(key,entry);
    }
    const best=[...buckets.values()].sort((a,b)=>b.count-a.count)[0];
    return best ? '#'+best.color.map(v=>v.toString(16).padStart(2,'0')).join('') : '#e4f0e8';
  }
  async function open(teacher) {
    if(!state.isAdmin) return;
    selected=teacher;photo=null;loading=true;
    const revision=++generation, uid=state.authUser?.uid;
    for(const field of fields) el('intro'+field).value = ({Name:teacher.name,Subject:teacher.subject,Education:teacher.education,Career:teacher.career,Introduction:teacher.introduction,Color:'#e4f0e8'})[field] || '';
    el('introTitle').textContent = `${teacher.name} · 소개 프로필`;
    el('introStatus').textContent='사진을 불러오는 중입니다.';
    if(!dialog.open) dialog.showModal();
    controls();draw();
    try {
      const asset=teacherProfileAsset(teacher.uid);
      if(!asset?.imageUrl) throw Error('인물 프로필 사진을 먼저 등록해 주세요.');
      const [image, brand] = await Promise.all([
        readImage(asset.imageUrl),
        logo ? Promise.resolve(logo) : readImage('./academy-logo.png')
      ]);
      const color=edgeColor(image);
      if(revision!==generation || uid!==state.authUser?.uid || !state.isAdmin) return;
      photo=image;logo=brand;el('introColor').value=color;
      await document.fonts.ready;
      if(revision!==generation) return;
      el('introStatus').textContent='';
    } catch(error) {
      if(revision!==generation) return;
      el('introStatus').textContent=error.message.startsWith('인물')?error.message:'이미지를 불러오지 못했습니다. 사진 서버의 연결 또는 이미지 내보내기(CORS) 설정을 확인해 주세요. 관리자 로그인 권한과는 별개입니다.';
    } finally {
      if(revision===generation) {loading=false;draw();controls();}
    }
  }
  el('introReset').addEventListener('click',()=>{if(selected)open(selected);});
  for(const field of fields) el('intro'+field).addEventListener('input', draw);

  function draw() {
    if(!selected) return;
    const ctx=canvas.getContext('2d'), width=720, margin=44, available=632;
    const font=(size,bold=false)=>`${bold?700:400} ${size}px sans-serif`;
    const wrap=(text,size,bold=false)=>{
      ctx.font=font(size,bold);const result=[];
      for(const paragraph of String(text||'').split('\n')) {
        let line='';
        for(const char of Array.from(paragraph)) {
          if(line && ctx.measureText(line+char).width>available) {result.push(line);line='';}
          line+=char;
        }
        result.push(line);
      }
      return result;
    };
    const blocks=[
      {text:el('introSubject').value,size:22,bold:true,gap:14},
      {text:el('introName').value+' 선생님',size:48,bold:true,gap:32},
      {text:el('introEducation').value,size:27,bold:true,gap:22},
      {text:el('introCareer').value,size:23,gap:24},
      {text:el('introIntroduction').value,size:24,gap:28}
    ].filter(b=>b.text.trim()).map(b=>({...b,lines:wrap(b.text,b.size,b.bold)}));
    const textHeight=blocks.reduce((n,b)=>n+b.lines.length*b.size*1.5+b.gap,0);
    const photoHeight=photo?Math.min(760,Math.max(380,width*photo.naturalHeight/photo.naturalWidth)):380;
    canvas.width=width;canvas.height=Math.ceil(190+textHeight+photoHeight+76);
    const background=el('introColor').value;
    ctx.fillStyle=background;ctx.fillRect(0,0,width,canvas.height);
    ctx.fillStyle='#ffffff';ctx.fillRect(0,0,width,138);
    if(logo) ctx.drawImage(logo,margin,30,76,76);
    ctx.fillStyle='#094f98';ctx.font=font(32,true);ctx.fillText('에스에듀 반포관',margin+98,64);
    ctx.fillStyle='#52616c';ctx.font=font(18);ctx.fillText('학생을 위한 맞춤 수업',margin+98,96);
    ctx.fillStyle='#094f98';ctx.fillRect(margin,137,56,4);
    const rgb=background.match(/\w\w/g).map(v=>parseInt(v,16));
    ctx.fillStyle=rgb[0]*.299+rgb[1]*.587+rgb[2]*.114>145?'#182a24':'#ffffff';
    let y=182;ctx.textBaseline='top';
    for(const b of blocks) {ctx.font=font(b.size,b.bold);for(const line of b.lines){ctx.fillText(line,margin,y);y+=b.size*1.5;}y+=b.gap;}
    if(photo) {
      const scale=Math.min(width/photo.naturalWidth,photoHeight/photo.naturalHeight);
      const w=photo.naturalWidth*scale,h=photo.naturalHeight*scale;
      ctx.drawImage(photo,width-w,canvas.height-76-h,w,h);
    }
    ctx.fillStyle='#ffffff';ctx.fillRect(0,canvas.height-76,width,76);
    ctx.fillStyle='#094f98';ctx.font=font(18,true);ctx.fillText('에스에듀',margin,canvas.height-48);
    ctx.fillStyle='#52616c';ctx.font=font(16);ctx.textAlign='right';ctx.fillText('강사 소개',width-margin,canvas.height-47);
  }
  function png() {
    if(!state.isAdmin || !selected || !photo || loading) return Promise.reject(Error('사진을 불러온 뒤 다시 시도해 주세요.'));
    return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('이미지를 만들지 못했습니다.')),'image/png'));
  }
  el('introDownload').addEventListener('click',async()=>{
    const revision=generation, name=el('introName').value;
    try {const blob=await png();if(revision!==generation||!state.isAdmin)return;const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${name.replace(/[\\/:*?"<>|]/g,'_')||'강사'}-소개.png`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);el('introStatus').textContent='PNG 파일을 다운로드했습니다.';}catch(e){el('introStatus').textContent=e.message;}
  });
  el('introCopy').addEventListener('click',async()=>{
    const revision=generation;
    try {
      if(!navigator.clipboard?.write || !window.ClipboardItem) throw Error('이 브라우저에서는 이미지 복사를 지원하지 않습니다. PNG 다운로드를 이용해 주세요.');
      await navigator.clipboard.write([new ClipboardItem({'image/png':png()})]);
      if(revision===generation)el('introStatus').textContent='이미지를 복사했습니다.';
    }catch(e){if(revision===generation)el('introStatus').textContent='이미지 복사를 완료하지 못했습니다. 브라우저의 클립보드 권한을 확인하거나 PNG 다운로드를 이용해 주세요.';}
  });
  renderGroups();
})();
