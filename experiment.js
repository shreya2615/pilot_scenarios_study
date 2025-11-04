/****************************************************
 * Pilot Scenarios Study (interleaved image + audio)
 * FINAL PRESENTATION FIXES:
 * - No scrolling needed on any page
 * - Instructions: centered text; sticky nav; Next always visible
 * - Candidate pages: top-aligned, no scroll; smaller gap between Likert & button
 * - Preface and Welcome centered
 ****************************************************/
/* global firebase, jsPsych, initJsPsych, jsPsychHtmlKeyboardResponse, jsPsychSurveyLikert, jsPsychInstructions, jsPsychPreload */

/* ---------- Participant & variant ---------- */
const urlParams = new URLSearchParams(window.location.search);
const PARTICIPANT_ID = urlParams.get('PID') || `P${Math.floor(Math.random() * 1e9)}`;
function simpleHash(str){ let h=0; for(let i=0;i<str.length;i++){ h=((h<<5)-h)+str.charCodeAt(i); h|=0; } return Math.abs(h); }
const VARIANT = (simpleHash(PARTICIPANT_ID) % 3) + 1;

/* ---------- Config ---------- */
const RANDOMIZE_DISPLAY_ORDER = true;

/* ---------- Paths ---------- */
function facePath(gender, faceIndex, variant){
  const faceNum = String(faceIndex).padStart(2,'0');
  return `assets/faces/${gender}/face${faceNum}_var${variant}.png`;
}
function audioPath(gender, voiceIndex, variant){
  const voiceNum = String(voiceIndex).padStart(2,'0');
  return `assets/audios/${gender}/voice${voiceNum}_var${variant}.wav`;
}

/* ---------- Utils ---------- */
function shuffle(a){ const arr=[...a]; for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]];} return arr;}
function sampleOne(a){ return a[Math.floor(Math.random()*a.length)]; }

/* ---------- Global Style Injection ---------- */
(function injectStudyStyles(){
  const css = `
    body { background:white; color:black; font-family:Arial,sans-serif; }
    .jspsych-content { max-width:900px; }
    /* Instructions layout */
    .jspsych-instructions-content {
      display:flex; align-items:center; justify-content:center;
      min-height:calc(100vh - 100px);
      text-align:center;
    }
    .jspsych-instructions-nav {
      position:sticky; bottom:12px;
      display:flex; justify-content:center; gap:12px;
      background:white; padding:6px 0;
      border-top:1px solid #ddd;
    }
    /* Candidate trial layout tweaks */
    .jspsych-survey-likert-statement { margin-bottom:6px; }
    .jspsych-btn { margin-top:10px !important; }
    img { height:auto; max-width:220px; }
    audio { width:100%; max-width:520px; margin-top:8px; }
  `;
  const el = document.createElement('style');
  el.textContent = css;
  document.head.appendChild(el);
})();

/* ---------- Scenario Data ---------- */
const CEO_SCENARIOS = [
  {id:'CEO_A',title:'NovaLink',text:`NovaLink is a Canadian tech firm, with a team of 5000 employees, that builds smart software to help companies manage their supply chains. We’ve grown across North America and are now preparing to expand into Europe. At the same time, we’re dealing with a hostile takeover attempt from a U.S. competitor. We want to remain independent and grow internationally, without losing our focus or team stability. We are looking for a new CEO to help navigate these challenges and opportunities.`},
  {id:'CEO_B',title:'GreenPath',text:`GreenPath develops software to help other companies track and reduce their environmental impact in Canada and Europe. We’ve grown quickly to a team of 500, but that growth has created new pressures. We’ve fallen behind in updating our tools and platforms to keep up with new climate regulations, particularly in Europe. Furthermore, our switch back from remote to in-office mode after the COVID lockdowns has left some staff dissatisfied and unheard. We now want to consolidate and focus on doing two things better: staying ahead of environmental standards and making GreenPath a more connected and desirable place to work. We are looking for a new CEO to help us achieve these goals.`}
];
const ECE_SCENARIOS = [
  {id:'ECE_A',title:'Little Steps Early Learning Centre',text:`Little Steps Early Learning Centre is a large, multi-centre daycare located in various parts of the Greater Toronto Area. Our downtown Toronto centre currently serves 45 children with a team of 8 dedicated staff members. Recently, the centre has been facing increasing challenges related to (i) staff adopting to new curriculum regulations and (ii) classroom management and disruptive behaviour. As a result, the centre is seeking an Early Childhood Educator (ECE) who can provide a firm lead to staff and navigate both staff and classroom conflict effectively.`},
  {id:'ECE_B',title:'Early Minds Academy',text:`Early Minds Academy is a large, multi-centre daycare located in various parts of the Greater Vancouver Area. Our downtown Vancouver centre currently serves 45 children with a team of 8 dedicated staff members. At this time, the centre is in the process of enhancing its program to align more closely with modern child-centered approaches that prioritize emotional development and interpersonal learning. As a result, the centre is seeking an Early Childhood Educator (ECE) who is warm, nurturing, and emotionally attuned and keeps abreast of recent research in child development. The ideal candidate will foster close relationships with children and families and bring new proven techniques to the classroom.`}
];

