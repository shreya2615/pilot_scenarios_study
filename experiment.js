/****************************************************
 * Pilot Scenarios Study (Clean, stable face mapping)
 * - C1→face01, C2→face02, C3→face03 for everyone
 * - Variant (1..3) fixed per participant across all faces
 * - White background, black text
 ****************************************************/
/* global firebase, jsPsych, jsPsychHtmlKeyboardResponse, jsPsychSurveyLikert, jsPsychInstructions, jsPsychPreload */

/* ---------- Participant & variant ---------- */
const urlParams = new URLSearchParams(window.location.search);
const PARTICIPANT_ID = urlParams.get('PID') || `P${Math.floor(Math.random() * 1e9)}`;
function simpleHash(str){ let h=0; for(let i=0;i<str.length;i++){ h=((h<<5)-h)+str.charCodeAt(i); h|=0; } return Math.abs(h); }
const VARIANT = (simpleHash(PARTICIPANT_ID) % 3) + 1; // 1..3

/* ---------- Config ---------- */
// Change to true if you want to randomize the *display order* of candidates.
// The candidate→face mapping stays stable either way.
const RANDOMIZE_DISPLAY_ORDER = false;

/* ---------- Paths ---------- */
function facePath(gender, faceIndex, variant){
  const faceNum = String(faceIndex).padStart(2,'0'); // 1..3 → 01..03
  return `assets/faces/${gender}/face${faceNum}_var${variant}.png`;
}

/* ---------- Utils ---------- */
function shuffle(a){ const arr=[...a]; for(let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]];} return arr;}
function sampleOne(a){ return a[Math.floor(Math.random()*a.length)]; }

/* ---------- Content (edit as needed) ---------- */
const CEO_SCENARIOS = [
  {id:'CE_A',title:'CEO Scenario A',text:`Your firm is seeking a Chief Executive Officer to lead a large turnaround.`},
  {id:'CEO_B',title:'CEO Scenario B',text:`A successful tech company needs a new CEO to scale operations globally.`}
];
const ECE_SCENARIOS = [
  {id:'ECE_A',title:'ECE Scenario A',text:`Your childcare centre is hiring an Early Childhood Educator.`},
  {id:'ECE_B',title:'ECE Scenario B',text:`A community preschool seeks an ECE who can support inclusive classrooms.`}
];

const BIOS = {
  CEO_A:[
    {id:'C1',name:'Candidate 1',bio:'15 years in leadership; MBA; led restructurings.'},
    {id:'C2',name:'Candidate 2',bio:'Ex-COO; experience with investors and debt.'},
    {id:'C3',name:'Candidate 3',bio:'Founder background; strong product vision.'}
  ],
  CEO_B:[
    {id:'C1',name:'Candidate 1',bio:'Scaled engineering org; M&A experience.'},
    {id:'C2',name:'Candidate 2',bio:'Product-first leader; ex-CTO.'},
    {id:'C3',name:'Candidate 3',bio:'CFO turned CEO; investor relations experience.'}
  ],
  ECE_A:[
    {id:'C1',name:'Candidate 1',bio:'ECE diploma; 7 years classroom experience.'},
    {id:'C2',name:'Candidate 2',bio:'Inclusive practice; collaborates with specialists.'},
    {id:'C3',name:'Candidate 3',bio:'Family engagement focus; strong documentation.'}
  ],
  ECE_B:[
    {id:'C1',name:'Candidate 1',bio:'Montessori-trained; sensory activities.'},
    {id:'C2',name:'Candidate 2',bio:'Multi-lingual classroom experience.'},
    {id:'C3',name:'Candidate 3',bio:'Arts-based projects; community collaboration.'}
  ]
};

/* ---------- Builder helpers ---------- */
const DELIM = '::'; // safe separator for name keys

// Stable mapping helper: C1→1, C2→2, C3→3
function faceIndexForCandidateId(candId){
  const n = parseInt(String(candId).replace(/[^0-9]/g,''), 10);
  return (isFinite(n) && n>=1 && n<=3) ? n : 1;
}

