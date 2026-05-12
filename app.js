// ── State ──────────────────────────────────────────────────────────────────
let source = 'zoom';
let recording = false;
let recognition = null;
let currentAnswer = '';
let lastQuestion = '';
let sessionHistory = [];

// ── Navigation ─────────────────────────────────────────────────────────────
function showSection(id, btn) {
  ['main','history','settings'].forEach(s => {
    document.getElementById('section-' + s).style.display = s === id ? 'flex' : 'none';
  });
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  if (btn) btn.classList.add('active');
}

// ── Source ─────────────────────────────────────────────────────────────────
function setSource(s) {
  source = s;
  ['zoom','teams','mic'].forEach(id => {
    document.getElementById('pill-' + id).classList.toggle('active', id === s);
  });
  const labels = { zoom: '● Zoom', teams: '● Teams', mic: '● Mic' };
  document.getElementById('source-chip').textContent = labels[s];
}

// ── Status ─────────────────────────────────────────────────────────────────
function setStatus(label, state) {
  document.getElementById('live-label').textContent = label;
  const dot = document.getElementById('live-dot');
  dot.className = 'live-dot' + (state ? ' ' + state : '');
}

// ── API Key ────────────────────────────────────────────────────────────────
function saveKey() {
  const val = document.getElementById('api-key-input').value.trim();
  if (!val.startsWith('sk-ant-')) { showToast('❌ Key must start with sk-ant-'); return; }
  localStorage.setItem('anthropic_api_key', val);
  document.getElementById('key-status').textContent = '✓ Saved successfully';
  showToast('API key saved');
}
function getKey() { return localStorage.getItem('anthropic_api_key') || ''; }

// ── Profile ────────────────────────────────────────────────────────────────
function saveProfile() {
  localStorage.setItem('profile_role', document.getElementById('profile-role').value);
  localStorage.setItem('profile_jd',   document.getElementById('profile-jd').value);
  showToast('Profile saved');
}

// ── Recording ──────────────────────────────────────────────────────────────
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
    document.getElementById('rings').classList.add('active');
    document.getElementById('mic-hint').textContent = 'Listening… speak now';
    document.getElementById('q-live').style.display = '';
    setMicIcon('stop');
    setStatus('Listening…', 'listening');
    document.getElementById('transcript').innerHTML = '<div class="thinking-row"><div class="spinner"></div>Listening…</div>';
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

  recognition.onerror = () => { stopRecordingUI(); runDemo(); };
  recognition.onend   = () => stopRecordingUI();
  recognition.start();
}

function stopRecording() {
  if (recognition) recognition.stop();
  stopRecordingUI();
}

function stopRecordingUI() {
  recording = false;
  document.getElementById('mic-btn').classList.remove('recording');
  document.getElementById('rings').classList.remove('active');
  document.getElementById('q-live').style.display = 'none';
  document.getElementById('mic-hint').textContent = 'Press to listen';
  setMicIcon('mic');
}

function setMicIcon(type) {
  const paths = {
    mic:  '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>'
  };
  document.getElementById('mic-svg').innerHTML = paths[type];
}

// ── AI Answer ──────────────────────────────────────────────────────────────
async function getAnswer(question) {
  const answerEl = document.getElementById('answer');
  answerEl.innerHTML = '<div class="thinking-row"><div class="spinner"></div>Generating answer…</div>';
  document.getElementById('copy-btn').style.display = 'none';
  setStatus('Thinking…', 'thinking');

  const apiKey = getKey();
  if (!apiKey) {
    answerEl.innerHTML = '<div class="empty-msg" style="color:#f59e0b">⚠️ Add your Anthropic API key in Settings first.</div>';
    setStatus('Key needed', '');
    return;
  }

  const role = localStorage.getItem('profile_role') || 'Senior Data Engineer — 13+ years, AWS, PySpark, Scala, Airflow, Kafka, Snowflake, dbt, Terraform, Palantir Foundry';
  const jd   = localStorage.getItem('profile_jd')   || '';

  const system = `You are an expert interview coach helping a senior data engineer ace their interview.
Profile: ${role}.${jd ? '\nJob context: ' + jd : ''}
When given an interview question, write a concise, confident STAR-method answer (2-3 paragraphs max). Be specific with data engineering context, sound natural and conversational. Never use bullet points — flowing sentences only.`;

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
        system,
        messages: [{ role: 'user', content: `Interview question: "${question}"\n\nGive me a strong spoken answer.` }]
      })
    });

    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    const text = data.content?.find(b => b.type === 'text')?.text || 'No answer generated.';
    currentAnswer = text;
    answerEl.textContent = text;
    document.getElementById('copy-btn').style.display = '';
    setStatus('Ready', 'ready');
    addHistory(question, text);
  } catch (e) {
    answerEl.innerHTML = `<div class="empty-msg" style="color:#ef4444">Error: ${e.message}</div>`;
    setStatus('Error', '');
  }
}