/* ---------- BIOS (unchanged) ---------- */
const BIOS = { /* ... keep your same BIOS content here ... */ };

/* ---------- Builder helpers ---------- */
const DELIM = '::';
function assignIndicesToCandidates(candidates) {
  const idx = shuffle([1,2,3]); const m={};
  candidates.forEach((c,i)=>m[c.id]=idx[i]);
  return m;
}

function buildCandidateTrials(scenario, modality, scenarioNumber) {
  const isCEO = scenario.id.startsWith('CEO');
  const gender = isCEO ? 'male' : 'female';
  let bios = BIOS[scenario.id].map(b => ({...b}));
  if (RANDOMIZE_DISPLAY_ORDER) bios = shuffle(bios);
  const candToIdx = assignIndicesToCandidates(bios);

  const trials = bios.map((cand)=>{
    const idx = candToIdx[cand.id];
    let stimHTML='', loggedFile='', phase='';
    if(modality==='image'){ const img=facePath(gender,idx,VARIANT); stimHTML=`<img src="${img}" alt="Candidate face">`; loggedFile=img; phase='bio_plus_face'; }
    else{ const aud=audioPath(gender,idx,VARIANT); stimHTML=`<audio src="${aud}" controls preload="auto"></audio>`; loggedFile=aud; phase='bio_plus_audio'; }

    const html = `
      <div style="text-align:left; max-width:900px; margin:0 auto;">
        <h3><b>Scenario ${scenarioNumber}</b></h3>
        <p>${scenario.text}</p>
        <div style="margin-top:8px;">${stimHTML}</div>
        <p style="margin:10px 0 4px 0;"><b>${cand.name}</b><br>${cand.bio}</p>
        <p style="margin-top:4px;"><b>How likely would you be to hire this candidate?</b> (1=Not at all, 7=Extremely likely)</p>
      </div>`;

    return {
      type: jsPsychSurveyLikert,
      preamble:'',
      questions:[{prompt:html, name:`${scenario.id}${DELIM}${modality}${DELIM}${cand.id}`, labels:["1","2","3","4","5","6","7"], required:true}],
      button_label:'Continue',
      data:{trial_type:phase,scenario_id:scenario.id,scenario_kind:isCEO?'CEO':'ECE',variant:VARIANT,participant_id:PARTICIPANT_ID,candidate_id:cand.id,stimulus_file:loggedFile,modality},
      on_finish:data=>{
        const resp=(data.response && typeof data.response==='object')?data.response:(data.responses?JSON.parse(data.responses):{});
        const key=Object.keys(resp)[0]; const rating=Number(resp[key])+1;
        data.row_expanded=[{participant_id:PARTICIPANT_ID,scenario_id:scenario.id,scenario_kind:isCEO?'CEO':'ECE',phase,candidate_id:cand.id,variant:VARIANT,rating,face_file:(modality==='image')?loggedFile:'',audio_file:(modality==='audio')?loggedFile:'',modality}];
      }
    };
  });

  const preface = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus:`<div style="display:flex; align-items:center; justify-content:center; height:100vh; text-align:center;">
                <div style="max-width:900px;">
                  <h3><b>${scenario.title}</b></h3>
                  <p>${scenario.text}</p>
                  <p>Press <b>SPACE</b> to continue.</p>
                </div>
              </div>`,
    choices:[' '],
    data:{trial_type:'preface',scenario_id:scenario.id,scenario_kind:isCEO?'CEO':'ECE',modality}
  };

  return [preface, ...trials];
}

/* ---------- Firebase ---------- */
const firebaseConfig = {
  apiKey:"AIzaSyBJyjpK1xMQ-ecPUhutv3ulYNHwGY4yolg",
  authDomain:"pilot-scenarios-study.firebaseapp.com",
  databaseURL:"https://pilot-scenarios-study-default-rtdb.firebaseio.com",
  projectId:"pilot-scenarios-study",
  storageBucket:"pilot-scenarios-study.firebasestorage.app",
  messagingSenderId:"163355880471",
  appId:"1:163355880471:web:cf065b691f494e482f4052",
  measurementId:"G-50KQJ9334C"
};
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.database();

