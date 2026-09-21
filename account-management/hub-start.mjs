import {installSso} from './hub-client.mjs';
const embedded=window.parent!==window&&new URL(location.href).searchParams.get('embed')==='intranet';
const start=()=>installSso({appId:'accounts',brokerUrl:embedded?'https://asia-northeast3-fir-lms-prod.cloudfunctions.net/intranetAccountsApi':'https://asia-northeast3-fir-lms-prod.cloudfunctions.net/hubSsoApi',hubOrigins:embedded?['https://sedu-intranet-prod.web.app','https://sedu-intranet-prod.firebaseapp.com']:['https://sedubanpo.github.io'],...window.SeduHubAdapter});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
