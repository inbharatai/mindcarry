import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { CameraObserver } from './components/CameraObserver';
import { ProgressRing } from './components/ProgressRing';
import { listenOnce, speak } from './lib/speech';

type Screen = 'home' | 'create' | 'unlock' | 'dashboard' | 'lesson' | 'settings';

const consentDefaults = {
  microphoneAllowed: true,
  cameraAllowed: false,
  localBehaviourAnalysisAllowed: false,
  transcriptStorageAllowed: true,
  rawAudioStorageAllowed: false,
  rawVideoStorageAllowed: false,
};

function errorText(error: unknown) {
  return error instanceof Error ? error.message : String(error || 'Something went wrong.');
}

function when(value?: string) {
  if (!value) return 'Not yet';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [status, setStatus] = useState<AppStatus | null>(null);
  const [learners, setLearners] = useState<LearnerManifest[]>([]);
  const [selected, setSelected] = useState<LearnerManifest | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    const [appStatus, learnerList] = await Promise.all([
      window.mindcarry.app.status(),
      window.mindcarry.learners.list(),
    ]);
    setStatus(appStatus);
    setLearners(learnerList);
  }, []);

  useEffect(() => {
    refresh().catch((reason) => setError(errorText(reason)));
  }, [refresh]);

  async function run<T>(task: () => Promise<T>): Promise<T | undefined> {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      return await task();
    } catch (reason) {
      setError(errorText(reason));
      return undefined;
    } finally {
      setBusy(false);
    }
  }

  async function openLearner(learner: LearnerManifest, passphrase: string) {
    const data = await run(() => window.mindcarry.learners.unlock(learner.learnerId, passphrase));
    if (!data) return;
    setSelected(learner);
    setDashboard(data);
    setScreen('dashboard');
  }

  async function closeLearner() {
    if (selected) await window.mindcarry.learners.lock(selected.learnerId).catch(() => undefined);
    setSelected(null);
    setDashboard(null);
    setScreen('home');
    await refresh().catch(() => undefined);
  }

  let page;
  if (screen === 'create') {
    page = <CreateLearner busy={busy} onCancel={() => setScreen('home')} onCreate={async (payload) => {
      const learner = await run(() => window.mindcarry.learners.create(payload));
      if (learner) {
        setMessage(`${learner.preferredName}'s encrypted Learner Memory was created.`);
        await refresh();
        setScreen('home');
      }
    }} />;
  } else if (screen === 'unlock' && selected) {
    page = <Unlock learner={selected} busy={busy} onBack={() => setScreen('home')} onUnlock={(passphrase) => openLearner(selected, passphrase)} />;
  } else if (screen === 'settings') {
    page = <Settings status={status} busy={busy} run={run} onBack={() => setScreen(selected ? 'dashboard' : 'home')} onChanged={async (text) => { setMessage(text); await refresh(); }} />;
  } else if (screen === 'lesson' && selected && dashboard) {
    page = <Lesson learner={selected} dashboard={dashboard} onDone={async (updated) => {
      const latest = updated || await run(() => window.mindcarry.learners.dashboard(selected.learnerId));
      if (latest) setDashboard(latest);
      setScreen('dashboard');
    }} />;
  } else if (screen === 'dashboard' && selected && dashboard) {
    page = <DashboardPage learner={selected} dashboard={dashboard} status={status} onLesson={() => setScreen('lesson')} onSettings={() => setScreen('settings')} onLock={closeLearner} onExport={async () => {
      const result = await run(() => window.mindcarry.learners.export(selected.learnerId));
      if (result && !result.canceled) setMessage(`Encrypted memory saved to ${result.filePath}`);
    }} />;
  } else {
    page = <Home learners={learners} status={status} onCreate={() => setScreen('create')} onSettings={() => setScreen('settings')} onSelect={(learner) => { setSelected(learner); setScreen('unlock'); }} onImport={async () => {
      const result = await run(() => window.mindcarry.learners.import());
      if (result && !result.canceled) {
        setMessage(`${result.manifest?.preferredName || 'Learner'} was imported.`);
        await refresh();
      }
    }} />;
  }

  return <div className="app-shell">
    <header className="topbar">
      <button className="brand" onClick={() => void closeLearner()}>
        <span className="brand-mark">M</span>
        <span><strong>MindCarry</strong><small>The tutor that learns how your child learns</small></span>
      </button>
      <div className="privacy-pill"><span className="privacy-dot" /> Local Learner Memory</div>
    </header>
    {(message || error) && <div className={`toast ${error ? 'toast-error' : 'toast-success'}`}><span>{error || message}</span><button onClick={() => { setMessage(''); setError(''); }}>×</button></div>}
    <main>{page}</main>
    <footer><span>MindCarry alpha · Learner memory stays local.</span><span>{status?.provider === 'gemini' ? 'Gemini connected' : 'Safe demo mode'}</span></footer>
  </div>;
}

