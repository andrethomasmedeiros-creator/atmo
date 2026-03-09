// ============================================
// CONFIGURAÇÃO DO FIREBASE
// ============================================
// 
// INSTRUÇÕES:
// 1. Acesse https://console.firebase.google.com/
// 2. Crie um novo projeto ou selecione existente
// 3. Vá em Configurações > Seus apps > Adicionar app (Web)
// 4. Copie o objeto firebaseConfig e cole abaixo
//
// ============================================

const firebaseConfig = {
  apiKey: "SUA_API_KEY_AQUI",
  authDomain: "SEU_PROJETO.firebaseapp.com",
  projectId: "SEU_PROJETO",
  storageBucket: "SEU_PROJETO.appspot.com",
  messagingSenderId: "SEU_SENDER_ID",
  appId: "SEU_APP_ID"
};

// ============================================
// NÃO EDITE ABAIXO DESTA LINHA
// ============================================

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Referência ao Firestore
const db = firebase.firestore();

// Referência à coleção de casos
const casosRef = db.collection('casos');

// Configuração de timezone
const TZ = "America/Fortaleza";

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

// Formatar tempo
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
  const ms = Date.now() - timestamp.toMillis();
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

console.log('Firebase Config carregado!');
