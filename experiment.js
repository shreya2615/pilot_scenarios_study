/****************************************************
 * Pilot Scenarios Study (interleaved image + audio)
 * PRESENTATION TWEAKS ONLY:
 * - Centered welcome + instructions; bold key lines
 * - Preface (scenario-only) centered; bold scenario title
 * - Candidate pages header = "Scenario 1..4" (no Bio+Face/Audio label)
 *
 * CORE LOGIC:
 * - Each candidate shown on its own page
 * - Variant (1..3) fixed per participant across ALL stimuli
 * - Images: candidate↔face index randomized per scenario (1..3)
 * - Audio: FIXED mapping by scenario + candidate:
 *      A-scenarios → voices 1..3 (C1→1, C2→2, C3→3)
 *      B-scenarios → voices 4..6 (C1→4, C2→5, C3→6)
 * - Every participant sees all FOUR scenarios:
 *      • One CEO + One ECE as IMAGES
 *      • The other CEO + ECE as AUDIOS
 * - Deterministic, participant-balanced modality assignment
 * - Optional audio gating (must play full / min seconds / free)
 * - White background, black text
 ****************************************************/
/* global firebase, jsPsych, jsPsychHtmlKeyboardResponse, jsPsychSurveyLikert, jsPsychInstructions, jsPsychPreload */

/* ---------- Participant & variant ---------- */
const urlParams = new URLSearchParams(window.location.search);
const PARTICIPANT_ID = urlParams.get('PID') || `P${Math.floor(Math.random() * 1e9)}`;
function simpleHash(str){ let h=0; for(let i=0;i<str.length;i++){ h=((h<<5)-h)+str.charCodeAt(i); h|=0; } return Math.abs(h); }
const VARIANT = (simpleHash(PARTICIPANT_ID) % 3) + 1; // 1..3

/* ---------- Config ---------- */
const RANDOMIZE_DISPLAY_ORDER = true; // randomize candidate presentation order within each scenario

/* ---------- Audio presentation policy ---------- */
const AUDIO_PRESENTATION = {
  mode: 'must_play_full',  // 'must_play_full' | 'min_seconds' | 'free'
  minSeconds: 6,           // used when mode === 'min_seconds'
  blockSeeking: true,      // prevent skipping ahead
  showGateHint: true       // show a short hint until unlocked
};

/* ---------- Paths ---------- */
function facePath(gender, faceIndex, variant){
  const faceNum = String(faceIndex).padStart(2,'0'); // 1..3 → 01..03
  return `assets/faces/${gender}/face${faceNum}_var${variant}.png`;
}
function audioPath(gender, voiceIndex, variant){
  const voiceNum = String(voiceIndex).padStart(2,'0'); // 1..6 → 01..06
  return `assets/audios/${gender}/voice${voiceNum}_var${variant}.wav`;
}

/* ---------- Utils ---------- */
function shuffle(a){ const arr=[...a]; for(let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]];} return arr;}
function sampleOne(a){ return a[Math.floor(Math.random()*a.length)]; }

/* ---------- COMPACT CSS (applies ONLY when body has .compact-trial) ---------- */
(function injectCompactCssOnce(){
  if (document.getElementById('compact-trial-css')) return;
  const css = `
    body.compact-trial .candidate-block p { margin: 6px 0; line-height: 1.28; }
    body.compact-trial .candidate-block h3 { margin: 6px 0; line-height: 1.22; }
    body.compact-trial .candidate-block img { max-width: 220px; height: auto; margin: 4px 0; }
    body.compact-trial .candidate-block audio { width: 100%; max-width: 520px; margin: 4px 0; }

    /* Tighten likert spacing ONLY during candidate trials */
    body.compact-trial .jspsych-survey-likert-question { margin: 6px 0 !important; }
    body.compact-trial .jspsych-survey-likert-statement { margin-bottom: 6px !important; }
    body.compact-trial .jspsych-survey-likert-opts { margin: 4px 0 !important; }
    body.compact-trial .jspsych-btn { margin-top: 8px !important; }
  `;
  const el = document.createElement('style');
  el.id = 'compact-trial-css';
  el.textContent = css;
  document.head.appendChild(el);
})();