// ── Demo ───────────────────────────────────────────────────────────────────
function runDemo() {
  const demos = [
    'Tell me about a complex data pipeline you have built and the challenges you faced.',
    'How do you ensure data quality across your pipelines?',
    'Describe your experience designing a data warehouse architecture.',
    'How do you handle real-time vs batch processing tradeoffs?',
    'Walk me through how you would migrate a legacy ETL system to a modern cloud stack.'
  ];
  const q = demos[Math.floor(Math.random() * demos.length)];
  document.getElementById('transcript').textContent = q;
  lastQuestion = q;
  getAnswer(q);
}

// ── History ────────────────────────────────────────────────────────────────
function addHistory(q, a) {
  sessionHistory.unshift({ q, a, src: sourceName(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
  renderHistory();
  const badge = document.getElementById('history-badge');
  badge.style.display = '';
  badge.textContent = sessionHistory.length;
}

function renderHistory() {
  const list = document.getElementById('history-list');
  if (!sessionHistory.length) {
    list.innerHTML = `<div class="empty-history"><svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg><p>No session history yet.</p><span>Start the assistant to record Q&As here.</span></div>`;
    return;
  }
  list.innerHTML = sessionHistory.map((item, i) => `
    <div class="history-item" onclick="loadHistory(${i})">
      <div class="history-meta">
        <span class="history-tag ${item.src === 'Zoom' ? 'zoom' : item.src === 'Teams' ? 'teams' : 'mic'}">${item.src}</span>
        <span class="history-time">${item.time}</span>
      </div>
      <div class="history-q">${esc(item.q)}</div>
      <div class="history-a">${esc(item.a)}</div>
    </div>`).join('');
}

function loadHistory(i) {
  const item = sessionHistory[i];
  document.getElementById('transcript').textContent = item.q;
  document.getElementById('answer').textContent = item.a;
  currentAnswer = item.a;
  lastQuestion = item.q;
  document.getElementById('copy-btn').style.display = '';
  showSection('main', document.querySelector('[data-section="main"]'));
}

function clearHistory() {
  sessionHistory = [];
  document.getElementById('history-badge').style.display = 'none';
  renderHistory();
}

// ── Utilities ──────────────────────────────────────────────────────────────
function sourceName() {
  return source === 'zoom' ? 'Zoom' : source === 'teams' ? 'Teams' : 'Mic';
}

function copyAnswer() {
  if (!currentAnswer) return;
  navigator.clipboard.writeText(currentAnswer).then(() => showToast('✓ Answer copied'));
}

function clearAll() {
  document.getElementById('transcript').innerHTML = '<div class="empty-msg"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.25"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>Awaiting voice input…</div>';
  document.getElementById('answer').innerHTML = '<div class="empty-msg"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.25"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>Answer will appear here…</div>';
  document.getElementById('copy-btn').style.display = 'none';
  currentAnswer = ''; lastQuestion = '';
  setStatus('Idle', '');
}

function askFollowup() {
  const q = lastQuestion
    ? `Based on this interview question: "${lastQuestion}" — give me 3 follow-up questions I should prepare for, with strong brief answers for each.`
    : 'Give me 5 challenging senior data engineer interview questions with strong STAR-method answers.';
  window.open(`https://claude.ai/new?q=${encodeURIComponent(q)}`, '_blank');
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2600);
}

function esc(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Init ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const key  = getKey();
  const role = localStorage.getItem('profile_role') || '';
  const jd   = localStorage.getItem('profile_jd')   || '';
  if (key)  document.getElementById('api-key-input').value = key;
  if (role) document.getElementById('profile-role').value  = role;
  if (jd)   document.getElementById('profile-jd').value    = jd;
  if (key)  document.getElementById('key-status').textContent = '✓ Key loaded from storage';
  setStatus('Idle', '');
});
