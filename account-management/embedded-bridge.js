// Navigation and draft state only; authentication remains in the separate SSO channel.
(()=>{
 const views=new Set(['dashboard','students','teachers','introductions','staff','icons','queue','settings','teacherProfiles']);
 const dirtyForms=new Set();
 let origin='';try{origin=new URL(document.referrer).origin;}catch{}
 const embedded=window.ACCOUNTS_EMBEDDED&&['https://sedu-intranet-prod.web.app','https://sedu-intranet-prod.firebaseapp.com'].includes(origin);
 const nonce=new URL(location.href).searchParams.get('hub_nonce');
 const dirty=()=>dirtyForms.size>0;
 let last='';
 function publish(){
  if(!embedded||!state.isAdmin)return;
  const value={view:state.view==='teacherProfiles'?'icons':state.view,dirty:dirty(),busy:Boolean(state.loading)};
  const key=JSON.stringify(value);if(last===key)return;last=key;
  parent.postMessage({channel:'sedu-hub-v1',appId:'accounts',nonce,type:'accounts-state',...value},origin);
 }
 function allowView(view){
  if(!views.has(view))return false;
  if(view!==state.view&&state.loading){toast('진행 중인 작업이 끝난 뒤 이동해 주세요.');return false;}
  // Submenu views keep their form DOM. Retain drafts instead of discarding them.
  return true;
 }
 window.AccountsBridge={publish,allowView,saved(type){const id={student:'studentForm',teacher:'teacherForm',staff:'staffForm'}[type];if(id)dirtyForms.delete(document.getElementById(id));publish();}};
 const changed=e=>{const form=e.target.closest('form');if(form){dirtyForms.add(form);publish();}};
 document.addEventListener('input',changed);document.addEventListener('change',changed);
 document.addEventListener('reset',e=>{dirtyForms.delete(e.target);queueMicrotask(publish);},true);
 window.addEventListener('beforeunload',e=>{if(dirty()||state.loading){e.preventDefault();e.returnValue='';}});
 if(!embedded)return;
 window.addEventListener('message',e=>{
  const d=e.data;if(e.source!==parent||e.origin!==origin||!d||d.channel!=='sedu-hub-v1'||d.appId!=='accounts'||d.nonce!==nonce||!state.isAdmin)return;
  if(d.type==='navigate'&&views.has(d.view)){setView(d.view);last='';publish();window.scrollTo({top:0,behavior:'instant'});}
 });
 setInterval(publish,500);publish();
})();