/* ---------- Content (edit as needed) ---------- */
const CEO_SCENARIOS = [
  {id:'CEO_A',title:'NovaLink',text:`NovaLink is a Canadian tech firm, with a team of 5000 employees, that builds smart software to help companies manage their supply chains. We’ve grown across North America and are now preparing to expand into Europe. At the same time, we’re dealing with a hostile takeover attempt from a U.S. competitor. We want to remain independent and grow internationally, without losing our focus or team stability. We are looking for a new CEO to help navigate these challenges and opportunities.`},
  {id:'CEO_B',title:'GreenPath',text:`GreenPath develops software to help other companies track and reduce their environmental impact in Canada and Europe. We’ve grown quickly to a team of 500, but that growth has created new pressures. We’ve fallen behind in updating our tools and platforms to keep up with new climate regulations, particularly in Europe.  Furthermore, our switch back from remote to in-office mode after the COVID lockdowns has left some staff dissatisfied and unheard. We now want to consolidate and focus on doing two things better: staying ahead of environmental standards and making GreenPath a more connected and desirable place to work. We are looking for a new CEO to help us achieve these goals.`}
];
const ECE_SCENARIOS = [
  {id:'ECE_A',title:'Little Steps Early Learning Centre',text:`Little Steps Early Learning Centre is a large, multi-centre daycare located in various parts of the Greater Toronto Area. Our downtown Toronto centre currently serves 45 children with a team of 8 dedicated staff members. Recently, the centre has been facing increasing challenges related to (i) staff adopting to new curriculum regulations and (ii) classroom management and disruptive behaviour. As a result, the centre is seeking an Early Childhood Educator (ECE) who can provide a firm lead to staff and navigate both staff and classroom conflict effectively.`},
  {id:'ECE_B',title:'Early Minds Academy',text:`Early Minds Academy is a large, multi-centre daycare located in various parts of the Greater Vancouver Area. Our downtown Vancouver centre currently serves 45 children with a team of 8 dedicated staff members. At this time, the centre is in the process of enhancing its program to align more closely with modern child-centered approaches that prioritize emotional development and interpersonal learning. As a result, the centre is seeking an Early Childhood Educator (ECE) who is warm, nurturing, and emotionally attuned and keeps abreast of recent research in child development. The ideal candidate will foster close relationships with children and families and bring new proven techniques to the classroom.`}
];