function buildLikertQuestions(scenarioId, phaseType, gender){
  let bios = BIOS[scenarioId].map(b => ({...b}));
  if (RANDOMIZE_DISPLAY_ORDER) bios = shuffle(bios);

  const scale = ["1","2","3","4","5","6","7"];
  const questions = [];
  const faceFiles = [];

  bios.forEach((cand)=>{
    // Stable mapping: candidate ID determines face index
    const faceIdx = faceIndexForCandidateId(cand.id);
    const img = facePath(gender, faceIdx, VARIANT);

    let prompt='';
    if(phaseType==='bio'){
      prompt = `<p><b>${cand.name}</b><br>${cand.bio}</p>
                <p>How likely would you be to hire this candidate? (1=Not at all, 7=Extremely likely)</p>`;
    } else {
      faceFiles.push(img);
      prompt = `<p><img src="${img}" alt="Candidate face" width="220"></p>
                <p><b>${cand.name}</b><br>${cand.bio}</p>
                <p>How likely would you be to hire this candidate? (1=Not at all, 7=Extremely likely)</p>`;
    }

    questions.push({
      prompt,
      name:`${scenarioId}${DELIM}${phaseType}${DELIM}${cand.id}`,
      labels:scale,
      required:true
    });
  });

  return {questions,orderIds:bios.map(b=>b.id),faceFiles};
}

function buildScenario(scenario){
  const isCEO = scenario.id.startsWith('CEO');
  const gender = isCEO ? 'male' : 'female';

  const preface = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `<h3>${scenario.title}</h3><p>${scenario.text}</p><p>Press SPACE to continue.</p>`,
    choices: [' '],
    data:{trial_type:'preface',scenario_id:scenario.id,scenario_kind:isCEO?'CEO':'ECE'}
  };

  const bioQ = buildLikertQuestions(scenario.id,'bio',gender);
  const faceQ = buildLikertQuestions(scenario.id,'face',gender);

  const bioOnly = {
    type: jsPsychSurveyLikert,
    preamble:`<h3>${scenario.title} — Bio Only</h3><p>${scenario.text}</p>`,
    questions:bioQ.questions,
    button_label:'Continue',
    data:{trial_type:'bio_only',scenario_id:scenario.id,scenario_kind:isCEO?'CEO':'ECE',variant:VARIANT,participant_id:PARTICIPANT_ID},
    on_finish:(data)=>{
      const resp = (data.response && typeof data.response === 'object')
        ? data.response
        : (data.responses ? JSON.parse(data.responses) : {});
      const rows = [];
      Object.keys(resp).forEach(k=>{
        const rating = Number(resp[k]) + 1; // 0..6 -> 1..7
        const [scenarioId, phase, candId] = k.split(DELIM);
        rows.push({
          participant_id: PARTICIPANT_ID,
          scenario_id: scenarioId,
          scenario_kind: isCEO ? 'CEO' : 'ECE',
          phase: 'bio_only',
          candidate_id: candId,
          variant: VARIANT,
          rating,
          face_file: ''
        });
      });
      data.row_expanded = rows;
    }
  };

  const withFaces = {
    type: jsPsychSurveyLikert,
    preamble:`<h3>${scenario.title} — Bio + Face</h3><p>${scenario.text}</p>`,
    questions: faceQ.questions,
    button_label:'Continue',
    data:{trial_type:'bio_plus_face',scenario_id:scenario.id,scenario_kind:isCEO?'CEO':'ECE',variant:VARIANT,participant_id:PARTICIPANT_ID},
    on_finish:(data)=>{
      const resp = (data.response && typeof data.response === 'object')
        ? data.response
        : (data.responses ? JSON.parse(data.responses) : {});
      const rows = [];
      let i=0;
      Object.keys(resp).forEach(k=>{
        const rating = Number(resp[k]) + 1;
        const [scenarioId, phase, candId] = k.split(DELIM);
        rows.push({
          participant_id: PARTICIPANT_ID,
          scenario_id: scenarioId,
          scenario_kind: isCEO ? 'CEO' : 'ECE',
          phase: 'bio_plus_face',
          candidate_id: candId,
          variant: VARIANT,
          rating,
          face_file: faceQ.faceFiles[i] || ''
        });
        i++;
      });
      data.row_expanded = rows;
    }
  };

  return [preface, bioOnly, withFaces];
}

