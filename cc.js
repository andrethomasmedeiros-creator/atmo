// ============================================
// CENTRO CIRÚRGICO DASHBOARD - LÓGICA PRINCIPAL
// ============================================

let casos = [];
let unsubscribe = null;
let audioAtivo = false;
let timers = {};

// ============================================
// INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  // Iniciar relógio
  atualizarRelogio();
  setInterval(atualizarRelogio, 1000);
  
  // Atualizar timers locais
  setInterval(atualizarTimersLocais, 1000);
  
  // Escutar mudanças no Firestore
  escutarCasosCC();
  
  // Alarme periódico
  setInterval(verificarAlarmes, 2000);
});

// Atualizar relógio
function atualizarRelogio() {
  const now = new Date();
  const el = document.getElementById('clock');
  if (el) {
    el.textContent = now.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  }
}

// ============================================
// ÁUDIO
// ============================================

function toggleAudio() {
  const indicator = document.getElementById('audioIndicator');
  if (!audioAtivo) {
    initAudio();
    audioAtivo = true;
    if (indicator) {
      indicator.classList.add('active');
      indicator.innerHTML = '<div class="icon">🔊</div><div class="text">ÁUDIO ATIVADO</div>';
    }
  }
}

function verificarAlarmes() {
  if (!audioAtivo) return;
  
  // Verificar se há casos de onda vermelha não reconhecidos
  const casoNaoReconhecido = casos.find(c => c.onda === 'SIM' && !c.ccAck);
  if (casoNaoReconhecido) {
    tocarAlarme('urgente');
  }
}

// ============================================
// FIRESTORE - ESCUTAR CASOS
// ============================================

function escutarCasosCC() {
  if (unsubscribe) unsubscribe();
  
  // Escutar casos com Onda Vermelha ativada
  unsubscribe = casosRef
    .where('status', '==', 'ATIVO')
    .where('onda', '==', 'SIM')
    .orderBy('createdAt', 'desc')
    .onSnapshot((snapshot) => {
      casos = [];
      snapshot.forEach((doc) => {
        casos.push({ id: doc.id, ...doc.data() });
      });
      renderizarCards();
      atualizarStatusBadge();
    }, (error) => {
      console.error('Erro ao escutar casos:', error);
    });
}

// ============================================
// RENDERIZAÇÃO
// ============================================

function renderizarCards() {
  const container = document.getElementById('casesGrid');
  const emptyState = document.getElementById('emptyState');
  
  if (!container || !emptyState) return;
  
  if (casos.length === 0) {
    container.innerHTML = '';
    container.style.display = 'none';
    emptyState.style.display = 'flex';
    return;
  }
  
  emptyState.style.display = 'none';
  container.style.display = 'grid';
  
  container.innerHTML = casos.map(c => {
    const acknowledged = c.ccAck;
    
    // Timer
    let timerUI = '';
    let timerSub = '';
    if (acknowledged && c.ccAckTime) {
      timerUI = `<span class="live-timer" data-start="${c.ccAckTime?.toMillis?.() || c.ccAckTime}">--:--</span>`;
      timerSub = 'Preparando sala cirúrgica...';
    } else {
      timerUI = '--:--';
      timerSub = 'Aguardando reconhecimento';
    }
    
    return `
      <div class="cc-card ${acknowledged ? 'acknowledged' : ''}" id="card-${c.id}">
        
        <div class="onda-banner ${acknowledged ? 'acknowledged' : ''}">
          <h2>${acknowledged ? '✅ SALA EM PREPARO' : '🚨 ONDA VERMELHA - PREPARAR SALA 🚨'}</h2>
        </div>
        
        <div class="card-body">
          
          <div class="patient-header">
            <div class="patient-main">
              <div class="patient-avatar">${(c.ident || 'P')[0].toUpperCase()}</div>
              <div class="patient-details">
                <h3>${c.ident || 'NÃO IDENTIFICADO'}</h3>
                <span>${c.sexo || '-'} • ${c.idade || '-'} anos</span>
              </div>
            </div>
            <div class="patient-id">${c.id}</div>
          </div>
          
          <div class="timer-section">
            <div class="timer-label">Tempo de Preparo da Sala</div>
            <div class="timer-value ${!acknowledged ? 'waiting' : ''}">${timerUI}</div>
            <div class="timer-sub">${timerSub}</div>
          </div>
          
          <div class="info-row">
            <div class="info-card highlight">
              <div class="label">Especialidade</div>
              <div class="value">${(c.especialidades || []).join(', ') || '-'}</div>
            </div>
            <div class="info-card">
              <div class="label">Critérios</div>
              <div class="value">${(c.criterios || []).slice(0, 2).join(' + ') || '-'}</div>
            </div>
            <div class="info-card">
              <div class="label">Transporte</div>
              <div class="value">${c.transpEnd ? 'CHEGOU' : (c.transpTime ? 'EM ANDAMENTO' : 'AGUARDANDO')}</div>
            </div>
          </div>
          
          ${c.cirurgiao ? `
            <div class="cirurgiao-box">
              <div class="label">Cirurgião Responsável</div>
              <div class="value">${c.cirurgiao}</div>
            </div>
          ` : ''}
          
          <div class="action-buttons">
            ${!acknowledged ? `
              <button class="btn btn-reconhecer" onclick="reconhecerOnda('${c.id}', this)">
                🔊 RECONHECER E PREPARAR SALA
              </button>
              <button class="btn btn-disabled" disabled>
                🏁 PACIENTE NA MESA
              </button>
            ` : `
              <button class="btn btn-disabled" disabled>
                ✅ RECONHECIDO
              </button>
              <button class="btn btn-encerrar" onclick="encerrarProtocolo('${c.id}', this)">
                🏁 PACIENTE NA MESA (ENCERRAR)
              </button>
            `}
          </div>
          
        </div>
      </div>
    `;
  }).join('');
  
  // Atualizar timers imediatamente
  atualizarTimersLocais();
}

