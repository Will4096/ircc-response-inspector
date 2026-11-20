// Versioned, password-encrypted backups. No mailbox settings, secrets or tab sessions.
var Backup={
  clean(input){
    if(input?.format!=='ircc-local-data'||input.version!==1||!Array.isArray(input.applications)||input.applications.length>100)throw Error('backup.format');
    const ids=new Set(),applications=input.applications.map(p=>{
      if(!p||typeof p.id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(p.id)||['__proto__','constructor','prototype'].includes(p.id)||ids.has(p.id))throw Error('backup.format');ids.add(p.id);
      const result={id:p.id};
      for(const key of ['label','surname','givenName','uci','applicationNumber','birthDate','country','role']){if(typeof p[key]!=='string'||p[key].length>500)throw Error('backup.format');result[key]=p[key];}
      if(!result.label||!result.applicationNumber||!['principalApplicantId','sponsorId','representativeId','designatedIndividualId'].includes(result.role))throw Error('backup.format');
      result.noGivenName=!!p.noGivenName;return result;
    });
    const captures={},comparisons={};
    for(const p of applications){
      const capture=input.captures?.[p.id],baseline=input.comparisons?.[p.id];
      const matches=value=>!value?.application?.number||normalizeApplicationNumber(value.application.number)===normalizeApplicationNumber(p.applicationNumber);
      if(capture){
        if(capture.profileId!==p.id||!matches(capture)||!Array.isArray(capture.applicants)||!Array.isArray(capture.responses))throw Error('backup.format');
        const safe={};for(const key of ['schemaVersion','profileId','application','applicants','responses','errors','comparison','finishedAt','startedAt'])if(capture[key]!==undefined)safe[key]=capture[key];
        captures[p.id]=redactPrivateFields({...safe,active:false,status:typeof capture.status==='string'?capture.status:'idle'});
      }
      if(baseline){if(baseline.profileId!==p.id||!Array.isArray(baseline.applicants)||!matches(baseline))throw Error('backup.format');comparisons[p.id]=redactPrivateFields(baseline);}
    }
    return {format:'ircc-local-data',version:1,applications,selectedApplicationId:ids.has(input.selectedApplicationId)?input.selectedApplicationId:applications[0]?.id||'',uiLanguage:input.uiLanguage==='en'?'en':'zh',autoFill:!!input.autoFill,captures,comparisons};
  },
  collect(local,session){
    const input={format:'ircc-local-data',version:1,...Object.fromEntries(['applications','selectedApplicationId','uiLanguage','autoFill'].map(k=>[k,local[k]])),captures:{},comparisons:{}};
    input.applications ||= [];
    for(const p of input.applications){const capture=session['capture:profile:'+p.id];if(capture)input.captures[p.id]=capture;const baseline=local['comparison:profile:'+p.id];if(baseline)input.comparisons[p.id]=baseline;}
    return this.clean(input);
  },
  async key(password,salt){
    const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
    return crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt,iterations:600000},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
  },
  encode(bytes){let text='';for(const byte of new Uint8Array(bytes))text+=String.fromCharCode(byte);return btoa(text);},
  decode(text){if(typeof text!=='string')throw Error('backup.format');return Uint8Array.from(atob(text),c=>c.charCodeAt(0));},
  async encrypt(input,password){
    if(password.length<10||password.length>1024)throw Error('backup.password');
    const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
    const data=new TextEncoder().encode(JSON.stringify(this.clean(input)));
    if(data.length>20*1024*1024)throw Error('backup.size');
    const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode('ircc-backup-v1')},await this.key(password,salt),data);
    return JSON.stringify({format:'ircc-encrypted-backup',version:1,kdf:'PBKDF2-SHA256',iterations:600000,cipher:'AES-256-GCM',salt:this.encode(salt),iv:this.encode(iv),data:this.encode(ciphertext)});
  },
  async decrypt(text,password){
    if(text.length>30*1024*1024)throw Error('backup.size');
    let outer;try{outer=JSON.parse(text);}catch{throw Error('backup.format');}
    if(outer.format!=='ircc-encrypted-backup'||outer.version!==1||outer.iterations!==600000||outer.kdf!=='PBKDF2-SHA256'||outer.cipher!=='AES-256-GCM')throw Error('backup.format');
    let decoded;
    try{const salt=this.decode(outer.salt),iv=this.decode(outer.iv);if(salt.length!==16||iv.length!==12)throw Error();decoded=await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode('ircc-backup-v1')},await this.key(password,salt),this.decode(outer.data));}catch{throw Error('backup.decrypt');}
    try{return this.clean(JSON.parse(new TextDecoder().decode(decoded)));}catch{throw Error('backup.format');}
  }
};

