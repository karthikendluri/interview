// ─── State ───────────────────────────────────────────────────────────────────
let source = 'zoom';
let recording = false;
let recognition = null;
let currentAnswer = '';
let lastQuestion = '';
let sessionHistory = [];

// ─── Source selector ─────────────────────────────────────────────────────────
function setSource(s) {
  source = s;
  ['zoom', 'teams', 'mic'].forEach(id => {
    document.getElementById('btn-' + id).classList.toggle('active', id === s);
  });
}

// ─── Status bar ──────────────────────────────────────────────────────────────
function setStatus(msg, state) {
  document.getElementById('status-text').textContent = msg;
  const dot = document.getElementById('dot');
  dot.className = 'dot' + (state ? ' ' + state : '');
}

// ─── API Key ─────────────────────────────────────────────────────────────────
function saveKey() {
  const key = document.getElementById('api-key-input').value.trim();
  if (!key.startsWith('sk-ant-')) { showToast('Invalid key — must start with sk-ant-'); return; }
  localStorage.setItem('anthropic_api_key', key);
  showToast('API key saved locally ✓');
}

function getKey() {
  return localStorage.getItem('anthropic_api_key') || '';
}

// ─── Recording ───────────────────────────────────────────────────────────────
function toggleRecording() {
  if (recording) stopRecording();
  else startRecording();
}

function startRecording() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { runDemo(); return; }

  recognition = new SR();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  recognition.onstart = () => {
    recording = true;
    document.getElementById('mic-btn').classList.add('recording');
    document.getElementById('mic-icon').className = 'ti ti-player-stop';
    document.getElementById('mic-label').textContent = 'Listening… speak the question';
    setStatus('Capturing audio from ' + sourceName() + '…', 'listening');
    document.getElementById('transcript').innerHTML = '<span class="placeholder">Listening…</span>';
  };

  recognition.onresult = (e) => {
    let interim = '', final = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) final += e.results[i][0].transcript;
      else interim += e.results[i][0].transcript;
    }
    const txt = final || interim;
    if (txt) document.getElementById('transcript').textContent = txt;
    if (final) { lastQuestion = final; getAnswer(final); }
  };

  recognition.onerror = () => runDemo();
  recognition.onend   = () => resetMicUI();
  recognition.start();
}

function stopRecording() {
  if (recognition) recognition.stop();
  resetMicUI();
}

function resetMicUI() {
  recording = false;
  document.getElementById('mic-btn').classList.remove('recording');
  document.getElementById('mic-icon').className = 'ti ti-microphone';
  document.getElementById('mic-label').textContent = 'Tap to listen';
}

function sourceName() {
  return source === 'zoom' ? 'Zoom' : source === 'teams' ? 'Microsoft Teams' : 'Microphone';
}

// ─── AI Answer ────────────────────────────────────────────────────────────────
async function getAnswer(question) {
  const answerEl = document.getElementById('answer');
  answerEl.innerHTML = '<span class="spinner"></span> Generating answer…';
  setStatus('AI is thinking…', 'thinking');

  const apiKey = getKey();
  if (!apiKey) {
    answerEl.innerHTML = '<span class="placeholder">⚠️ Please enter your Anthropic API key below and click Save.</span>';
    setStatus('API key required', '');
    return;
  }

  const role = document.getElementById('profile-role').value.trim();
  const jd   = document.getElementById('profile-jd').value.trim();

  const systemPrompt = `You are an expert interview coach helping a senior data engineer ace their interview.
Profile: ${role || 'Senior Data Engineer — 13+ years, AWS, PySpark, Scala, Airflow, Kafka, Snowflake, dbt, Terraform, Palantir Foundry'}.
${jd ? 'Job context: ' + jd : ''}
When given an interview question, provide a concise, confident, STAR-method answer (2-3 short paragraphs max). Be specific, use relevant data engineering context, and sound natural and conversational. Never use bullet points — write flowing sentences.`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: 'user', content: `Interview question: "${question}"\n\nGive me a strong answer I can say out loud.` }]
      })
    });

    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    const text = data.content?.find(b => b.type === 'text')?.text || 'No answer generated.';
    currentAnswer = text;
    answerEl.textContent = text;
    setStatus('✓ Answer ready — from ' + sourceName(), 'ready');
    addToHistory(question, text);
  } catch (e) {
    answerEl.innerHTML = `<span class="placeholder">Error: ${e.message}</span>`;
    setStatus('Error generating answer', '');
  }
}

// ─── Demo mode ────────────────────────────────────────────────────────────────
function runDemo() {
  const demos = [
    'Tell me about a complex data pipeline you built.',
    'How do you handle data quality in your pipelines?',
    'Describe your experience with cloud data platforms.',
    'How do you approach real-time vs batch processing decisions?',
    'Walk me through how you would design a data warehouse from scratch.'
  ];
  const q = demos[Math.floor(Math.random() * demos.length)];
  document.getElementById('transcript').textContent = q;
  lastQuestion = q;
  resetMicUI();
  getAnswer(q);
}

// ─── History ──────────────────────────────────────────────────────────────────
function addToHistory(q, a) {
  sessionHistory.unshift({ q, a, src: sourceName() });
  const section = document.getElementById('history-section');
  const list    = document.getElementById('history-list');
  section.style.display = 'block';
  list.innerHTML = sessionHistory.slice(0, 6).map((item, i) => `
    <div class="history-item" onclick="loadHistory(${i})">
      <span class="tag ${item.src === 'Zoom' ? 'zoom' : item.src === 'Microsoft Teams' ? 'teams' : 'mic'}">${item.src}</span>
      <div class="h-q">${escHtml(item.q)}</div>
      <div class="h-a">${escHtml(item.a)}</div>
    </div>`).join('');
}

function loadHistory(i) {
  const item = sessionHistory[i];
  document.getElementById('transcript').textContent = item.q;
  document.getElementById('answer').textContent = item.a;
  currentAnswer = item.a;
  lastQuestion = item.q;
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ─── Utilities ────────────────────────────────────────────────────────────────
function copyAnswer() {
  if (!currentAnswer) { showToast('Nothing to copy yet'); return; }
  navigator.clipboard.writeText(currentAnswer).then(() => showToast('Answer copied ✓'));
}

function clearAll() {
  document.getElementById('transcript').innerHTML = '<span class="placeholder">Your interviewer\'s question will appear here…</span>';
  document.getElementById('answer').innerHTML    = '<span class="placeholder">Answer will be generated once a question is detected…</span>';
  currentAnswer = '';
  lastQuestion  = '';
  setStatus('Select a source and press the mic to begin', '');
}

function askFollowup() {
  const q = lastQuestion
    ? `Based on this interview question: "${lastQuestion}" — give me 3 follow-up questions I should be ready for and brief strong answers for each.`
    : 'Give me 5 tough senior data engineer interview questions with strong STAR-method answers for each.';
  window.open(`https://claude.ai/new?q=${encodeURIComponent(q)}`, '_blank');
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const saved = getKey();
  if (saved) document.getElementById('api-key-input').value = saved;
  setStatus('Select a source and press the mic to begin', '');
});
