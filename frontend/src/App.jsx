import { useState, useEffect, useRef, useCallback } from "react";

const G = "#00e68a";
const C = "#00b8d4";
const B = "#3b82f6";
const A = "#f5a623";
const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

const MSGS = [
  { text: "Necesito cambiar mi vuelo del viernes urgente", sentiment: "urgente", score: 0.89, intent: "cambio_reserva", entities: ["vuelo", "viernes"], confidence: 0.94, emotion: "ansiedad" },
  { text: "¡El servicio estuvo increíble, gracias!", sentiment: "positivo", score: 0.97, intent: "feedback_positivo", entities: ["servicio"], confidence: 0.98, emotion: "satisfacción" },
  { text: "Llevo 3 horas esperando y nadie me ayuda", sentiment: "negativo", score: 0.92, intent: "queja", entities: ["3 horas"], confidence: 0.91, emotion: "frustración" },
  { text: "¿Cuánto cuesta un vuelo a Margarita en mayo?", sentiment: "neutral", score: 0.85, intent: "consulta_precio", entities: ["Margarita", "mayo"], confidence: 0.96, emotion: "curiosidad" },
  { text: "Mi equipaje no llegó, esto es inaceptable", sentiment: "negativo", score: 0.94, intent: "reclamo_equipaje", entities: ["equipaje"], confidence: 0.93, emotion: "enojo" },
  { text: "Quiero reservar 2 asientos juntos por favor", sentiment: "neutral", score: 0.82, intent: "reserva", entities: ["2 asientos"], confidence: 0.95, emotion: "neutral" },
];

const SCOL = { positivo: G, negativo: "#ff5757", neutral: B, urgente: A };
const LAYERS = [
  { name: "Embed", neurons: 5, color: G },
  { name: "LSTM", neurons: 7, color: C },
  { name: "Attn", neurons: 6, color: B },
  { name: "Dense", neurons: 4, color: A },
  { name: "Out", neurons: 3, color: G },
];

/* ── NEURAL NETWORK VIZ ── */
function NeuralViz({ activeLayer, processing }) {
  const ref = useRef(null);
  const af = useRef(0);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = c.getBoundingClientRect();
    c.width = rect.width * dpr;
    c.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width, H = rect.height;
    let f = 0;
    function draw() {
      ctx.clearRect(0, 0, W, H);
      const gap = W / (LAYERS.length + 1);
      for (let i = 0; i < LAYERS.length - 1; i++) {
        const x1 = gap * (i + 1), x2 = gap * (i + 2);
        for (let a = 0; a < LAYERS[i].neurons; a++) {
          for (let b = 0; b < LAYERS[i + 1].neurons; b++) {
            const y1 = (H / (LAYERS[i].neurons + 1)) * (a + 1);
            const y2 = (H / (LAYERS[i + 1].neurons + 1)) * (b + 1);
            const on = processing && i <= activeLayer;
            ctx.strokeStyle = on ? `rgba(0,230,138,${0.12 + Math.sin(f * 0.05 + a + b) * 0.08})` : "rgba(255,255,255,0.025)";
            ctx.lineWidth = on ? 1.2 : 0.4;
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
          }
        }
      }
      for (let i = 0; i < LAYERS.length; i++) {
        const x = gap * (i + 1), n = LAYERS[i].neurons, on = processing && i <= activeLayer;
        for (let j = 0; j < n; j++) {
          const y = (H / (n + 1)) * (j + 1), r = 6 + (on ? Math.sin(f * 0.08 + j) * 3 : 0);
          if (on) { ctx.shadowColor = LAYERS[i].color; ctx.shadowBlur = 12; }
          ctx.fillStyle = on ? LAYERS[i].color : "rgba(255,255,255,0.06)";
          ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0;
        }
        ctx.fillStyle = on ? LAYERS[i].color : "#4a5568";
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "center";
        ctx.fillText(LAYERS[i].name, x, H - 6);
      }
      f++;
      af.current = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(af.current);
  }, [activeLayer, processing]);
  return <canvas ref={ref} className="nn-canvas" />;
}

