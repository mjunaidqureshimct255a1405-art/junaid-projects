// Acediaura cloud profile client. Only cloud success is reported as saved.
let sessionToken = null;
const cloudStatus = (message) => {
  let node = document.getElementById('profileSaveStatus');
  if(!node && typeof tab!=='undefined' && tab==='profile'){const panel=document.getElementById('panel');if(panel){node=document.createElement('p');node.id='profileSaveStatus';node.className='notice';node.setAttribute('role','status');panel.appendChild(node)}}
  if(node) node.textContent = message;
};
async function fetchProfile() {
  if(!sessionToken) return;
  try {
    const r=await fetch('/api/profile',{headers:{Authorization:'Bearer '+sessionToken},cache:'no-store'});
    const j=await r.json();
    if(!r.ok){cloudStatus(j.error||'Cloud profile unavailable');return}
    if(j.profile){
      data.profile={name:j.profile.full_name||'',bio:j.profile.about||'',cgpa:j.profile.cgpa??'',history:j.profile.sgpa_history||'',photo:j.profile.photo_data||''};
      data.setup={...data.setup,college:j.profile.college||'',branch:j.profile.branch||'',sem:j.profile.current_semester||''};
      render();
      cloudStatus('Profile loaded from Neon cloud.');
    }else{data.profile={};render();cloudStatus('No cloud profile yet. Complete your details and save.')}
  }catch{cloudStatus('Cloud connection unavailable. Profile not synced.')}
}
window.acediauraSetCloudSession=async(token)=>{
  const nextToken=typeof token==='string'&&token.split('.').length===3?token:null;
  if(nextToken===sessionToken)return;
  sessionToken=nextToken;
  data.profile={}; render();
  if(sessionToken) await fetchProfile();
};
window.acediauraClearCloudSession=()=>{
  sessionToken=null; data=structuredClone(blank); render();
};
window.acediauraSaveProfile=async()=>{
  if(!sessionToken){cloudStatus('Please log in to save your profile securely.');return}
  const name=document.getElementById('name'),bio=document.getElementById('bio'),cgpa=document.getElementById('cgpa'),history=document.getElementById('history');
  if(!name||!bio){cloudStatus('Open My Profile before saving.');return}
  const payload={
    full_name:name.value.trim(),
    about:bio.value.trim(),
    cgpa:cgpa?.value||'',sgpa_history:history?.value||'',photo_data:data.profile.photo||'',
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
    data.profile={name:j.profile.full_name||'',bio:j.profile.about||'',cgpa:j.profile.cgpa??'',history:j.profile.sgpa_history||'',photo:j.profile.photo_data||''};
    render();
    const display=document.getElementById('bigName');if(display)display.textContent=data.profile.name||'Your name';
    const metric=document.querySelector('#profmetrics .profilemetric strong');if(metric)metric.textContent=data.profile.cgpa||'—';
    cloudStatus('✓ Saved to Neon cloud. Checking saved data…');
    await fetchProfile();
  }catch{cloudStatus('Cloud unavailable — profile was not saved.')}
};
// The legacy inline HTML reassigns saveProfile several times. Route the
// rendered button directly to the cloud handler instead of that global.
function attachCloudButton(){
 const profilePanel=document.getElementById('panel');
 if(!profilePanel||typeof tab==='undefined'||tab!=='profile')return;
 const button=profilePanel.querySelector('button[onclick="saveProfile()"], button[onclick="window.acediauraSaveProfile()"]');
 if(button){button.setAttribute('onclick','window.acediauraSaveProfile()');button.textContent='Save profile to cloud';}
 let clear=profilePanel.querySelector('#clearCloudProfile');
 if(button&&!clear){clear=document.createElement('button');clear.id='clearCloudProfile';clear.type='button';clear.className='btn alt';clear.textContent='Clear profile';clear.onclick=async()=>{if(!confirm('Clear your saved name, CGPA, bio, SGPA history and photo?'))return;const fields=['name','cgpa','history','bio'];fields.forEach(id=>{const el=document.getElementById(id);if(el)el.value=''});data.profile.photo='';await window.acediauraSaveProfile()};button.insertAdjacentElement('afterend',clear)}
 const notice=profilePanel.querySelector('.notice');
 if(notice&&notice.textContent.includes('Demo-only'))notice.textContent='Save your profile securely to your student account.';
}
const cloudObserver=new MutationObserver(()=>attachCloudButton());
const cloudPanel=document.getElementById('panel');
if(cloudPanel)cloudObserver.observe(cloudPanel,{childList:true,subtree:false});
attachCloudButton();

// Upload is account-specific; save the selected photo only when Save Profile is pressed.
window.upload=function(event){
 const file=event.target.files?.[0];if(!file)return;
 if(file.size>5*1024*1024){cloudStatus('Choose a photo under 5 MB');return}
 const image=new Image(),reader=new FileReader();
 reader.onload=()=>{image.onload=()=>{
 const scale=Math.min(1,640/Math.max(image.width,image.height));
 const canvas=document.createElement('canvas');canvas.width=Math.round(image.width*scale);canvas.height=Math.round(image.height*scale);
 canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
 data.profile.photo=canvas.toDataURL('image/jpeg',0.68);
 cloudStatus('New photo selected. Save profile to cloud to keep it.');
 };image.src=reader.result};reader.readAsDataURL(file);
};