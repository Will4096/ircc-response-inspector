function normalizeApplicationNumber(value){return String(value || '').replace(/\s+/g,'').toUpperCase();}
function ownsProfile(snapshot,profile,profiles=[]){
  if(!snapshot || !profile)return false;
  const actual=normalizeApplicationNumber(snapshot.application?.number);
  const expected=normalizeApplicationNumber(profile.applicationNumber);
  if(snapshot.profileId)return snapshot.profileId===profile.id && (!actual || actual===expected);
  if(!actual || !expected || actual!==expected)return false;
  const matches=profiles.filter(item=>normalizeApplicationNumber(item.applicationNumber)===actual);
  return matches.length===1 && matches[0].id===profile.id;
}
function emptyProfileCapture(profileId){return {schemaVersion:3,profileId,active:false,status:'idle',application:{},applicants:[],responses:[],errors:[]};}
