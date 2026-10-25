import { createAuthClient } from '@neondatabase/auth';
const authURL=import.meta.env.VITE_NEON_AUTH_URL;
const $=(id)=>document.getElementById(id);
const gate=$('authGate'),status=$('authStatus');
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
function hideGate(){gate?.classList.add('closed');$('authPassword').value='';sessionStorage.removeItem('acediaura_demo_entered')}
function showSignout(){
  if($('studentSignout'))return;
  const b=document.createElement('button');b.id='studentSignout';b.textContent='Sign out';b.className='btn alt';b.onclick=async()=>{try{await client.signOut();gate?.classList.remove('closed');b.remove();report('Signed out successfully.')}catch(e){report(e.message||'Sign out failed')}};
  document.querySelector('.nav')?.appendChild(b);
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
  if(session.data?.user){hideGate();showSignout()}
  else report('Please complete email verification if required, then sign in.');
 }catch(e){report('Could not sign in: '+(e.message||'network error'))}
};
if(client){client.getSession().then(s=>{if(s.data?.user){hideGate();showSignout()}}).catch(()=>report('Could not check your session.'))}
