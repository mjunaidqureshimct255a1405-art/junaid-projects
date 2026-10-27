import './cloud-profile.js';
import { createAuthClient } from '@neondatabase/auth';
const authURL=import.meta.env.VITE_NEON_AUTH_URL;
const $=(id)=>document.getElementById(id);
const gate=$('authGate'),status=$('authStatus');
// Legacy demo access must not hide the real login screen on future visits.
sessionStorage.removeItem('acediaura_demo_entered');
gate?.classList.remove('closed');
let client;
function report(message){if(status) status.textContent=message}
if(authURL && /^https:\/\//.test(authURL)){client=createAuthClient(authURL)} else {report('Student accounts are not configured yet. You can explore the demo.')}
const nameWrapper=document.createElement('label');
nameWrapper.className='field';nameWrapper.id='studentSignupName';nameWrapper.style.display='none';
nameWrapper.textContent='Full name';
const inp=document.createElement('input');inp.id='studentName';inp.placeholder='Your full name';inp.autocomplete='name';nameWrapper.appendChild(inp);
$('authEmail')?.closest('label')?.before(nameWrapper);
const previousMode=window.authMode;
window.authMode=function(mode){previousMode?.(mode);nameWrapper.style.display=mode==='signup'?'flex':'none'};
async function getCloudToken(){
  if(typeof client.token==='function'){
    const response=await client.token();
    const token=response?.data?.token||response?.token;
    if(typeof token==='string'&&token.split('.').length===3)return token;
  }
  if(typeof client.getJWTToken==='function'){
    const token=await client.getJWTToken();
    if(typeof token==='string'&&token.split('.').length===3)return token;
  }
  return null;
}
function hideGate(){gate?.classList.add('closed');$('authPassword').value='';sessionStorage.removeItem('acediaura_demo_entered')}
function showSignout(){
 const b=$('studentSignout');
 if(!b)return;
 b.style.display='inline-flex';
 b.onclick=async()=>{
   b.disabled=true;b.textContent='Signing out…';
   try{
     const result=await client.signOut();
     if(result?.error)throw new Error(result.error.message||'Sign out failed');
     b.style.display='none';b.textContent='Log out';
     window.acediauraClearCloudSession?.();
     $('authEmail').value='';$('authPassword').value='';inp.value='';
     gate?.classList.remove('closed');window.authMode('login');
     report('Signed out successfully.');
   }catch(e){report(e.message||'Sign out failed');b.textContent='Log out'}
   finally{b.disabled=false}
 };
}

window.authSubmit=async()=>{
 if(!client){report('Account service is not connected.');return}
 const email=$('authEmail')?.value.trim(),password=$('authPassword')?.value||'';
 const name=inp.value.trim(),signUp=document.getElementById('authTabSignup')?.classList.contains('on');
 if(!email||!password||signUp&&!name){report('Fill in all required fields.');return}
 report('Checking your account…');
 try{
  const answer=signUp?await client.signUp.email({name,email,password}):await client.signIn.email({email,password});
  $('authPassword').value='';
  if(answer.error){report(answer.error.message||'Authentication was unsuccessful.');return}
  const session=await client.getSession();
  if(session.data?.user){hideGate();showSignout();const jwt=await getCloudToken();await window.acediauraSetCloudSession?.(jwt);if(!jwt)report('Logged in. Profile cloud token unavailable.')}
  else {report(signUp?'Account created. Please select Log in and sign in to activate your session.':'Login request completed, but no active session was found. Check email verification and browser cookie settings.'); if(signUp) window.authMode('login')}
 }catch(e){report('Could not sign in: '+(e.message||'network error'))}
};

async function restoreSession(){
 if(!client)return;
 try{
  const result=await client.getSession();
  if(result.data?.user){
   hideGate();showSignout();
   try{
    const token=await getCloudToken();
    if(token) await window.acediauraSetCloudSession?.(token);
    else report('Signed in, but cloud token unavailable. Please refresh or sign in again.');
   }catch(e){report('Signed in, but cloud syncing is unavailable.')}
  }else{
   gate?.classList.remove('closed');
   const logout=$('studentSignout');if(logout)logout.style.display='none';
   if(result.error)report('Session could not be restored: '+result.error.message);
  }
 }catch(e){
  gate?.classList.remove('closed');
  report('Session check failed. Browser cookies may be restricted. Sign in again.');
 }
}
if(client){
 restoreSession();
 window.addEventListener('pageshow',event=>{if(event.persisted)restoreSession()});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)restoreSession()});
}