const BIOS = {
  CEO_A:[
    {id:'C1',name:'Richard',bio:'In my last role, I oversaw expansion of the company into Germany and the Netherlands. I speak German and have a network of contacts in both countries. Shortly after initiating the expansion, we were confronted by an aggressive takeover attempt. I worked directly with the board and our lawyers, investors, and regulators to fend off the aggression and safeguard shareholder value, while also keeping focus on our long-term corporate goals. I keep people calm and grounded when things heat up.'},
    {id:'C2',name:'Scott',bio:'I have successfully led the launch of software technology products in Europe as the vice president of a multinational company. I also helped set up our first offices and client networks in both Germany and Spain. I am fully conversant in German and French, and I know how to effectively navigate cultural and regulatory differences in various contexts. I’m excited about helping companies grow across borders and I like being the person who connects the dots between people and markets.'},
    {id:'C3',name:'John',bio:'I have successfully led corporate organizations through intense and challenging internal changes, including board turnover and investor turmoil, while helping the company maintain steady focus and consistently grow profits over time. I have also worked very closely with legal teams on contract disputes, negotiations, and restructuring plans. What I bring to the table is the ability to keep a company calm, collected, and focused while things shift around them.'}
  ],
  CEO_B:[
    {id:'C1',name:'Thomas',bio:'As vice president of a multinational green tech company, I led system updates in Germany and France to help clients comply with new EU climate regulations. Around the same time, COVID restrictions forced a shift to remote work, which caused isolation, low morale, and a loss of shared purpose. I implemented several initiatives to address these challenges, resulting in a 67% increase in retention and a 73% boost in job satisfaction over the next three years. To me, leadership means being steady, compassionate, empathetic, and mission-focused. I still bike to work and strive to live by the values we promote.'},
    {id:'C2',name:'James',bio:'I was appointed VP head of human resources while my current company was struggling with low morale and employee retention. My approach was to empathize and view the situation from the employee’s perspective. I initiated steps to make the employees feel heard at every level. This led to the opening of corporate daycare facilities and encouraging flexible hours. We also initiated regular company retreats to reinforce team cohesion. After three years our employee retention rate is 95% and corporate morale at an all-time high. I believe engaged, motivated employees are essential to long-term success and overall profitability.'},
    {id:'C3',name:'Brian',bio:'I have held leadership positions at the vice president level in both marketing and finance across several well-established multinational corporations. In my marketing role, we successfully increased U.S. market share by 12% over a two-year period under my direct leadership. In the finance position, I implemented strategic measures to reduce company debt and boost shareholder equity, which ultimately resulted in a 54% increase in our stock value. I consider myself a well-rounded, seasoned corporate executive with a strong track record of results who can position your organization for sustained growth and long-term profitability.'}
  ],
  ECE_A:[
    {id:'C1',name:'Jess',bio:'I have worked as a daycare supervisor in the city for the past five years, managing classroom dynamics, staff, and behavioural difficulties. When our center adopted a new play-based curriculum, I supported staff by facilitating planning sessions and sharing strategies that made the shift feel manageable and aligned with their teaching styles. As a supervisor I’ve also managed incidents between children involving disruptive behaviours during class time. By implementing firm and consistent expectations, I was able to prevent further outbursts.'},
    {id:'C2',name:'Mary',bio:'For the past three years, I have worked as a staff lead at a preschool where I take pride in fostering a positive team culture rooted in accountability, communication, and respect. This focus on team culture shaped how I support staff through change and new initiatives. As we adopted changes in the curriculum, I collaborated with staff to create simple templates and provide hands-on support. This helped reduce stress and misunderstanding and facilitated greater consistency across classrooms.'},
    {id:'C3',name:'Rebecca',bio:'I have three years of experience working as an educator at a learning centre in downtown Toronto. In that role, I guided children through daily activities to support their learning and development. I worked closely with children to build routines that encouraged engagement and confidence. For instance, I regularly led circle time activities, prompting children to participate in games and sing-alongs. Outside of work, I coach a youth soccer team and have received recognition for leading the most improved team.'}
  ],
  ECE_B:[
    {id:'C1',name:'Maya',bio:'For the past three years, I have worked at a preschool supporting a program focusing on children’s developmental milestones. I value the importance of clear communication, and I like to host a monthly ‘family morning’ where parents and children can join in on a circle time activity and parents chat informally about their child’s progress. Outside of work, I regularly take professional development courses that I can apply to my own role, as I strongly believe in the value of evidence-based educational strategies.'},
    {id:'C2',name:'Naomi',bio:'I have four years of experience working as a classroom assistant, helping implement learning activities and supporting daily routines. I make the effort to speak with parents informally during drop-off and pickup, and I appreciate how these interactions can help build trust over time. I’ve also volunteered at local community events, allowing me to collaborate with different age groups and support environments that bring people together. These are values I hope to bring into my work with children and their families.'},
    {id:'C3',name:'Julia',bio:'I spent the past two years working in toddler and preschool classrooms. In these roles, my main focus was helping to plan activities and maintain structured routines for the lead educators to follow. As an activity planner, I communicated effectively with lead educators to develop cohesive daily routines and have maintained contact with many of them even after my contract ended. I highly value continual growth and am always researching new activities that maximize children’s learning and healthy development.'}
  ]
};

/* ---------- Builder helpers ---------- */
const DELIM = '::';

// Image index assignment per scenario (candidate → 1..3), randomized
function assignIndicesToCandidates(candidates) {
  const indices = shuffle([1,2,3]);
  const mapping = {};
  candidates.forEach((cand, i) => { mapping[cand.id] = indices[i]; });
  return mapping;
}

// Audio index mapping fixed by scenario + candidate id
function audioIndexFor(scenarioId, candId){
  const isA = /_A$/.test(scenarioId); // true for CEO_A, ECE_A
  const base = isA ? 1 : 4;           // A→1..3, B→4..6
  const n = parseInt(String(candId).replace(/\D/g,''), 10); // C1→1, C2→2, C3→3
  return base + (n - 1);
}

