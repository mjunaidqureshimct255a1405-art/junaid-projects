// Acediaura cloud profile client. Only cloud success is reported as saved.
let sessionToken = null;
const cloudStatus = (message) => {
  const node = document.getElementById('profileSaveStatus');
  if(node) node.textContent = message;
};
async function fetchProfile() {
  if(!sessionToken) return;
  try {
    const r=await fetch('/api/profile',{headers:{Authorization:'Bearer '+sessionToken},cache:'no-store'});
    const j=await r.json();
    if(!r.ok){cloudStatus(j.error||'Cloud profile unavailable');return}
    if(j.profile){
      data.profile={...data.profile,name:j.profile.full_name||'',bio:j.profile.about||''};
      data.setup={...data.setup,college:j.profile.college||'',branch:j.profile.branch||'',sem:j.profile.current_semester||''};
      render();
      cloudStatus('Profile loaded from Neon cloud.');
    }else{cloudStatus('No cloud profile yet. Complete your details and save.')}
  }catch{cloudStatus('Cloud connection unavailable. Profile not synced.')}
}
window.acediauraSetCloudSession=async(token)=>{
  sessionToken=typeof token==='string'&&token.length>50?token:null;
  if(sessionToken) await fetchProfile();
};
window.acediauraClearCloudSession=()=>{
  sessionToken=null; data=structuredClone(blank); render();
};
window.acediauraSaveProfile=async()=>{
  if(!sessionToken){cloudStatus('Please log in to save your profile securely.');return}
  const name=document.getElementById('name'),bio=document.getElementById('bio');
  if(!name||!bio){cloudStatus('Open My Profile before saving.');return}
  const payload={
    full_name:name.value.trim(),
    about:bio.value.trim(),
    college:String(data.setup.college||''),
    branch:String(data.setup.branch||''),
    current_semester:Number(data.setup.sem)||null
  };
  cloudStatus('Saving profile to Neon…');
  try {
    const r=await fetch('/api/profile',{
      method:'PUT',
      headers:{'Content-Type':'application/json',Authorization:'Bearer '+sessionToken},
      body:JSON.stringify(payload)
    });
    const j=await r.json();
    if(!r.ok){cloudStatus('Not saved: '+(j.error||'cloud error'));return}
    data.profile={...data.profile,name:j.profile.full_name,bio:j.profile.about};
    render();cloudStatus('✓ Profile saved to Neon cloud.');
  }catch{cloudStatus('Cloud unavailable — profile was not saved.')}
};
// The legacy inline HTML reassigns saveProfile several times. Route the
// rendered button directly to the cloud handler instead of that global.
function attachCloudButton(){
 const profilePanel=document.getElementById('panel');
 if(!profilePanel||typeof tab==='undefined'||tab!=='profile')return;
 const button=profilePanel.querySelector('button[onclick="saveProfile()"]');
 if(button){button.setAttribute('onclick','window.acediauraSaveProfile()');button.textContent='Save profile to cloud';}
 const notice=profilePanel.querySelector('.notice');
 if(notice&&notice.textContent.includes('Demo-only'))notice.textContent='Save your profile securely to your student account.';
}
const cloudObserver=new MutationObserver(()=>attachCloudButton());
const cloudPanel=document.getElementById('panel');
if(cloudPanel)cloudObserver.observe(cloudPanel,{childList:true,subtree:false});
attachCloudButton();