function Home({ learners, status, onCreate, onImport, onSettings, onSelect }: {
  learners: LearnerManifest[]; status: AppStatus | null; onCreate: () => void; onImport: () => void; onSettings: () => void; onSelect: (learner: LearnerManifest) => void;
}) {
  return <section className="home-grid">
    <div className="hero-card">
      <div className="eyebrow">PRIVATE · PORTABLE · PERSONALISED</div>
      <h1>An AI tutor that remembers the learner—not just the chat.</h1>
      <p>MindCarry teaches foundational maths while building a family-owned Learner Memory that can move between supported devices as an encrypted <code>.childmind</code> file.</p>
      <div className="hero-actions"><button className="primary" onClick={onCreate}>Create Learner Memory</button><button className="secondary" onClick={onImport}>Import .childmind</button></div>
      <div className="truth-row"><div><strong>Local by design</strong><span>No cloud database stores the permanent profile.</span></div><div><strong>Model independent</strong><span>Gemini is the engine, not the memory owner.</span></div><div><strong>Parent controlled</strong><span>Camera and retention choices are explicit.</span></div></div>
    </div>
    <aside className="side-card">
      <div className="side-card-header"><div><span className="eyebrow">LEARNERS</span><h2>{learners.length ? 'Continue learning' : 'Create the first profile'}</h2></div><button className="icon-button" onClick={onSettings}>⚙</button></div>
      {learners.length ? <div className="learner-list">{learners.map((learner) => <button className="learner-row" key={learner.learnerId} onClick={() => onSelect(learner)}><span className="avatar">{learner.preferredName[0]?.toUpperCase()}</span><span><strong>{learner.preferredName}</strong><small>Age {learner.age} · Updated {when(learner.updatedAt)}</small></span><span className="chevron">›</span></button>)}</div> : <div className="empty-state"><div className="empty-icon">🧠</div><p>Each child receives a separate encrypted memory protected by a parent passphrase.</p></div>}
      <div className="provider-card"><span className={`provider-light ${status?.provider === 'gemini' ? 'connected' : ''}`} /><div><strong>{status?.provider === 'gemini' ? 'Gemini connected' : 'Demo tutor active'}</strong><small>{status?.provider === 'gemini' ? 'Explanations use your secured API key.' : 'Test the complete memory loop without an API key.'}</small></div></div>
    </aside>
  </section>;
}

