// Credit-weighted academic scenario planner. Grade points are manually entered
// because universities use different conversion rules.
function plannerPanel(){
 if(typeof tab==='undefined'||tab!=='marks')return;
 const panel=document.getElementById('panel');
 if(!panel||panel.querySelector('#gradePlanner'))return;
 const setup=data.setup||{},grades=setup.gradePoints||{};
 const block=document.createElement('section');block.id='gradePlanner';block.className='glass pane';block.style.marginTop='20px';
 block.innerHTML='<h3>SGPA & CGPA Goal Planner</h3><p class="muted">Set expected grade points for each subject (0–10). Results are credit-weighted estimates, not official university grades.</p>'+
 '<div id="plannerRows"></div>'+
 '<div class="formgrid"><label class="field">Previous completed credits<input type="number" min="0" step=".5" id="plannerPreviousCredits" value="'+String(setup.previousCredits??'')+'" placeholder="e.g. 40"></label>'+
 '<label class="field">Current CGPA before this semester<input type="number" min="0" max="10" step=".01" id="plannerPreviousCGPA" value="'+String(setup.previousCGPA??'')+'" placeholder="e.g. 6.90"></label></div>'+
 '<div id="plannerResult" class="notice" role="status"></div><p><button class="btn" type="button" id="plannerSave">Save grade scenario to cloud</button></p>';
 panel.appendChild(block);
 const rows=block.querySelector('#plannerRows');
 const escText=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 rows.innerHTML=data.subjects.length?data.subjects.map(subject=>'<label class="field" style="margin:9px 0">'+escText(subject.name)+' · '+Number(subject.credits||0)+' credits<input class="plannerGrade" data-subject="'+escText(subject.id)+'" type="number" min="0" max="10" step=".1" value="'+escText(grades[subject.id]??'')+'" placeholder="Expected grade point 0–10"></label>').join(''):'<p class="muted">Add subjects and credits in Semester first.</p>';
 const calculate=()=>{
  let weighted=0,credits=0,count=0,invalid=false;
  block.querySelectorAll('.plannerGrade').forEach(input=>{
   if(input.value==='')return;
   const value=Number(input.value);if(!Number.isFinite(value)||value<0||value>10){invalid=true;return}
   const subject=data.subjects.find(x=>x.id===input.dataset.subject);const credit=Number(subject?.credits);
   if(!Number.isFinite(credit)||credit<=0)return;
   weighted+=value*credit;credits+=credit;count++;
  });
  const prevCredits=Number(block.querySelector('#plannerPreviousCredits').value);
  const prevCGPA=Number(block.querySelector('#plannerPreviousCGPA').value);
  const hasPrevious=block.querySelector('#plannerPreviousCredits').value!==''&&block.querySelector('#plannerPreviousCGPA').value!=='';
  const result=block.querySelector('#plannerResult');
  if(invalid||hasPrevious&&(prevCredits<0||prevCGPA<0||prevCGPA>10)){result.textContent='Enter valid grade points and CGPA from 0 to 10.';return}
  if(!credits){result.textContent='Enter at least one expected grade point for a subject with credits.';return}
  let message='Scenario SGPA: '+(weighted/credits).toFixed(2)+' / 10 · '+count+' subject(s) included · '+credits+' credits.';
  if(hasPrevious&&prevCredits+credits>0)message+=' Projected cumulative CGPA: '+((prevCGPA*prevCredits+weighted)/(prevCredits+credits)).toFixed(2)+'.';
  else message+=' Enter previous completed credits and previous CGPA to see a cumulative projection.';
  const missing=data.subjects.filter(x=>Number(x.credits)>0).length-count;
  if(missing>0)message+=' '+missing+' subject(s) not yet included; this is a partial estimate.';
  result.textContent=message;
 };
 block.addEventListener('input',calculate);
 block.querySelector('#plannerSave').onclick=()=>{
  const grades={};block.querySelectorAll('.plannerGrade').forEach(input=>{if(input.value!=='')grades[input.dataset.subject]=Number(input.value)});
  data.setup={...data.setup,gradePoints:grades,previousCredits:block.querySelector('#plannerPreviousCredits').value,previousCGPA:block.querySelector('#plannerPreviousCGPA').value};
  save();
 };
 calculate();
}
const plannerObserver=new MutationObserver(plannerPanel);
const target=document.getElementById('panel');
if(target)plannerObserver.observe(target,{childList:true});
plannerPanel();