/* ── GAUGE ── */
function Gauge({ score, color }) {
  const [v, setV] = useState(0);
  useEffect(() => { const t = setTimeout(() => setV(score), 100); return () => clearTimeout(t); }, [score]);
  const circ = 2 * Math.PI * 36;
  return (
    <svg width="88" height="88" viewBox="0 0 88 88">
      <circle cx="44" cy="44" r="36" fill="none" stroke="#1e293b" strokeWidth="5" />
      <circle cx="44" cy="44" r="36" fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={circ} strokeDashoffset={circ - v * circ} strokeLinecap="round"
        transform="rotate(-90 44 44)" style={{ transition: "stroke-dashoffset 1s ease" }} />
      <text x="44" y="42" textAnchor="middle" fill={color} fontSize="16" fontWeight="800" fontFamily="monospace">{Math.round(v * 100)}%</text>
      <text x="44" y="56" textAnchor="middle" fill="#8b9ab5" fontSize="6.5" fontFamily="monospace">CONFIANZA</text>
    </svg>
  );
}

/* ── COUNTER ── */
function Counter({ end, suffix = "", prefix = "" }) {
  const [v, setV] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        const s = performance.now();
        const run = (now) => {
          const p = Math.min((now - s) / 1400, 1);
          setV((1 - Math.pow(1 - p, 3)) * end);
          if (p < 1) requestAnimationFrame(run);
        };
        requestAnimationFrame(run);
      }
    }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [end]);
  return <span ref={ref} className="counter-val">{prefix}{end % 1 !== 0 ? v.toFixed(1) : Math.round(v)}{suffix}</span>;
}