function CreateLearner({ busy, onCancel, onCreate }: { busy: boolean; onCancel: () => void; onCreate: (payload: CreateLearnerPayload) => Promise<void> }) {
  const [name, setName] = useState('');
  const [age, setAge] = useState(7);
  const [interests, setInterests] = useState('dinosaurs');
  const [goal, setGoal] = useState('Build confidence in foundational maths.');
  const [passphrase, setPassphrase] = useState('');
  const [confirm, setConfirm] = useState('');
  const [camera, setCamera] = useState(false);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (passphrase !== confirm) return;
    void onCreate({ preferredName: name, age, language: 'English', interests: interests.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean), parentGoal: goal, passphrase, consent: { ...consentDefaults, cameraAllowed: camera, localBehaviourAnalysisAllowed: camera } });
  }

  return <section className="form-card narrow-card"><div className="section-heading"><button className="back-button" onClick={onCancel}>←</button><div><span className="eyebrow">PARENT SETUP</span><h1>Create a private Learner Memory</h1></div></div><form onSubmit={submit}>
    <div className="field-grid"><label>Child's preferred name<input required value={name} onChange={(e) => setName(e.target.value)} /></label><label>Age<input required type="number" min={4} max={14} value={age} onChange={(e) => setAge(Number(e.target.value))} /></label><label>Interests<input value={interests} onChange={(e) => setInterests(e.target.value)} /></label><label>Parent goal<input value={goal} onChange={(e) => setGoal(e.target.value)} /></label></div>
    <div className="consent-panel"><h3>Privacy and consent</h3><p>Camera observation is optional and off by default. It measures only local movement intensity, not emotions or identity.</p><label className="toggle-row"><span>Allow local camera observation</span><input type="checkbox" checked={camera} onChange={(e) => setCamera(e.target.checked)} /><span className="toggle" /></label><div className="locked-choice">Raw audio and raw video storage remain disabled.</div></div>
    <div className="field-grid"><label>Parent passphrase<input required minLength={8} type="password" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} /></label><label>Confirm passphrase<input required minLength={8} type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} /><small className={confirm && confirm !== passphrase ? 'field-error' : ''}>{confirm && confirm !== passphrase ? 'Passphrases do not match.' : 'MindCarry cannot recover a forgotten passphrase.'}</small></label></div>
    <div className="form-actions"><button type="button" className="secondary" onClick={onCancel}>Cancel</button><button className="primary" disabled={busy || passphrase !== confirm}>{busy ? 'Encrypting…' : 'Create Learner Memory'}</button></div>
  </form></section>;
}

function Unlock({ learner, busy, onBack, onUnlock }: { learner: LearnerManifest; busy: boolean; onBack: () => void; onUnlock: (passphrase: string) => Promise<void> }) {
  const [passphrase, setPassphrase] = useState('');
  return <section className="unlock-card narrow-card"><button className="back-button" onClick={onBack}>←</button><div className="large-avatar">{learner.preferredName[0]?.toUpperCase()}</div><span className="eyebrow">ENCRYPTED LEARNER MEMORY</span><h1>Welcome back, {learner.preferredName}</h1><p>Enter the parent passphrase to open this private record.</p><form onSubmit={(event) => { event.preventDefault(); void onUnlock(passphrase); }}><input autoFocus required minLength={8} type="password" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} /><button className="primary full-width" disabled={busy}>{busy ? 'Opening…' : 'Open Learner Memory'}</button></form></section>;
}

function DashboardPage({ learner, dashboard, status, onLesson, onExport, onSettings, onLock }: { learner: LearnerManifest; dashboard: Dashboard; status: AppStatus | null; onLesson: () => void; onExport: () => void; onSettings: () => void; onLock: () => void }) {
  const skill = dashboard.skills[0];
  return <section className="dashboard-grid"><div className="dashboard-main"><div className="welcome-banner"><div><span className="eyebrow">LEARNER HOME</span><h1>Ready for the next small win, {learner.preferredName}?</h1><p>MindCarry will use previous evidence and check independent understanding.</p></div><button className="primary large" onClick={onLesson}>Start maths lesson →</button></div><div className="metrics-row"><div className="metric-card"><ProgressRing value={Number(skill?.mastery || 0)} label="Mastery" /><div><span>Current skill</span><strong>{String(skill?.name || 'Addition within 20')}</strong><small>{String(skill?.status || 'introduced')}</small></div></div><div className="metric-card"><div className="metric-icon">🧩</div><div><span>Personalisation</span><strong>{dashboard.memories.length} useful memories</strong><small>Only structured observations are kept.</small></div></div><div className="metric-card"><div className="metric-icon">🔐</div><div><span>Storage</span><strong>Encrypted locally</strong><small>No provider-hosted learner database.</small></div></div></div><div className="two-column"><div className="panel"><div className="panel-header"><div><span className="eyebrow">LEARNER MEMORY</span><h2>What MindCarry remembers</h2></div></div>{dashboard.memories.length ? <div className="memory-list">{dashboard.memories.map((memory) => <div className="memory-item" key={memory.memory_id}><span className="memory-type">{memory.type}</span><p>{memory.content}</p><small>{Math.round(Number(memory.confidence) * 100)}% confidence</small></div>)}</div> : <div className="empty-inline">Complete a lesson to create the first evidence-based memories.</div>}</div><div className="panel"><div className="panel-header"><div><span className="eyebrow">SESSION HISTORY</span><h2>Recent learning</h2></div></div>{dashboard.recentSessions.length ? <div className="session-list">{dashboard.recentSessions.map((session) => <div className="session-item" key={session.session_id}><span className="session-dot" /><div><strong>{String(session.objective)}</strong><p>{String(session.summary || 'Summary pending.')}</p><small>{when(session.started_at)}</small></div></div>)}</div> : <div className="empty-inline">No lessons completed yet.</div>}</div></div></div><aside className="dashboard-side"><div className="profile-panel"><div className="large-avatar small">{learner.preferredName[0]?.toUpperCase()}</div><h2>{learner.preferredName}</h2><p>Age {learner.age}</p><div className="tag-row">{dashboard.profile.interests.map((interest) => <span key={interest}>{interest}</span>)}</div></div><div className="action-panel"><button onClick={onExport}>⇩ Export encrypted .childmind</button><button onClick={onSettings}>⚙ Gemini & app settings</button><button onClick={onLock}>🔒 Lock learner memory</button></div><div className="status-panel"><strong>Privacy status</strong><span>Camera: {Number(dashboard.consent.camera_allowed) ? 'allowed' : 'off'}</span><span>Raw video storage: off</span><span>AI provider: {status?.provider || 'demo'}</span></div></aside></section>;
}

