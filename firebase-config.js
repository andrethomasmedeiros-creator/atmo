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

// Referências (Auth removido — não utilizado, causava SERVICE-NOT-ALLOWED)
const db = firebase.firestore();
const casosRef = db.collection('casos');

// ============================================
// AUTENTICAÇÃO - SENHA VIA HASH SHA-256
// ============================================
// As senhas são verificadas como hash SHA-256.
// O hash da senha atual é armazenado na coleção /config/auth no Firestore.
// Para alterar a senha: atualizar o campo correspondente no documento config/auth.
//
// Estrutura do documento /config/auth:
//   { hashSalaVermelha: "<sha256>", hashNac: "<sha256>", hashCc: "<sha256>" }
//
// Para gerar o hash de uma nova senha, execute no console do navegador:
//   sha256('SUA_NOVA_SENHA').then(h => console.log(h))

async function sha256(texto) {
  const encoder = new TextEncoder();
  const data = encoder.encode(texto);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verificarSenhaFirestore(senhaDigitada, campoHash) {
  try {
    const configDoc = await db.collection('config').doc('auth').get();
    if (!configDoc.exists) {
      // Fallback: aceitar qualquer senha se config não existir (primeira configuração)
      console.warn('⚠️ Documento config/auth não encontrado. Configure as senhas no Firestore.');
      return true;
    }
    const hashEsperado = configDoc.data()[campoHash];
    if (!hashEsperado) {
      console.warn(`⚠️ Campo ${campoHash} não encontrado em config/auth.`);
      return true;
    }
    const hashDigitado = await sha256(senhaDigitada);
    return hashDigitado === hashEsperado;
  } catch (err) {
    console.error('Erro ao verificar senha:', err);
    return false;
  }
}

async function fazerLoginAnonimo() {
  // Anonymous Auth removido — Firestore usa regras públicas + senha SHA-256 no app
  return true;
}

async function verificarLoginCompleto(senhaDigitada, campoHash) {
  return await verificarSenhaFirestore(senhaDigitada, campoHash);
}

// ============================================
// FUNÇÕES UTILITÁRIAS
// ============================================

function gerarIdCaso() {
  const now = new Date();
  const dia = String(now.getDate()).padStart(2, '0');
  const mes = String(now.getMonth() + 1).padStart(2, '0');
  const ano = String(now.getFullYear()).slice(-2);
  const timestamp = Date.now().toString().slice(-6);
  return `PTM-${dia}${mes}${ano}-${timestamp}`;
}

function formatarTempo(segundos) {
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = segundos % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatarTempoCurto(segundos) {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function agora() {
  return firebase.firestore.Timestamp.now();
}

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
