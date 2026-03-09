// ============================================
// CONFIGURAÇÃO DO FIREBASE - PTM SALA VERMELHA HRVJ
// ============================================

const firebaseConfig = {
  apiKey: "AIzaSyAiQ1x9AEGi1oIr_i-hi_kulEWRzgF7JZc",
  authDomain: "ptm-sala-vermelha-hrvj.firebaseapp.com",
  projectId: "ptm-sala-vermelha-hrvj",
  storageBucket: "ptm-sala-vermelha-hrvj.firebasestorage.app",
  messagingSenderId: "1030914129581",
  appId: "1:1030914129581:web:a2b0d53ccb725123ffd024"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Referência ao Firestore
const db = firebase.firestore();

// Referência à coleção de casos
const casosRef = db.collection('casos');

// ============================================
// FUNÇÕES UTILITÁRIAS
// ============================================

// Gerar ID único para o caso
function gerarIdCaso() {
  const now = new Date();
  const dia = String(now.getDate()).padStart(2, '0');
  const mes = String(now.getMonth() + 1).padStart(2, '0');
  const timestamp = Date.now().toString().slice(-6);
  return `PTM-${dia}${mes}-${timestamp}`;
}

// Formatar tempo (hh:mm:ss)
function formatarTempo(segundos) {
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = segundos % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// Formatar tempo curto (mm:ss)
function formatarTempoCurto(segundos) {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// Obter timestamp atual
function agora() {
  return firebase.firestore.Timestamp.now();
}

// Calcular diferença em segundos
function diffSegundos(timestamp) {
  if (!timestamp) return 0;
  const ms = Date.now() - (timestamp.toMillis ? timestamp.toMillis() : timestamp);
  return Math.floor(ms / 1000);
}

// ============================================
// FUNÇÕES DE ÁUDIO
// ============================================

let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function tocarAlarme(tipo = 'padrao') {
  if (!audioCtx) return;
  
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc.type = 'square';
  
  if (tipo === 'urgente') {
    osc.frequency.setValueAtTime(800, audioCtx.currentTime);
    osc.frequency.setValueAtTime(1200, audioCtx.currentTime + 0.25);
    osc.frequency.setValueAtTime(800, audioCtx.currentTime + 0.5);
    osc.frequency.setValueAtTime(1200, audioCtx.currentTime + 0.75);
  } else {
    osc.frequency.setValueAtTime(750, audioCtx.currentTime);
    osc.frequency.setValueAtTime(1000, audioCtx.currentTime + 0.25);
    osc.frequency.setValueAtTime(750, audioCtx.currentTime + 0.5);
  }
  
  gain.gain.setValueAtTime(0, audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.05);
  gain.gain.setValueAtTime(0.1, audioCtx.currentTime + 0.95);
  gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1);
  
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 1);
}

console.log('✅ Firebase Config carregado! Projeto: ptm-sala-vermelha-hrvj');
