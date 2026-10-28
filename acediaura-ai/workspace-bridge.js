// Single cloud persistence path for academic workspace. Never silently pretend local storage is cloud.
let token=null, busy=false, pending=false, synced=false, inFlight=Promise.resolve();
const status=(message)=>{
 let node=document.getElementById('workspaceCloudStatus');
 if(!node){node=document.createElement('div');node.id='workspaceCloudStatus';node.className='notice';node.setAttribute('role','status');const host=document.querySelector('#workspace .sectionHead');host?.appendChild(node);}
 if(node)node.textContent=message;
};
async function call(method,content){
 const response=await fetch('/api/workspace',{method,cache:'no-store',headers:{Authorization:'Bearer '+token,...(method==='PUT'?{'Content-Type':'application/json'}:{})},...(method==='PUT'?{body:JSON.stringify({workspace:content})}:{})});
 let result;try{result=await response.json()}catch{throw Error('Server returned an invalid response ('+response.status+')')}
 if(!response.ok)throw Error(result.error||'Cloud '+response.status);
 return result;
}
window.acediauraRestoreWorkspace=async jwt=>{
 token=jwt;synced=false;
 status('Loading your secure academic workspace…');
 try{
  const result=await call('GET');
  if(result.workspace){
   const w=result.workspace;
   data={...structuredClone(blank),...w,profile:w.profile||{},setup:w.setup||{},subjects:Array.isArray(w.subjects)?w.subjects:[],topics:Array.isArray(w.topics)?w.topics:[],marks:Array.isArray(w.marks)?w.marks:[],sessions:Array.isArray(w.sessions)?w.sessions:[]};
  }else{
   // New account: never silently import someone else's legacy device-local data.
   data={...structuredClone(blank),profile:{}};
  }
  synced=true;render();status('Cloud workspace ready. All academic Save actions sync to your account.');
 }catch(e){status('Workspace not synced: '+e.message);synced=false;}
};
window.acediauraDisableWorkspace=()=>{token=null;synced=false;pending=false;status('Log in to sync your workspace.')};
window.acediauraSaveWorkspace=async()=>{
 if(!token||!synced){status('Not saved to cloud: '+(token?'cloud workspace unavailable':'please log in'));return false}
 if(busy){pending=true;return false}
 busy=true;
 try{
  const snapshot=structuredClone(data);
  inFlight=call('PUT',snapshot);
  await inFlight;
  status('✓ Academic workspace saved to your cloud account.');
  return true;
 }catch(e){status('Not saved to cloud: '+e.message);return false}
 finally{
  busy=false;
  if(pending){pending=false;void window.acediauraSaveWorkspace()}
 }
};

window.acediauraFlushWorkspaceSaves=async()=>{
  // Wait for the active write and any queued change, preserving its account identity.
  for(let i=0;i<4;i++){
    await inFlight.catch(()=>{});
    if(!busy&&!pending)break;
    await new Promise(resolve=>setTimeout(resolve,60));
  }
  return synced&&!busy&&!pending;
};