// Build per-candidate trials (one page per candidate) for a given MODALITY: 'image' | 'audio'
// scenarioNumber labels pages as "Scenario 1..4"
function buildCandidateTrials(scenario, modality, scenarioNumber) {
  const isCEO = scenario.id.startsWith('CEO');
  const gender = isCEO ? 'male' : 'female';

  let bios = BIOS[scenario.id].map(b => ({...b}));
  if (RANDOMIZE_DISPLAY_ORDER) bios = shuffle(bios);

  // mapping used only for IMAGES
  const candToIdxImage = assignIndicesToCandidates(bios);

  const trials = bios.map((cand) => {
    const idx = (modality === 'image')
      ? candToIdxImage[cand.id]                   // randomized 1..3
      : audioIndexFor(scenario.id, cand.id);      // fixed 1..3 or 4..6

    // unique id for audio DOM hooks (for gating)
    const audioId = `aud_${scenario.id}_${cand.id}_${Date.now()}_${Math.floor(Math.random()*1e6)}`;

    let stimHTML = '';
    let loggedFile = '';
    let phase = '';

    if (modality === 'image') {
      const img = facePath(gender, idx, VARIANT);
      stimHTML = `<img src="${img}" alt="Candidate face" style="display:block;margin:4px auto;max-width:220px;height:auto;">`;
      loggedFile = img;
      phase = 'bio_plus_face';
    } else {
      const aud = audioPath(gender, idx, VARIANT);
      const controlsList = `controlsList="nodownload noplaybackrate"`;
      stimHTML = `<audio id="${audioId}" src="${aud}" controls preload="auto" ${controlsList} style="display:block;margin:4px auto;width:100%;max-width:520px;"></audio>`;
      loggedFile = aud;
      phase = 'bio_plus_audio';
    }

    const gateHint = (modality === 'audio' && AUDIO_PRESENTATION.showGateHint && AUDIO_PRESENTATION.mode !== 'free')
      ? `<p id="${audioId}_hint" style="margin:6px 0; font-size:0.95rem; opacity:0.8;">
           Please listen to the audio ${AUDIO_PRESENTATION.mode==='min_seconds' ? `for at least ${AUDIO_PRESENTATION.minSeconds} seconds` : 'until it finishes'} to enable the rating.
         </p>`
      : ``;

    const prompt = `
      <div class="candidate-block" style="text-align:center; max-width:900px; margin:0 auto;">
        <h3 style="margin:6px 0;"><b>Scenario ${scenarioNumber}</b></h3>
        <p style="margin:6px 0;">${scenario.text}</p>
        <div>${stimHTML}</div>
        <p style="margin:8px 0 6px 0;"><b>${cand.name}</b><br>${cand.bio}</p>
        <p style="margin:6px 0;"><b>How likely would you be to hire this candidate?</b> (1=Not at all, 7=Extremely likely)</p>
        ${gateHint}
      </div>
    `;

    return {
      type: jsPsychSurveyLikert,
      preamble: ``,
      questions: [{
        prompt,
        name: `${scenario.id}${DELIM}${modality}${DELIM}${cand.id}`,
        labels: ["1","2","3","4","5","6","7"],
        required: true
      }],
      button_label: 'Continue',

      /* Only candidate pages get compact layout */
      on_start: () => { document.body.classList.add('compact-trial'); },

      /* Gate audio playback if configured */
      on_load: () => {
        if (modality !== 'audio') return;
        if (AUDIO_PRESENTATION.mode === 'free') return;

        const audioEl = document.getElementById(audioId);
        const btn = document.querySelector('.jspsych-btn');
        const opts = document.querySelector('.jspsych-survey-likert-opts');
        if (!audioEl || !btn || !opts) return;

        const lockUI = () => {
          btn.disabled = true; btn.style.opacity = 0.5;
          opts.style.pointerEvents = 'none'; opts.style.opacity = 0.6;
        };
        const unlockUI = () => {
          btn.disabled = false; btn.style.opacity = 1;
          opts.style.pointerEvents = 'auto'; opts.style.opacity = 1;
          const hint = document.getElementById(`${audioId}_hint`);
          if (hint) hint.style.display = 'none';
        };

        lockUI();

        // Block seeking ahead (optional)
        let maxListened = 0;
        if (AUDIO_PRESENTATION.blockSeeking) {
          audioEl.addEventListener('timeupdate', () => {
            if (audioEl.currentTime > maxListened) maxListened = audioEl.currentTime;
          });
          audioEl.addEventListener('seeking', () => {
            const allowed = Math.max(maxListened + 0.25, 0);
            if (audioEl.currentTime > allowed) audioEl.currentTime = allowed;
          });
        }

        // Unlock criteria
        if (AUDIO_PRESENTATION.mode === 'must_play_full') {
          audioEl.addEventListener('ended', unlockUI, { once: true });
        } else if (AUDIO_PRESENTATION.mode === 'min_seconds') {
          const need = Math.max(0, Number(AUDIO_PRESENTATION.minSeconds) || 0);
          const onTU = () => {
            if (audioEl.currentTime >= need) {
              audioEl.removeEventListener('timeupdate', onTU);
              unlockUI();
            }
          };
          audioEl.addEventListener('timeupdate', onTU);
        }
      },

      data: {
        trial_type: phase,
        scenario_id: scenario.id,
        scenario_kind: isCEO ? 'CEO' : 'ECE',
        variant: VARIANT,
        participant_id: PARTICIPANT_ID,
        candidate_id: cand.id,
        stimulus_file: loggedFile,
        modality
      },
      on_finish: (data) => {
        // Remove compact class so other pages stay unchanged
        document.body.classList.remove('compact-trial');

        const resp = (data.response && typeof data.response === 'object')
          ? data.response
          : (data.responses ? JSON.parse(data.responses) : {});
        const key = Object.keys(resp)[0];
        const rating = Number(resp[key]) + 1; // 0..6 -> 1..7

        data.row_expanded = [{
          participant_id: PARTICIPANT_ID,
          scenario_id: scenario.id,
          scenario_kind: isCEO ? 'CEO' : 'ECE',
          phase,
          candidate_id: cand.id,
          variant: VARIANT,
          rating,
          face_file: (modality === 'image') ? loggedFile : '',
          audio_file: (modality === 'audio') ? loggedFile : '',
          modality
        }];
      }
    };
  });

  // Preface centered; scenario title bold (unchanged and not compact)
  const preface = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `<div style="text-align:center; max-width:900px; margin:0 auto;">
                 <h3><b>${scenario.title}</b></h3>
                 <p>${scenario.text}</p>
                 <p>Press <b>SPACE</b> to continue.</p>
               </div>`,
    choices: [' '],
    data:{trial_type:'preface',scenario_id:scenario.id,scenario_kind:isCEO?'CEO':'ECE',modality}
  };

  return [preface, ...trials];
}