/* ---------- jsPsych Init ---------- */
const jsPsych = initJsPsych({
  display_element:'jspsych-target',
  override_safe_mode:true,
  on_finish: async ()=>{
    const flat=[]; jsPsych.data.get().values().forEach(tr=>{if(Array.isArray(tr.row_expanded)){tr.row_expanded.forEach(r=>flat.push(r));}});
    try{
      if(flat.length===0){
        await db.ref('pilot_scenarios/'+PARTICIPANT_ID).set({participant_id:PARTICIPANT_ID,variant:VARIANT,completed:true,timestamp:new Date().toISOString()});
      }else{
        const updates={};
        flat.forEach((r)=>{const key=db.ref().child('pilot_scenarios').child(PARTICIPANT_ID).push().key; updates[`pilot_scenarios/${PARTICIPANT_ID}/${key}`]={...r,timestamp:new Date().toISOString()};});
        await db.ref().update(updates);
      }
      document.body.innerHTML=`<div style="display:flex; align-items:center; justify-content:center; height:100vh; text-align:center;"><div><h2>All done!</h2><p>Your responses have been securely logged to Firebase.</p></div></div>`;
    }catch(err){
      console.error("Firebase upload failed:",err);
      document.body.innerHTML=`<div style="display:flex; align-items:center; justify-content:center; height:100vh; text-align:center;"><div><h2>All done!</h2><p>Your responses could not be uploaded automatically, so they will download locally.</p></div></div>`;
      jsPsych.data.get().localSave('csv',`backup_${PARTICIPANT_ID}.csv`);
    }
  }
});

/* ---------- Timeline ---------- */
const timeline=[];

timeline.push({
  type:jsPsychHtmlKeyboardResponse,
  stimulus:`<div style="display:flex; align-items:center; justify-content:center; height:100vh; text-align:center;"><div><h2><b>Welcome to the experiment</b></h2><p>In this study, you will be in charge of hiring two Chief Executive Officers for two different Canadian companies as well as two Early Childhood Educators for two different Canada-based childhood centers.</p><p><b>You will complete four scenarios</b> (two CEO and two ECE). For each scenario, each candidate appears on a separate page with their bio and either a face image or an audio recording.</p><p>Press <b>SPACE</b> to begin.</p></div></div>`,
  choices:[' ']
});

timeline.push({
  type:jsPsychInstructions,
  pages:[`<div class="jspsych-instructions-content"><div><h3><b>Instructions</b></h3><p>For each scenario, rate <b>all three candidates</b> on a scale from <b>1 (Not at all likely)</b> to <b>7 (Extremely likely)</b>.</p><p><b>Some scenarios present faces, others present audio voices.</b> Please consider the information provided with each candidate and respond honestly.</p><p>You can proceed using the on-screen button after each response.</p></div></div>`],
  show_clickable_nav:true
});

const ALL_SCENARIOS=[...CEO_SCENARIOS.map(s=>({...s,kind:'CEO'})),...ECE_SCENARIOS.map(s=>({...s,kind:'ECE'}))];
const modFlip = simpleHash(PARTICIPANT_ID)%2===1;
const SCENARIO_MODALITY={CEO_A:modFlip?'audio':'image',CEO_B:modFlip?'image':'audio',ECE_A:modFlip?'audio':'image',ECE_B:modFlip?'image':'audio'};
const SCENARIO_ORDER=shuffle(ALL_SCENARIOS);

const preloadImages=[], preloadAudio=[];
SCENARIO_ORDER.forEach(scn=>{
  const gender=scn.kind==='CEO'?'male':'female'; const modality=SCENARIO_MODALITY[scn.id];
  for(let i=1;i<=3;i++){ if(modality==='image') preloadImages.push(facePath(gender,i,VARIANT)); else preloadAudio.push(audioPath(gender,i,VARIANT)); }
});
timeline.push({type:jsPsychPreload,images:preloadImages,audio:preloadAudio});

SCENARIO_ORDER.forEach((scn,idx)=>{const modality=SCENARIO_MODALITY[scn.id]; timeline.push(...buildCandidateTrials(scn,modality,idx+1));});

timeline.push({
  type:jsPsychHtmlKeyboardResponse,
  stimulus:`<div style="display:flex; align-items:center; justify-content:center; height:100vh; text-align:center;"><div><h3>Thank you!</h3><p>Press <b>SPACE</b> to finish.</p></div></div>`,
  choices:[' ']
});

jsPsych.run(timeline);