/* ── TERMINAL ── */
function Terminal() {
  const [lines, setLines] = useState([]);
  const [busy, setBusy] = useState(false);
  const ref = useRef(null);

  const cmds = {
    "aerya status": [
      { t: "◉ aerya-api     Running (3 replicas) CPU:23% MEM:512MB", c: "info" },
      { t: "◉ aerya-rag     Running (2 replicas) CPU:45% MEM:2.1GB", c: "info" },
      { t: "◉ redis-cache   Running (1 replica)  CPU:8%  MEM:256MB", c: "ok" },
      { t: "◉ mongodb       Running (3 replicas) CPU:12% MEM:1.4GB", c: "info" },
      { t: "✓ All services healthy — uptime: 47d 12h", c: "ok" },
    ],
    "aerya train --model sentiment": [
      { t: "Loading: airline_conversations_v3 (124K rows)", c: "info" },
      { t: "Model: BiLSTM+Attention (PyTorch 2.1)", c: "info" },
      { t: "Epoch 1/10  ━━━━━━━━━━━━  loss:0.847 acc:0.72", c: "warn" },
      { t: "Epoch 5/10  ━━━━━━━━━━━━  loss:0.234 acc:0.91", c: "info" },
      { t: "Epoch 10/10 ━━━━━━━━━━━━  loss:0.089 acc:0.968", c: "ok" },
      { t: "✓ Saved: sentiment_v3.2.pt (48MB)", c: "ok" },
      { t: "✓ ONNX export + deployed via blue-green", c: "ok" },
    ],
    "aerya benchmark --rag": [
      { t: "Running RAG benchmark (1000 queries)...", c: "dim" },
      { t: "Precision@5:  0.943 (↑0.12)", c: "ok" },
      { t: "Recall@10:    0.891 (↑0.08)", c: "ok" },
      { t: "Latency p50:  0.21s  |  p99: 0.43s", c: "ok" },
      { t: "Tokens/query: 847 (↓31%)", c: "ok" },
      { t: "Hallucination: 0.8% (↓ from 4.2%)", c: "ok" },
      { t: "✓ All benchmarks PASSED", c: "ok" },
    ],
  };

  const run = useCallback((cmd) => {
    if (busy) return;
    setBusy(true);
    setLines(p => [...p, { t: `$ ${cmd}`, c: "cmd" }]);
    const out = cmds[cmd];
    out.forEach((l, i) => {
      setTimeout(() => {
        setLines(p => [...p, l]);
        if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
        if (i === out.length - 1) setBusy(false);
      }, (i + 1) * 320);
    });
  }, [busy]);

  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [lines]);
  const cc = { cmd: G, ok: G, info: B, warn: A, dim: "#4a5568" };

  return (
    <div className="terminal">
      <div className="term-bar">
        <div className="term-dots">
          <span style={{ background: "#ff5f57" }} /><span style={{ background: "#febc2e" }} /><span style={{ background: "#28c840" }} />
          <span className="term-title">aerya-production</span>
        </div>
        <span className="term-status"><span className="dot-live" /> CONNECTED</span>
      </div>
      <div ref={ref} className="term-body">
        {lines.map((l, i) => <div key={i} style={{ color: cc[l.c], paddingLeft: l.c !== "cmd" ? 16 : 0, fontWeight: l.c === "cmd" ? 600 : 400 }}>{l.t}</div>)}
        {!busy && <div style={{ color: G }}>$ <span className="cursor" /></div>}
      </div>
      <div className="term-cmds">
        {Object.keys(cmds).map(c => (
          <button key={c} onClick={() => run(c)} disabled={busy} className="term-btn">{c}</button>
        ))}
        {lines.length > 0 && <button onClick={() => { setLines([]); setBusy(false); }} className="term-clear">clear</button>}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════ */
/* ── MAIN APP ── */
/* ══════════════════════════════════════ */
export default function App() {
  const [sel, setSel] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [layer, setLayer] = useState(-1);
  const [result, setResult] = useState(null);
  const [custom, setCustom] = useState("");
  const [aiRes, setAiRes] = useState(null);
  const [aiLoad, setAiLoad] = useState(false);
  const [aiError, setAiError] = useState("");

  const analyze = useCallback((msg) => {
    setSel(msg); setAnalyzing(true); setResult(null); setLayer(-1); setAiRes(null); setAiError("");
    LAYERS.forEach((_, i) => { setTimeout(() => setLayer(i), (i + 1) * 350); });
    setTimeout(() => { setResult(msg); setAnalyzing(false); }, LAYERS.length * 350 + 500);
  }, []);

  const analyzeAI = useCallback(async () => {
    if (!custom.trim() || aiLoad) return;
    setAiLoad(true); setAiRes(null); setAiError("");

    // Trigger neural viz animation
    setAnalyzing(true); setLayer(-1); setResult(null);
    LAYERS.forEach((_, i) => { setTimeout(() => setLayer(i), (i + 1) * 300); });

    try {
      const resp = await fetch(`${API}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: custom }),
      });

      if (!resp.ok) throw new Error(`Error ${resp.status}`);
      const data = await resp.json();
      const clean = data.result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(clean);
      setAiRes(parsed);
    } catch (err) {
      setAiError(`No se pudo conectar al backend (${API}). Asegúrate de que esté corriendo.`);
    }

    setAnalyzing(false);
    setAiLoad(false);
  }, [custom, aiLoad]);

  return (
    <div className="app">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&family=Sora:wght@300;400;600;700;800&display=swap');
        *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
        html{scroll-behavior:smooth}
        body{font-family:'Sora',sans-serif;background:#06080d;color:#f0f4f8;overflow-x:hidden;text-align:left}
        ::selection{background:${G};color:#06080d}
        ::-webkit-scrollbar{width:5px}
        ::-webkit-scrollbar-thumb{background:${G};border-radius:3px}
        @keyframes blink{50%{opacity:0}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}

        .app{background:#06080d;min-height:100vh;position:relative}
        .grid-bg{position:fixed;inset:0;background-image:linear-gradient(rgba(0,230,138,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(0,230,138,0.02) 1px,transparent 1px);background-size:60px 60px;pointer-events:none;z-index:0}

        .nav{position:fixed;top:0;width:100%;z-index:1000;padding:0.8rem 1.5rem;display:flex;justify-content:space-between;align-items:center;background:rgba(6,8,13,0.92);backdrop-filter:blur(20px);border-bottom:1px solid #1e293b}
        .nav-brand{font-family:'JetBrains Mono',monospace;font-weight:700;font-size:0.78rem;letter-spacing:2px;color:${G}}
        .nav-brand span{color:#4a5568;font-weight:400}
        .nav-sub{font-size:0.68rem;color:#8b9ab5;margin-left:1rem}
        .nav-links{display:flex;gap:1.5rem}
        .nav-links a{text-decoration:none;color:#8b9ab5;font-size:0.68rem;font-weight:500;letter-spacing:1px;text-transform:uppercase;transition:color 0.3s}
        .nav-links a:hover{color:${G}}

        .sec{position:relative;z-index:1;padding:5rem 1.5rem;max-width:1200px;margin:0 auto}
        .sec-alt{background:#0c1018;border-top:1px solid #1e293b;border-bottom:1px solid #1e293b}
        .sec-full{max-width:100%}
        .sec-inner{max-width:1200px;margin:0 auto}
        .sec-label{display:inline-flex;align-items:center;gap:8px;font-family:'JetBrains Mono',monospace;font-size:0.62rem;color:${G};letter-spacing:2px;text-transform:uppercase;margin-bottom:0.8rem}
        .sec-label::before{content:'';width:20px;height:1px;background:${G}}
        .sec-title{font-size:clamp(1.6rem,3vw,2.4rem);font-weight:800;letter-spacing:-1px;margin-bottom:0.5rem}
        .sec-desc{font-size:0.88rem;color:#8b9ab5;max-width:520px;line-height:1.7;margin-bottom:2rem}

        .hero{min-height:100vh;display:flex;align-items:center;padding-top:6rem}
        .hero-glow{position:absolute;width:400px;height:400px;border-radius:50%;filter:blur(140px);opacity:0.1;background:${G};top:8%;right:5%;pointer-events:none}
        .hero-inner{max-width:620px;animation:fadeUp 0.8s ease both}
        .hero-tag{display:inline-flex;align-items:center;gap:6px;background:rgba(0,230,138,0.07);border:1px solid rgba(0,230,138,0.18);padding:0.35rem 0.9rem;border-radius:100px;font-family:'JetBrains Mono',monospace;font-size:0.6rem;color:${G};letter-spacing:1px;text-transform:uppercase;margin-bottom:1.5rem}
        .dot-pulse{width:6px;height:6px;border-radius:50%;background:${G};animation:pulse 2s infinite}
        .hero h1{font-size:clamp(2rem,4vw,3.2rem);font-weight:800;line-height:1.15;letter-spacing:-1.5px;margin-bottom:1.2rem}
        .hero h1 .grad{background:linear-gradient(135deg,${G},${C});-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .hero p{font-size:0.95rem;color:#8b9ab5;max-width:500px;line-height:1.8;margin-bottom:2rem}
        .hero-btns{display:flex;gap:0.8rem;flex-wrap:wrap}
        .btn-g{display:inline-flex;align-items:center;gap:5px;padding:0.75rem 1.5rem;background:${G};color:#06080d;font-weight:700;font-size:0.78rem;border:none;border-radius:8px;text-decoration:none;box-shadow:0 4px 18px rgba(0,230,138,0.2);cursor:pointer;transition:all 0.3s}
        .btn-g:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(0,230,138,0.3)}
        .btn-o{display:inline-flex;align-items:center;gap:5px;padding:0.75rem 1.5rem;background:transparent;color:#f0f4f8;font-weight:600;font-size:0.78rem;border:1px solid #1e293b;border-radius:8px;text-decoration:none;cursor:pointer;transition:all 0.3s}
        .btn-o:hover{border-color:${G};color:${G}}

        .nlp-grid{display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;align-items:start}
        .msg-list{display:flex;flex-direction:column;gap:0.4rem}
        .msg-btn{text-align:left;padding:0.7rem 0.9rem;background:#111827;border:1px solid #1e293b;border-radius:8px;color:#f0f4f8;font-size:0.75rem;cursor:pointer;transition:all 0.2s;font-family:'Sora',sans-serif;line-height:1.5;display:flex;align-items:center;gap:8px}
        .msg-btn:hover{border-color:rgba(0,230,138,0.3);background:#161f2d}
        .msg-btn.active{background:rgba(0,230,138,0.06);border-color:rgba(0,230,138,0.3)}
        .msg-dot{flex-shrink:0;width:7px;height:7px;border-radius:50%}
        .ai-input{display:flex;gap:0.4rem;margin-top:0.8rem}
        .ai-input input{flex:1;padding:0.6rem 0.8rem;background:#111827;border:1px solid #1e293b;border-radius:8px;color:#f0f4f8;font-family:'Sora',sans-serif;font-size:0.75rem;outline:none}
        .ai-input input:focus{border-color:${G}}
        .ai-input button{padding:0.6rem 1rem;background:${G};border:none;border-radius:8px;color:#06080d;font-weight:700;font-size:0.7rem;cursor:pointer;white-space:nowrap;transition:all 0.2s}
        .ai-input button:disabled{background:#1e293b;color:#4a5568;cursor:not-allowed}
        .ai-input button:not(:disabled):hover{box-shadow:0 4px 15px rgba(0,230,138,0.3)}

        .nn-canvas{width:100%;height:220px;border-radius:10px;background:rgba(0,0,0,0.3);border:1px solid #1e293b}
        .result-card{margin-top:1rem;padding:1.2rem;background:#111827;border:1px solid #1e293b;border-radius:12px;animation:fadeUp 0.4s ease}
        .result-head{display:flex;align-items:center;gap:1rem;margin-bottom:0.8rem}
        .result-badge{display:inline-block;padding:0.2rem 0.6rem;border-radius:5px;font-family:monospace;font-size:0.6rem;font-weight:700;text-transform:uppercase;letter-spacing:1px}
        .result-meta{font-size:0.68rem;color:#8b9ab5;margin-top:0.15rem}
        .result-meta b{color:#f0f4f8;font-weight:600}
        .entity-tag{display:inline-block;padding:0.15rem 0.45rem;background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.15);border-radius:4px;font-family:monospace;font-size:0.58rem;color:${B};margin:0.15rem}
        .result-footer{margin-top:0.6rem;padding:0.5rem 0.7rem;background:rgba(0,0,0,0.2);border-radius:6px;font-family:monospace;font-size:0.55rem;color:#4a5568}
        .ai-result{border-color:rgba(0,230,138,0.2)}
        .ai-label{font-family:monospace;font-size:0.58rem;color:${G};letter-spacing:1px;text-transform:uppercase;margin-bottom:0.6rem}
        .ai-suggest{padding:0.5rem 0.7rem;background:rgba(0,230,138,0.04);border:1px solid rgba(0,230,138,0.1);border-radius:6px;font-size:0.72rem;color:#8b9ab5;line-height:1.5;margin-top:0.6rem}
        .ai-suggest b{color:${G}}
        .ai-error{margin-top:0.8rem;padding:0.6rem 0.8rem;background:rgba(255,87,87,0.06);border:1px solid rgba(255,87,87,0.15);border-radius:8px;font-size:0.7rem;color:#ff5757;line-height:1.5}

        .model-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem}
        .model-card{background:#111827;border:1px solid #1e293b;border-radius:12px;padding:1.5rem;transition:all 0.3s}
        .model-card:hover{border-color:rgba(0,230,138,0.25);transform:translateY(-2px);box-shadow:0 0 30px rgba(0,230,138,0.08)}
        .model-icon{width:38px;height:38px;border-radius:10px;background:rgba(0,230,138,0.06);display:flex;align-items:center;justify-content:center;margin-bottom:0.8rem;font-size:1.1rem}
        .model-card h3{font-size:0.88rem;font-weight:700;margin-bottom:0.4rem}
        .model-card p{font-size:0.72rem;color:#8b9ab5;line-height:1.6;margin-bottom:0.7rem}
        .tags{display:flex;flex-wrap:wrap;gap:0.2rem}
        .tag{padding:0.15rem 0.45rem;background:rgba(0,230,138,0.05);border:1px solid rgba(0,230,138,0.1);border-radius:4px;font-family:'JetBrains Mono',monospace;font-size:0.52rem;color:${G}}

        .terminal{background:#111827;border:1px solid #1e293b;border-radius:14px;overflow:hidden;box-shadow:0 16px 50px rgba(0,0,0,0.35);max-width:820px;margin:0 auto}
        .term-bar{display:flex;align-items:center;justify-content:space-between;padding:0.7rem 1rem;background:rgba(0,0,0,0.3);border-bottom:1px solid #1e293b}
        .term-dots{display:flex;align-items:center;gap:5px}
        .term-dots span:nth-child(-n+3){width:9px;height:9px;border-radius:50%;display:block}
        .term-title{font-family:monospace;font-size:0.58rem;color:#4a5568;margin-left:8px}
        .term-status{font-family:monospace;font-size:0.52rem;color:${G};display:flex;align-items:center;gap:4px}
        .dot-live{width:5px;height:5px;border-radius:50%;background:${G};display:inline-block}
        .term-body{padding:0.8rem 1rem;font-family:'JetBrains Mono',monospace;font-size:0.65rem;line-height:1.8;min-height:200px;max-height:300px;overflow-y:auto;color:#8b9ab5}
        .cursor{display:inline-block;width:7px;height:12px;background:${G};animation:blink 1s step-end infinite;vertical-align:middle}
        .term-cmds{display:flex;gap:6px;padding:0.7rem 1rem;border-top:1px solid #1e293b;background:rgba(0,0,0,0.12);flex-wrap:wrap}
        .term-btn{padding:0.35rem 0.7rem;background:rgba(0,230,138,0.06);border:1px solid rgba(0,230,138,0.18);border-radius:6px;color:${G};font-family:'JetBrains Mono',monospace;font-size:0.56rem;cursor:pointer;transition:all 0.2s}
        .term-btn:hover{background:rgba(0,230,138,0.12)}
        .term-btn:disabled{opacity:0.4;cursor:not-allowed}
        .term-clear{padding:0.35rem 0.7rem;background:rgba(255,87,87,0.06);border:1px solid rgba(255,87,87,0.18);border-radius:6px;color:#ff5757;font-family:monospace;font-size:0.56rem;cursor:pointer;margin-left:auto}

        .metrics-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem}
        .metric{background:#111827;border:1px solid #1e293b;border-radius:12px;padding:1.4rem;text-align:center;transition:all 0.3s}
        .metric:hover{border-color:rgba(0,230,138,0.25);box-shadow:0 0 25px rgba(0,230,138,0.08)}
        .counter-val{font-family:'JetBrains Mono',monospace;font-weight:700;font-size:2rem;color:${G}}
        .metric-label{font-size:0.7rem;color:#8b9ab5;margin-top:0.3rem}
        .metric-sub{font-size:0.55rem;color:#4a5568;font-family:monospace;margin-top:0.2rem}

        .profile-grid{display:grid;grid-template-columns:1.2fr 1fr;gap:2.5rem;align-items:start}
        .profile-text p{font-size:0.85rem;color:#8b9ab5;line-height:1.85;margin-bottom:1.2rem}
        .profile-text .em{color:${G};font-weight:600}
        .stack-cat{background:#111827;border:1px solid #1e293b;border-radius:10px;padding:0.9rem 1.1rem;margin-bottom:0.6rem;transition:all 0.3s}
        .stack-cat:hover{border-color:rgba(0,230,138,0.18)}
        .stack-cat h4{font-size:0.7rem;font-weight:700;margin-bottom:0.4rem}

        .foot{padding:2.5rem 1.5rem;border-top:1px solid #1e293b;text-align:center;position:relative;z-index:1}
        .foot-brand{font-family:'JetBrains Mono',monospace;font-size:0.68rem;color:${G};letter-spacing:2px;margin-bottom:0.5rem}
        .foot p{font-size:0.62rem;color:#4a5568}

        @media(max-width:900px){
          .nav-links,.nav-sub{display:none}
          .sec{padding:4rem 1.2rem}
          .nlp-grid,.profile-grid{grid-template-columns:1fr}
          .model-grid{grid-template-columns:1fr 1fr}
          .metrics-grid{grid-template-columns:repeat(2,1fr)}
          .hero h1{font-size:clamp(1.8rem,5vw,2.5rem)}
          .hero-btns{flex-direction:column}
        }
        @media(max-width:600px){
          .model-grid,.metrics-grid{grid-template-columns:1fr 1fr}
          .ai-input{flex-direction:column}
          .hero{padding-top:5rem}
        }
      `}</style>

      <div className="grid-bg" />

      <nav className="nav">
        <div style={{ display: "flex", alignItems: "center" }}>
          <span className="nav-brand">AERYA <span>× BACK9</span></span>
          <span className="nav-sub">Propuesta · Especialista IA</span>
        </div>
        <div className="nav-links">
          {["NLP Demo", "Modelos", "DevOps", "Métricas"].map(s => (
            <a key={s} href={`#${s.toLowerCase().replace(/ /g, "-")}`}>{s}</a>
          ))}
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="sec hero">
        <div className="hero-glow" />
        <div className="hero-inner">
          <div className="hero-tag"><span className="dot-pulse" /> PyTorch · NLP · Deep Learning · DevOps</div>
          <h1>IA que entiende a tus clientes.<br /><span className="grad">Infraestructura que nunca falla.</span></h1>
          <p>Ingeniero de Sistemas especializado en modelos de NLP con PyTorch, pipelines RAG y DevOps para IA en producción. Esta página tiene demos interactivas reales.</p>
          <div className="hero-btns">
            <a href="#nlp-demo" className="btn-g">▸ Probar Demo NLP en Vivo</a>
            <a href="#devops" className="btn-o">◎ Terminal DevOps</a>
          </div>
        </div>
      </section>

      {/* ── NLP DEMO ── */}
      <section id="nlp-demo" className="sec sec-full sec-alt" style={{ padding: "5rem 1.5rem" }}>
        <div className="sec-inner">
          <div className="sec-label">01 · NLP Pipeline en Vivo</div>
          <h2 className="sec-title">Análisis de Sentimiento para Aerya</h2>
          <p className="sec-desc">Simulación de un modelo BiLSTM+Attention (PyTorch). Click en un mensaje predefinido o escribe el tuyo para análisis con IA real.</p>

          <div className="nlp-grid">
            <div>
              <div style={{ fontFamily: "monospace", fontSize: "0.55rem", color: "#4a5568", letterSpacing: 1, marginBottom: "0.6rem", textTransform: "uppercase" }}>
                Mensajes de Clientes — Click para Analizar
              </div>
              <div className="msg-list">
                {MSGS.map((m, i) => (
                  <button key={i} onClick={() => analyze(m)} className={`msg-btn${sel === m ? " active" : ""}`}>
                    <span className="msg-dot" style={{ background: SCOL[m.sentiment] }} />
                    {m.text}
                  </button>
                ))}
              </div>
              <div className="ai-input">
                <input value={custom} onChange={e => setCustom(e.target.value)} onKeyDown={e => e.key === "Enter" && analyzeAI()} placeholder="Escribe un mensaje para IA real..." />
                <button onClick={analyzeAI} disabled={aiLoad || !custom.trim()}>
                  {aiLoad ? "⟳ Analizando..." : "⚡ Analizar con IA"}
                </button>
              </div>
            </div>

            <div>
              <NeuralViz activeLayer={layer} processing={analyzing || layer >= 0} />

              {result && !aiRes && (
                <div className="result-card">
                  <div className="result-head">
                    <Gauge score={result.confidence} color={SCOL[result.sentiment]} />
                    <div>
                      <div className="result-badge" style={{ background: `${SCOL[result.sentiment]}15`, border: `1px solid ${SCOL[result.sentiment]}30`, color: SCOL[result.sentiment] }}>{result.sentiment}</div>
                      <div className="result-meta">Intent: <b>{result.intent}</b></div>
                      <div className="result-meta">Emoción: <b>{result.emotion}</b></div>
                    </div>
                  </div>
                  <div>{result.entities.map((e, i) => <span key={i} className="entity-tag">{e}</span>)}</div>
                  <div className="result-footer">model: BiLSTM+Attn | PyTorch 2.1 | inference: 12ms | vocab: 32K</div>
                </div>
              )}

              {aiRes && (
                <div className="result-card ai-result">
                  <div className="ai-label">⚡ Resultado IA en Tiempo Real (Claude API)</div>
                  <div className="result-head">
                    <Gauge score={aiRes.confidence || 0.5} color={SCOL[aiRes.sentiment] || B} />
                    <div>
                      <div className="result-badge" style={{ background: `${SCOL[aiRes.sentiment] || B}15`, border: `1px solid ${SCOL[aiRes.sentiment] || B}30`, color: SCOL[aiRes.sentiment] || B }}>{aiRes.sentiment}</div>
                      <div className="result-meta">Intent: <b>{aiRes.intent}</b></div>
                      <div className="result-meta">Emoción: <b>{aiRes.emotion}</b></div>
                    </div>
                  </div>
                  {aiRes.entities?.length > 0 && <div>{aiRes.entities.map((e, i) => <span key={i} className="entity-tag">{e}</span>)}</div>}
                  {aiRes.suggestion && <div className="ai-suggest"><b>Respuesta sugerida: </b>{aiRes.suggestion}</div>}
                  <div className="result-footer">backend: FastAPI proxy → Claude API | model: claude-sonnet-4</div>
                </div>
              )}

              {aiError && <div className="ai-error">⚠ {aiError}</div>}
            </div>
          </div>
        </div>
      </section>

      {/* ── MODELOS ── */}
      <section id="modelos" className="sec">
        <div className="sec-label">02 · Stack de IA & Deep Learning</div>
        <h2 className="sec-title">Modelos que construyo para Aerya</h2>
        <p className="sec-desc">Cada modelo entrenado con PyTorch y optimizado para producción con ONNX.</p>
        <div className="model-grid">
          {[
            { icon: "🧠", t: "Análisis de Sentimiento", d: "BiLSTM+Attention sobre 125K conversaciones. Detecta frustración, urgencia y satisfacción.", tags: ["PyTorch","LSTM","Attention","NLP"] },
            { icon: "🎯", t: "Clasificación de Intent", d: "Transformer fine-tuned para 47 intenciones: reserva, cambio, queja, precio, equipaje.", tags: ["BERT","Fine-tuning","Multi-class"] },
            { icon: "🔍", t: "Pipeline RAG", d: "FAISS + re-ranking. Precisión 96.8% con latencia p99 < 0.5s.", tags: ["FAISS","RAG","Embeddings"] },
            { icon: "⚡", t: "NER Aerolíneas", d: "Extracción de vuelos, fechas, ciudades, PNRs. CRF+LSTM F1: 0.94.", tags: ["NER","CRF","SpaCy"] },
            { icon: "📊", t: "Predicción Escalamiento", d: "Predice si necesita agente humano. Accuracy: 91%.", tags: ["XGBoost","Sklearn","Real-time"] },
            { icon: "🔄", t: "Optimización Prompts", d: "Evaluación de calidad y costo. Reduce tokens 31%.", tags: ["Prompt Eng","A/B Test","OpenAI"] },
          ].map((m, i) => (
            <div key={i} className="model-card">
              <div className="model-icon">{m.icon}</div>
              <h3>{m.t}</h3><p>{m.d}</p>
              <div className="tags">{m.tags.map((t, j) => <span key={j} className="tag">{t}</span>)}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── DEVOPS ── */}
      <section id="devops" className="sec sec-full sec-alt" style={{ padding: "5rem 1.5rem" }}>
        <div className="sec-inner">
          <div className="sec-label">03 · Terminal DevOps Interactiva</div>
          <h2 className="sec-title">Infraestructura de Aerya — En Vivo</h2>
          <p className="sec-desc">Ejecuta comandos: status, entrenamiento PyTorch y benchmarks RAG.</p>
          <Terminal />
        </div>
      </section>

      {/* ── MÉTRICAS ── */}
      <section id="métricas" className="sec">
        <div className="sec-label">04 · Métricas de Impacto</div>
        <h2 className="sec-title">Lo que mis modelos logran</h2>
        <div className="metrics-grid" style={{ marginTop: "1.5rem" }}>
          {[
            { v: 96.8, s: "%", l: "Precisión NLP", sub: "BiLSTM+Attention" },
            { v: 0.4, s: "s", l: "Latencia p99", sub: "End-to-end" },
            { v: 31, s: "%", l: "Reducción Tokens", sub: "Prompt optimization", p: "-" },
            { v: 0.8, s: "%", l: "Alucinación", sub: "↓ desde 4.2%" },
            { v: 47, s: "", l: "Intents", sub: "Multi-clase" },
            { v: 125, s: "K", l: "Training Data", sub: "Conversaciones" },
            { v: 99.9, s: "%", l: "Uptime SLA", sub: "Zero-downtime" },
            { v: 12, s: "ms", l: "Inferencia GPU", sub: "ONNX optimizado" },
          ].map((m, i) => (
            <div key={i} className="metric">
              <Counter end={m.v} prefix={m.p || ""} suffix={m.s} />
              <div className="metric-label">{m.l}</div>
              <div className="metric-sub">{m.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PERFIL ── */}
      <section className="sec sec-full sec-alt" style={{ padding: "5rem 1.5rem" }}>
        <div className="sec-inner">
          <div className="sec-label">05 · Mi Perfil</div>
          <h2 className="sec-title">El Especialista IA que Aerya necesita</h2>
          <div className="profile-grid" style={{ marginTop: "2rem" }}>
            <div className="profile-text">
              <p>Ingeniero de Sistemas con experiencia en <span className="em">aprendizaje automático, deep learning y DevOps</span>. Trabajo con PyTorch, TensorFlow y pipelines de ML en producción.</p>
              <p>Mi enfoque: <span className="em">diseñar, entrenar y desplegar modelos de NLP</span> que mejoren la precisión del agente Aerya, detecten sentimiento y optimicen el RAG.</p>
              <p>Conozco el negocio de Back9 — <span className="em">ticketing, booking, pagos y e-billing</span> — y diseño modelos que generan valor real.</p>
            </div>
            <div>
              {[
                { i: "🧠", t: "IA & Deep Learning", tags: ["PyTorch","TensorFlow","LSTM","Transformers","BERT","NLP"] },
                { i: "📊", t: "Datos & ML", tags: ["Pandas","NumPy","Sklearn","FAISS","Embeddings","Big Data"] },
                { i: "⚡", t: "Infraestructura", tags: ["Docker","Kubernetes","AWS","Terraform","CI/CD"] },
                { i: "🔒", t: "Producción", tags: ["MLOps","ONNX","TorchServe","PCI DSS","Monitoring"] },
                { i: "💻", t: "Desarrollo", tags: ["Python","FastAPI","Node.js","MongoDB","Redis","LangChain"] },
              ].map((c, i) => (
                <div key={i} className="stack-cat">
                  <h4>{c.i} {c.t}</h4>
                  <div className="tags">{c.tags.map((t, j) => <span key={j} className="tag">{t}</span>)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="foot">
        <div className="foot-brand">AERYA × BACK9 · ESPECIALISTA IA · 2026</div>
        <p>Propuesta técnica interactiva · NLP + DevOps · Lechería, Venezuela</p>
      </footer>
    </div>
  );
}