/* ---------- Firebase Logging Setup ---------- */
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBJyjpK1xMQ-ecPUhutv3ulYNHwGY4yolg",
  authDomain: "pilot-scenarios-study.firebaseapp.com",
  databaseURL: "https://pilot-scenarios-study-default-rtdb.firebaseio.com",
  projectId: "pilot-scenarios-study",
  storageBucket: "pilot-scenarios-study.firebasestorage.app",
  messagingSenderId: "163355880471",
  appId: "1:163355880471:web:cf065b691f494e482f4052",
  measurementId: "G-50KQJ9334C"
};

// Initialize Firebase (compat builds)
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.database();

/* ---------- jsPsych Init ---------- */
document.body.style.background='white';
document.body.style.color='black';
document.body.style.fontFamily='Arial, sans-serif';

const jsPsych = initJsPsych({
  display_element:'jspsych-target',
  override_safe_mode:true,
  on_finish: async () => {
    const flat = [];
    jsPsych.data.get().values().forEach(tr => {
      if (Array.isArray(tr.row_expanded)) {
        tr.row_expanded.forEach(r => flat.push(r));
      }
    });

    // --- FIREBASE SAVE ---
    try {
      if (flat.length === 0) {
        await db.ref('pilot_scenarios/' + PARTICIPANT_ID).set({
          participant_id: PARTICIPANT_ID,
          variant: VARIANT,
          completed: true,
          timestamp: new Date().toISOString()
        });
      } else {
        const updates = {};
        flat.forEach((r) => {
          const key = db.ref().child('pilot_scenarios').child(PARTICIPANT_ID).push().key;
          updates[`pilot_scenarios/${PARTICIPANT_ID}/${key}`] = {
            participant_id: r.participant_id,
            scenario_id: r.scenario_id,
            scenario_kind: r.scenario_kind,
            phase: r.phase,
            candidate_id: r.candidate_id,
            variant: r.variant,
            rating: r.rating,
            face_file: r.face_file,
            timestamp: new Date().toISOString()
          };
        });
        await db.ref().update(updates);
      }

      document.body.innerHTML = `
        <h2>All done!</h2>
        <p>Your responses have been securely logged to Firebase.</p>
      `;
    } catch (err) {
      console.error("Firebase upload failed:", err);
      document.body.innerHTML = `
        <h2>All done!</h2>
        <p>Your responses could not be uploaded automatically, so they will download locally.</p>
      `;
      jsPsych.data.get().localSave('csv', `backup_${PARTICIPANT_ID}.csv`);
    }
  }
});

/* ---------- Timeline ---------- */
const timeline=[];

timeline.push({
  type:jsPsychHtmlKeyboardResponse,
  stimulus:`<h2>Welcome</h2>
            <p>In this study, you will read job scenarios and rate candidates on a 1–7 scale.</p>
            <p>You will complete two scenarios: one CEO and one ECE.</p>
            <p>Press SPACE to begin.</p>`,
  choices:[' ']
});

timeline.push({
  type:jsPsychInstructions,
  pages:[
    `<h3>Instructions (1/2)</h3><p>For each scenario, rate three candidates on how likely you would be to hire them (1–7).</p>`,
    `<h3>Instructions (2/2)</h3><p>You will first rate bios only, then the same candidates with faces shown.</p>`
  ],
  show_clickable_nav:true
});

// Choose 1 CEO + 1 ECE in random order
const chosenCEO = sampleOne(CEO_SCENARIOS);
const chosenECE = sampleOne(ECE_SCENARIOS);
const SCENARIO_ORDER = shuffle([chosenCEO, chosenECE]);

// Preload 3 faces per scenario (variant fixed per participant)
const preloadImages = [];
SCENARIO_ORDER.forEach(scn=>{
  const gender = scn.id.startsWith('CEO') ? 'male' : 'female';
  for(let i=1;i<=3;i++){ preloadImages.push(facePath(gender,i,VARIANT)); }
});
timeline.push({ type: jsPsychPreload, images: preloadImages });

// Build each scenario
SCENARIO_ORDER.forEach(scn => timeline.push(...buildScenario(scn)));

timeline.push({
  type:jsPsychHtmlKeyboardResponse,
  stimulus:`<h3>Thank you!</h3><p>Press SPACE to finish.</p>`,
  choices:[' ']
});

jsPsych.run(timeline);