function atualizarStatusBadge() {
  const badge = document.getElementById('statusBadge');
  if (!badge) return;
  
  if (casos.length === 0) {
    badge.textContent = 'AGUARDANDO';
    badge.classList.remove('alert');
  } else {
    const naoReconhecidos = casos.filter(c => !c.ccAck).length;
    if (naoReconhecidos > 0) {
      badge.textContent = 'ONDA VERMELHA';
      badge.classList.add('alert');
    } else {
      badge.textContent = 'PREPARANDO SALA';
      badge.classList.remove('alert');
    }
  }
}

// ============================================
// TIMERS LOCAIS
// ============================================

function atualizarTimersLocais() {
  const now = Date.now();
  document.querySelectorAll('.live-timer').forEach(el => {
    const startMs = parseInt(el.getAttribute('data-start'));
    if (startMs) {
      const diff = Math.floor((now - startMs) / 1000);
      el.textContent = formatarTempoCurto(diff);
    }
  });
}

// ============================================
// AÇÕES
// ============================================

async function reconhecerOnda(id, btn) {
  if (btn) {
    btn.textContent = '⏳...';
    btn.disabled = true;
  }
  
  try {
    await casosRef.doc(id).update({
      ccAck: true,
      ccAckTime: agora()
    });
  } catch (error) {
    console.error('Erro ao reconhecer:', error);
    if (btn) {
      btn.textContent = '🔊 RECONHECER E PREPARAR SALA';
      btn.disabled = false;
    }
  }
}

async function encerrarProtocolo(id, btn) {
  if (!confirm('Confirma que o paciente está na mesa cirúrgica?\n\nIsso encerrará o protocolo PTM.')) {
    return;
  }
  
  if (btn) {
    btn.textContent = '⏳ ENCERRANDO...';
    btn.disabled = true;
  }
  
  try {
    await casosRef.doc(id).update({
      status: 'FINALIZADO',
      ccFinalizado: true,
      ccFinalizadoTime: agora(),
      statusNac: 'ENCERRADO NO CENTRO CIRÚRGICO'
    });
    
    alert('✅ Protocolo PTM encerrado com sucesso!\n\nTempo de preparo registrado.');
  } catch (error) {
    console.error('Erro ao encerrar:', error);
    if (btn) {
      btn.textContent = '🏁 PACIENTE NA MESA (ENCERRAR)';
      btn.disabled = false;
    }
    alert('Erro ao encerrar. Tente novamente.');
  }
}

console.log('Centro Cirúrgico Dashboard carregado!');