function Lesson({ learner, dashboard, onDone }: { learner: LearnerManifest; dashboard: Dashboard; onDone: (dashboard?: Dashboard) => Promise<void> }) {
  const [session, setSession] = useState<LessonStart | null>(null);
  const [question, setQuestion] = useState<LessonQuestion | null>(null);
  const [answer, setAnswer] = useState('');
  const [reasoning, setReasoning] = useState('');
  const [message, setMessage] = useState('Preparing a short lesson…');
  const [busy, setBusy] = useState(true);
  const [movement, setMovement] = useState(0);
  const [usedHint, setUsedHint] = useState(false);
  const [result, setResult] = useState<LessonReply | null>(null);
  const [error, setError] = useState('');
  const startedAt = useRef(Date.now());
  const stopListening = useRef<(() => void) | null>(null);
  const cameraEnabled = Boolean(Number(dashboard.consent.camera_allowed) && Number(dashboard.consent.local_behaviour_analysis_allowed));

  useEffect(() => {
    window.mindcarry.lessons.start(learner.learnerId).then((start) => { setSession(start); setQuestion(start.question); setMessage(start.greeting); startedAt.current = Date.now(); speak(`${start.greeting} ${start.question.prompt}`); }).catch((reason) => setError(errorText(reason))).finally(() => setBusy(false));
    return () => { stopListening.current?.(); window.speechSynthesis?.cancel(); };
  }, [learner.learnerId]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!session || !answer.trim()) return;
    setBusy(true);
    try {
      const reply = await window.mindcarry.lessons.answer({ sessionId: session.sessionId, answer, reasoning, responseMs: Date.now() - startedAt.current, usedHint, movementLevel: movement });
      setMessage(reply.explanation);
      speak(reply.explanation + (reply.question ? ` ${reply.question.prompt}` : ''));
      if (reply.completed) setResult(reply);
      else { setQuestion(reply.question || null); setAnswer(''); setReasoning(''); setUsedHint(false); startedAt.current = Date.now(); }
    } catch (reason) { setError(errorText(reason)); }
    finally { setBusy(false); }
  }

  if (result) return <section className="completion-card narrow-card"><div className="celebration">★</div><span className="eyebrow">SESSION COMPLETE</span><h1>Good thinking, {learner.preferredName}.</h1><p>{result.explanation}</p><ProgressRing value={Number(result.mastery || 0)} label="Mastery" /><div className="completion-note"><strong>Next time</strong><span>MindCarry will retrieve today's structured observations.</span></div><button className="primary full-width" onClick={() => void onDone(result.dashboard)}>View learner progress</button></section>;

  return <section className="lesson-layout"><div className="lesson-stage"><div className="lesson-top"><button className="back-button" onClick={() => void onDone()}>←</button><div><span className="eyebrow">FOUNDATIONAL MATHS</span><strong>Addition within 20</strong></div><span className="live-badge">● Private session</span></div><div className="tutor-bubble"><div className="tutor-avatar">M</div><p>{message}</p></div>{question && <div className="question-card"><span>Try this</span><h1>{question.prompt}</h1><div className="visual-aid">{question.visual}</div></div>}<form className="answer-area" onSubmit={submit}><label>Your answer<div className="voice-input"><input value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Say or type the answer" /><button type="button" className="mic" onClick={() => { stopListening.current = listenOnce(setAnswer, setError, () => undefined); }}>🎙</button></div></label><label>How did you work it out?<textarea rows={2} value={reasoning} onChange={(e) => setReasoning(e.target.value)} /></label><div className="lesson-actions"><button type="button" className="secondary" onClick={() => { setUsedHint(true); setMessage('Start with the larger number, then count on.'); speak('Start with the larger number, then count on.'); }}>Show me another way</button><button className="primary" disabled={busy || !answer.trim()}>{busy ? 'Thinking…' : 'Check my thinking →'}</button></div></form>{error && <div className="inline-error">{error}</div>}</div><aside className="lesson-observer"><CameraObserver enabled={cameraEnabled} onMovementChange={setMovement} /><div className="observer-card"><span className="eyebrow">OBSERVABLE CUES</span><h3>Local movement signal</h3><strong>{Math.round(movement * 100)}%</strong><p>This is not an emotion, diagnosis or judgement.</p></div><div className="observer-card"><span className="eyebrow">WHAT IS SAVED</span><p>Answer evidence, response time, misconception and intervention outcome. Raw video is not saved.</p></div></aside></section>;
}