/* ---------- Firebase Logging Setup ---------- */
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
            face_file: r.face_file || '',
            audio_file: r.audio_file || '',
            modality: r.modality || '',
            timestamp: new Date().toISOString()
          };
        });
        await db.ref().update(updates);
      }

      document.body.innerHTML = `
        <div style="text-align:center; max-width:900px; margin:48px auto;">
          <h2>All done!</h2>
          <p>Your responses have been securely logged, you may now close this window.</p>
        </div>
      `;
    } catch (err) {
      console.error("Firebase upload failed:", err);
      document.body.innerHTML = `
        <div style="text-align:center; max-width:900px; margin:48px auto;">
          <h2>All done!</h2>
          <p>Your responses could not be uploaded automatically, so they will download locally.</p>
        </div>
      `;
      jsPsych.data.get().localSave('csv', `backup_${PARTICIPANT_ID}.csv`);
    }
  }
});

/* ---------- Timeline ---------- */
const timeline=[];

// Welcome screen
timeline.push({
  type:jsPsychHtmlKeyboardResponse,
  stimulus: `
    <div style="text-align:center; max-width:900px; margin:48px auto;">
      <h2><b>Welcome to the experiment</b></h2>
      <p>Imagine you are a recruiter at NorthStar Talent Collective, you are in charge of hiring Chief Executive Officers and Early Childhood Educators for four different comapnies.</p>
      <p>Two companies are looking for a new <b>Chief Executive Officer (CEO)</b> and two companies are looking for a new <b>Early Childhood Educator (ECE)</b>.</p>
      <p>You will be presented with information about each company and three candidates applying for the position.</p>
      <p>Your job is to evaluate each candidate and indicate how likely you would be to hire them for the position.</p>
      <p>Press <b>SPACE</b> to begin.</p>
    </div>
  `,
  choices:[' ']
});

