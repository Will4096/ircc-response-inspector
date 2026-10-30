// SYNTHETIC PREVIEW ONLY. This file is not included in the extension runtime.
(()=>{
  const query=new URLSearchParams(location.search),listeners=[];
  const profiles=[{id:'demo-a',label:'本人 · PR 申请',surname:'Example',givenName:'Person',uci:'12345678',applicationNumber:'DEMO0001',birthDate:'1990-01-01',country:'China',role:'principalApplicantId',noGivenName:false},{id:'demo-b',label:'家人 · 工签申请',surname:'Example',givenName:'Applicant',uci:'87654321',applicationNumber:'DEMO0002',birthDate:'1991-02-02',country:'China',role:'principalApplicantId',noGivenName:false}];
  const empty=query.has('empty'),mail=query.get('mail'),gmail=mail==='reauth';
  let data={uiLanguage:query.get('lang')==='en'?'en':'zh',applications:empty?[]:profiles,selectedApplicationId:empty?'':'demo-a',autoFill:true,mailAssist:mail?{enabled:true,provider:gmail?'gmail':'163',email:gmail?'example@gmail.com':'example@163.com',clientId:gmail?'demo-client.apps.googleusercontent.com':''}:{enabled:false}};
  let stage=query.get('stage') || 'results';
  let capture={active:false,status:'completed',finishedAt:'2026-10-29T12:00:00Z',application:{number:'DEMO0001',title:'申请人 A · Application',status:'In Progress'},applicants:['申请人 A','申请人 B'].map((name,index)=>({id:'person'+index,relationId:String(index),name,role:index?'DEP':'PA',status:'completed',checks:{biometrics:'Completed',medical:'Completed',eligibility:'Completed',background:'In Progress'},historyLoaded:true,history:[{key:index?'Medical':'Security',actStatus:index?'Completed':'17',dateCreated:'2026-10-28',text:'虚构记录 · Demo record'}],pendingActions:0})),responses:[],errors:[],comparison:{status:'changed',previousAt:'2026-10-28T12:00:00Z',changes:[{person:'申请人 A',type:'history',added:1,label:'History',removed:0}],people:{person0:[{type:'history',added:1,newIndices:[0]}]}}};
  if(stage!=='results' || empty)capture={active:false,status:'idle',application:{},applicants:[],responses:[]};
  if(stage==='failed'){stage='results';capture={...capture,status:'failed',reason:'查询连接已断开，请重新查询。'};}
  const nativeReady=mail!=='error';let configured=!!mail,verifiedAt=mail?Date.now():null;
  const changes=value=>{const changed={};for(const [key,newValue] of Object.entries(value))changed[key]={oldValue:data[key],newValue};Object.assign(data,value);for(const fn of listeners)fn(changed,'local');};
  window.chrome={extension:{getViews:()=>query.get('surface')==='popup'?[window]:[]},storage:{session:{get:async()=>({'capture:profile:demo-a':{...capture,profileId:'demo-a'}})},local:{get:async key=>key===null?{...data}:Object.fromEntries((Array.isArray(key)?key:[key]).filter(k=>k in data).map(k=>[k,data[k]])),set:async value=>changes(value)},onChanged:{addListener:fn=>listeners.push(fn)}},permissions:{request:async()=>true},runtime:{id:'synthetic-preview',getManifest:()=>({version:'3.7.2'}),getURL:path=>path,openOptionsPage:async()=>{location.href='settings.html';},sendMessage:async message=>{
    switch(message.action){
      case 'mailSettings':return {config:data.mailAssist,connection:{authReady:mail!=='reauth',helperReady:nativeReady,configured,verifiedAt},extensionId:'synthetic-preview',redirect:'https://synthetic-preview.chromiumapp.org/gmail'};
      case 'mailHelperStatus':return nativeReady?{ok:true,configured}:{error:'mail.helper'};
      case 'mailSetup163':configured=true;verifiedAt=Date.now();return {ok:true};
      case 'mailAuthorize':verifiedAt=Date.now();return {ok:true};
      case 'mailSave':changes({mailAssist:message.config});return {ok:true};
      case 'mailDisconnect':verifiedAt=null;configured=false;changes({mailAssist:{enabled:false}});return {ok:true,helperCleared:true};
      case 'clearLocalData':changes({applications:[],autoFill:false,mailAssist:{enabled:false},uiLanguage:'zh'});return {ok:true,helperCleared:true};
      case 'removeProfile':{const next=data.applications.filter(p=>p.id!==message.profileId);changes({applications:next});return {ok:true,applications:next};}
      case 'getContext':return {stage};case 'read':return capture;
      case 'mailPoll':return data.mailAssist.enabled?{status:'waiting'}:{status:'off'};
      case 'stop':capture={...capture,active:false,status:'stopped'};return {ok:true};
      case 'fill':capture={...capture,status:'ready'};return {ok:true,message:'请确认申请信息，点击 Submit 后继续。'};
      case 'start':case 'verify':capture={...capture,active:true,status:'capturing'};setTimeout(()=>{capture={...capture,active:false,status:'completed'};stage='results';},900);return {ok:true};
      default:return {ok:true};
    }
  }},tabs:{query:async()=>empty?[]:[{id:1,windowId:1,active:true,url:'https://ircc-services.canada.ca/2/ast-details'}],get:async()=>({windowId:1,url:'https://ircc-services.canada.ca/2/ast-details'}),update:async()=>{},create:async({url})=>{if(url==='options.html')location.href=url;return {id:1};}},windows:{update:async()=>{}}};
})();