// Profile transfer and query export have distinct authenticated file types.
var DataTransferCore={
  profiles(input){
    if(input?.format!=='ircc-profiles'||input.version!==1)throw Error('backup.format');
    const clean=Backup.clean({format:'ircc-local-data',version:1,applications:input.applications});
    return {format:'ircc-profiles',version:1,applications:clean.applications};
  },
  merge(existing,incoming){
    const additions=this.profiles(incoming).applications,byId=new Map(existing.map(p=>[p.id,p]));
    for(const p of additions)byId.set(p.id,p);
    if(byId.size>100)throw Error('backup.format');
    return this.profiles({format:'ircc-profiles',version:1,applications:[...byId.values()]}).applications;
  },
  async seal(input,password,format){
    if(password.length<10||password.length>1024)throw Error('backup.password');
    const bytes=new TextEncoder().encode(JSON.stringify(input));if(bytes.length>20*1024*1024)throw Error('backup.size');
    const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
    const data=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(format+'-v1')},await Backup.key(password,salt),bytes);
    return JSON.stringify({format,version:1,kdf:'PBKDF2-SHA256',iterations:600000,cipher:'AES-256-GCM',salt:Backup.encode(salt),iv:Backup.encode(iv),data:Backup.encode(data)});
  },
  async open(text,password,format){
    if(text.length>30*1024*1024)throw Error('backup.size');
    let outer;try{outer=JSON.parse(text);}catch{throw Error('backup.format');}
    if(outer.format!==format||outer.version!==1||outer.iterations!==600000||outer.kdf!=='PBKDF2-SHA256'||outer.cipher!=='AES-256-GCM')throw Error('backup.format');
    try{const salt=Backup.decode(outer.salt),iv=Backup.decode(outer.iv);if(salt.length!==16||iv.length!==12)throw Error();const bytes=await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(format+'-v1')},await Backup.key(password,salt),Backup.decode(outer.data));return JSON.parse(new TextDecoder().decode(bytes));}catch{throw Error('backup.decrypt');}
  },
  async encryptProfiles(input,password){return this.seal(this.profiles(input),password,'ircc-encrypted-profiles');},
  async decryptProfiles(text,password){
    let outer;try{outer=JSON.parse(text);}catch{throw Error('backup.format');}
    if(outer.format==='ircc-encrypted-backup'){const old=await Backup.decrypt(text,password);return this.profiles({format:'ircc-profiles',version:1,applications:old.applications});}
    return this.profiles(await this.open(text,password,'ircc-encrypted-profiles'));
  },
  latestRaw(local,session,profileId){
    const profiles=local.applications||[],profile=profiles.find(p=>p.id===profileId);if(!profile)throw Error('transfer.profile');
    const candidates=Object.entries(session).filter(([key,s])=>key.startsWith('capture:')&&s&&ownsProfile(s,profile,profiles)).map(([,s])=>s);
    const stamp=s=>{const primary=Date.parse(s.startedAt||s.finishedAt||'');if(Number.isFinite(primary))return primary;return Math.max(0,...(s.responses||[]).map(r=>Date.parse(r.capturedAt)||0));};
    candidates.sort((a,b)=>stamp(b)-stamp(a)||(b.responses?.length||0)-(a.responses?.length||0));
    const latest=candidates[0];if(!latest||!latest.responses?.length)throw Error('transfer.empty');
    // Export response records only: no form profile, preferences, baselines or mailbox state.
    const responses=latest.responses.map(record=>{
      const safe={};for(const key of ['url','page','relationId','capturedAt','status','mimeType','json'])if(record[key]!==undefined)safe[key]=record[key];
      for(const key of ['url','page'])if(typeof safe[key]==='string')safe[key]=redactResponseUrl(safe[key]);
      return redactPrivateFields(safe);
    });
    return {format:'ircc-raw-query',version:1,exportedAt:new Date().toISOString(),profileId,query:{startedAt:latest.startedAt||null,finishedAt:latest.finishedAt||null,status:latest.status||'unknown',active:!!latest.active},responses};
  },
  async encryptRaw(input,password){if(input?.format!=='ircc-raw-query'||input.version!==1||!Array.isArray(input.responses))throw Error('backup.format');return this.seal(redactPrivateFields(input),password,'ircc-encrypted-query');},
  async decryptRaw(text,password){const data=await this.open(text,password,'ircc-encrypted-query');if(data?.format!=='ircc-raw-query'||data.version!==1||!Array.isArray(data.responses))throw Error('backup.format');return redactPrivateFields(data);}
};