// Instructions
timeline.push({
  type:jsPsychInstructions,
  pages:[
    `<div style="text-align:center; max-width:900px; margin:48px auto;">
       <h3><b>Instructions</b></h3>
       <p>You will see <b>four different hiring scenarios</b>, each with three candidates. Each candidate will either be paired with an <b>image</b> of them or an <b>audio recording</b> of their application.</p>
       <p>Please pay close attention to the information provided for each candidate as you will need it to make your evaluations.</p>
       <p>For each scenario, rate <b>all three candidates</b> on a scale of 1 to 7, with <b>1</b> being <b>not at all likely to hire</b> and <b>7</b> being <b>very likely to hire</b>.</p>
       <p>Images or audios will be presented at random for each scenario.</p>
       <p>If you wish to stop at any point, please simply close the window and your responses will not be recorded.</p>
       <p>Please press <b>NEXT</b> to proceed.</p>
     </div>`
  ],
  show_clickable_nav:true
});

// All scenarios
const ALL_SCENARIOS = [
  ...CEO_SCENARIOS.map(s => ({...s, kind:'CEO'})),
  ...ECE_SCENARIOS.map(s => ({...s, kind:'ECE'}))
];

// Balanced modality assignment
// Randomized per participant (not seed-stable):
// - Exactly one CEO is IMAGE, one CEO is AUDIO
// - Exactly one ECE is IMAGE, one ECE is AUDIO

function pickModalityPair(ids) {
  const arr = shuffle([...ids]);   // randomize A/B order each run
  const m = {};
  m[arr[0]] = 'image';             // first gets image
  m[arr[1]] = 'audio';             // second gets audio
  return m;
}

const SCENARIO_MODALITY = {
  ...pickModalityPair(['CEO_A','CEO_B']),
  ...pickModalityPair(['ECE_A','ECE_B'])
};

// (Optional) sanity check:
// console.log('SCENARIO_MODALITY', SCENARIO_MODALITY);

// Random order of the 4 scenarios
const SCENARIO_ORDER = shuffle(ALL_SCENARIOS);

// Preload: images use 1..3; audio uses 1..3 for A, 4..6 for B
const preloadImages = [];
const preloadAudio = [];
SCENARIO_ORDER.forEach(scn=>{
  const gender = scn.kind === 'CEO' ? 'male' : 'female';
  const modality = SCENARIO_MODALITY[scn.id];
  if (modality === 'image') {
    // faces 1..3 (variant fixed)
    for(let i=1;i<=3;i++){ preloadImages.push(facePath(gender,i,VARIANT)); }
  } else {
    const isA = /_A$/.test(scn.id);
    const start = isA ? 1 : 4;
    const end = isA ? 3 : 6;
    for(let v=start; v<=end; v++){ preloadAudio.push(audioPath(gender,v,VARIANT)); }
  }
});
timeline.push({ type: jsPsychPreload, images: preloadImages, audio: preloadAudio });

// Build scenarios (candidate pages are compact; order randomized; audio mapping fixed)
SCENARIO_ORDER.forEach((scn, idx) => {
  const modality = SCENARIO_MODALITY[scn.id];
  timeline.push(...buildCandidateTrials(scn, modality, idx + 1));
});

// End screen
timeline.push({
  type:jsPsychHtmlKeyboardResponse,
  stimulus:`<div style="text-align:center; max-width:900px; margin:48px auto;">
              <h3>Thank you!</h3>
              <p>Press <b>SPACE</b> to finish.</p>
            </div>`,
  choices:[' ']
});

jsPsych.run(timeline);