function Settings({ status, busy, run, onBack, onChanged }: { status: AppStatus | null; busy: boolean; run: <T>(task: () => Promise<T>) => Promise<T | undefined>; onBack: () => void; onChanged: (message: string) => Promise<void> }) {
  const [apiKey, setApiKey] = useState('');
  const [result, setResult] = useState<ProviderStatus | null>(null);
  return <section className="settings-card narrow-card"><div className="section-heading"><button className="back-button" onClick={onBack}>←</button><div><span className="eyebrow">SETTINGS</span><h1>Gemini and local storage</h1></div></div><div className="settings-section"><h3>Current AI mode</h3><div className="provider-card large"><span className={`provider-light ${status?.provider === 'gemini' ? 'connected' : ''}`} /><div><strong>{status?.provider === 'gemini' ? 'Gemini connected' : 'Safe demo mode'}</strong><small>The learner database remains local.</small></div></div></div><form className="settings-section" onSubmit={async (event) => { event.preventDefault(); const response = await run(() => window.mindcarry.settings.setGeminiKey(apiKey)); if (response) { setResult(response); setApiKey(''); await onChanged('Gemini key stored securely and tested.'); } }}><h3>Gemini test API key</h3><p>The key is never included in a <code>.childmind</code> export.</p><label>API key<input type="password" minLength={20} required value={apiKey} onChange={(e) => setApiKey(e.target.value)} /></label><button className="primary" disabled={busy}>Save securely and test Gemini</button></form><div className="settings-section"><div className="button-row"><button className="secondary" onClick={async () => { const response = await run(() => window.mindcarry.settings.testProvider()); if (response) setResult(response); }}>Test provider</button><button className="danger-link" onClick={async () => { const response = await run(() => window.mindcarry.settings.removeGeminiKey()); if (response) await onChanged('Gemini key removed. Demo mode restored.'); }}>Remove Gemini key</button></div>{result && <div className={`provider-result ${result.ok ? 'ok' : 'bad'}`}><strong>{result.ok ? 'Connected' : 'Connection failed'}</strong><span>{result.message}</span></div>}</div><div className="settings-section"><h3>Local data folder</h3><code className="path-code">{status?.dataRoot || 'Loading…'}</code></div></section>;
}
