// Acediaura cloud profile client. Only cloud success is reported as saved.
let sessionToken = null;
let profileVersion = 0;
let profileSaveQueue = Promise.resolve();
const cloudStatus = (message) => {
  let node = document.getElementById('profileSaveStatus');
  if(!node && typeof tab!=='undefined' && tab==='profile'){const panel=document.getElementById('panel');if(panel){node=document.createElement('p');node.id='profileSaveStatus';node.className='notice';node.setAttribute('role','status');panel.appendChild(node)}}
  if(node) node.textContent = message;
  const feedback=document.getElementById('cloudProfileFeedback');if(feedback)feedback.textContent=message;
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
    }else{cloudStatus('No separate profile record found. Keeping your saved workspace profile.');}
  }catch{cloudStatus('Cloud connection unavailable. Profile not synced.')}
}
window.acediauraSetCloudSession=async(token)=>{
  const nextToken=typeof token==='string'&&token.split('.').length===3?token:null;
  if(nextToken===sessionToken)return;
  sessionToken=nextToken;
  if(sessionToken){
    await window.acediauraRestoreWorkspace?.(sessionToken);
    const restored=data.profile||{};
    const hasSavedProfile=Object.values(restored).some(value=>value!==null&&value!==undefined&&String(value).trim()!=='');
    if(!hasSavedProfile)await fetchProfile();
  }
};
window.acediauraClearCloudSession=()=>{
  sessionToken=null;window.acediauraDisableWorkspace?.();data=structuredClone(blank); render();
};
window.acediauraSaveProfile=async()=>{
  if(window.acediauraIsRecoveryMode?.()){cloudStatus('Recovery mode: saving disabled to protect previous records.');return false}
  const name=document.getElementById('name'),bio=document.getElementById('bio'),cgpa=document.getElementById('cgpa'),history=document.getElementById('history');
  if(!name||!bio){cloudStatus('Open My Profile before saving.');return false}
  const next={name:name.value.trim(),bio:bio.value.trim(),cgpa:cgpa?.value||'',history:history?.value||'',photo:data.profile.photo||''};
  if(next.cgpa&&(Number(next.cgpa)<0||Number(next.cgpa)>10)){cloudStatus('CGPA must be between 0 and 10.');return false}
  if(next.history&&next.history.split(',').some(v=>v.trim()===''||!Number.isFinite(Number(v))||Number(v)<0||Number(v)>10)){cloudStatus('Enter SGPAs between 0 and 10, comma separated.');return false}
  const version=++profileVersion;
  data.profile={...data.profile,...next};
  render(); // Instant UI: network never blocks rendering.
  if(!sessionToken){cloudStatus('Displayed locally, but not saved: please sign in.');return false}
  const tokenAtSave=sessionToken;
  const payload={
    full_name:next.name,about:next.bio,cgpa:next.cgpa,sgpa_history:next.history,photo_data:next.photo,
    college:String(data.setup.college||''),branch:String(data.setup.branch||''),current_semester:Number(data.setup.sem)||null
  };
  cloudStatus('Updated instantly · syncing to cloud…');
  const operation=async()=>{
    try{
      const r=await fetch('/api/profile',{method:'PUT',headers:{'Content-Type':'application/json',Authorization:'Bearer '+tokenAtSave},body:JSON.stringify(payload)});
      const j=await r.json();
      if(!r.ok)throw Error('Cloud save failed ('+r.status+'): '+(j.error||'Unknown error'));
      // Do not report success until the complete workspace has also been stored.
      const workspaceSaved=tokenAtSave===sessionToken?await window.acediauraSaveWorkspace?.():false;
      if(tokenAtSave===sessionToken&&version===profileVersion){
        cloudStatus(workspaceSaved?'✓ Profile and progress saved to cloud.':'Profile saved, but workspace sync failed. Check the workspace status.');
      }
      return workspaceSaved===true;
    }catch(error){
      if(tokenAtSave===sessionToken&&version===profileVersion)cloudStatus('Displayed, but NOT cloud-saved: '+error.message);
      return false;
    }
  };
  // Serialize requests so a slow earlier response cannot overwrite newer changes.
  profileSaveQueue=profileSaveQueue.then(operation,operation);
  return profileSaveQueue;
};
window.acediauraFlushProfileSaves=()=>profileSaveQueue;
// The legacy inline HTML reassigns saveProfile several times. Route the
// rendered button directly to the cloud handler instead of that global.
function attachCloudButton(){
 const profilePanel=document.getElementById('panel');
 if(!profilePanel||typeof tab==='undefined'||tab!=='profile')return;
 const button=profilePanel.querySelector('button[onclick="saveProfile()"], button[onclick="window.acediauraSaveProfile()"]');
 if(button){button.setAttribute('onclick','window.acediauraSaveProfile()');button.textContent='Save profile to cloud';}
 if(button&&!profilePanel.querySelector('#cloudProfileFeedback')){const note=document.createElement('p');note.id='cloudProfileFeedback';note.setAttribute('role','status');note.className='notice';note.textContent=sessionToken?'Edit details and save to cloud.':'Sign in to save your profile.';button.parentNode.insertAdjacentElement('afterend',note)}
 const nameInput=profilePanel.querySelector('#name'),cgpaInput=profilePanel.querySelector('#cgpa'),historyInput=profilePanel.querySelector('#history');
 if(historyInput&&!historyInput.dataset.liveChart){
   historyInput.dataset.liveChart='1';
   historyInput.addEventListener('input',()=>{
     const raw=historyInput.value.trim();
     const parts=raw?raw.split(/[,;\n]+/).map(v=>v.trim()).filter(Boolean):[];
     const valid=parts.every(v=>Number.isFinite(Number(v))&&Number(v)>=0&&Number(v)<=10);
     const values=valid?parts.map(Number):[];
     const chart=document.getElementById('profchart');
     const overview=document.getElementById('chart');
     if(chart)chart.innerHTML=values.length?values.map((v,i)=>'<div style="height:'+Math.max(v*10,2)+'%"><b>'+v.toFixed(2)+'</b><small>S'+(i+1)+'</small></div>').join(''):'<p class="muted">'+(valid?'Enter previous semester SGPAs to see your graph.':'Use SGPA values between 0 and 10, separated by commas.')+'</p>';
     if(overview)overview.innerHTML=values.length?values.map((v,i)=>'<div class="bar" style="height:'+Math.max(v*10,2)+'%"><span>'+v.toFixed(2)+'</span><label>S'+(i+1)+'</label></div>').join(''):'';
     cloudStatus(valid?'Graph preview updated instantly. Save profile to keep it.':'Invalid SGPA entry. Use values from 0 to 10.');
   });
 }

 if(nameInput&&!nameInput.dataset.livePreview){nameInput.dataset.livePreview='1';nameInput.addEventListener('input',()=>{const name=document.getElementById('bigName');if(name)name.textContent=nameInput.value.trim()||'Your name';const heading=document.getElementById('profileText');if(heading)heading.textContent=nameInput.value.trim()||'Your name, your academic story.';cloudStatus('Preview only — press Save profile to cloud to persist changes.')})}
 if(cgpaInput&&!cgpaInput.dataset.livePreview){cgpaInput.dataset.livePreview='1';cgpaInput.addEventListener('input',()=>{const metric=document.querySelector('#profmetrics .profilemetric strong');if(metric)metric.textContent=cgpaInput.value||'—';cloudStatus('Preview only — press Save profile to cloud to persist changes.')})}
 let clear=profilePanel.querySelector('#clearCloudProfile');
 if(button&&!clear){clear=document.createElement('button');clear.id='clearCloudProfile';clear.type='button';clear.className='btn alt';clear.textContent='Clear profile';clear.onclick=()=>{if(!confirm('Clear your saved name, CGPA, bio, SGPA history and photo?'))return;const fields=['name','cgpa','history','bio'];fields.forEach(id=>{const el=document.getElementById(id);if(el)el.value=''});data.profile.photo='';void window.acediauraSaveProfile()};button.insertAdjacentElement('afterend',clear)}
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
 const picture=document.getElementById('avatar'),large=document.getElementById('bigAvatar');
 if(picture)picture.src=data.profile.photo;if(large)large.src=data.profile.photo;
 cloudStatus('Photo displayed instantly · press Save profile to sync it.');
 };image.src=reader.result};reader.readAsDataURL(file);
};