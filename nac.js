// ============================================
// NAC DASHBOARD - LÓGICA PRINCIPAL
// ============================================

let casos = [];
let unsubscribe = null;
let audioAtivo = false;

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
  escutarCasosNac();
  
  // Alarme periódico
  setInterval(verificarAlarmes, 3000);
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
  
  // Verificar se há casos não silenciados
  const casoNaoSilenciado = casos.find(c => !c.nacAck);
  if (casoNaoSilenciado) {
    tocarAlarme('urgente');
  }
}

// ============================================
// FIRESTORE - ESCUTAR CASOS
// ============================================

function escutarCasosNac() {
  if (unsubscribe) unsubscribe();
  
  // Escutar casos visíveis ao NAC
  unsubscribe = casosRef
    .where('status', '==', 'ATIVO')
    .where('visibleToNac', '==', true)
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
    const isOnda = c.onda === 'SIM';
    const hasEsp = c.especialidades && c.especialidades.length > 0;
    const isGlow = (!c.espChegou && c.nacAcionouEspTime && diffSegundos(c.nacAcionouEspTime) >= 600) ||
                   (c.transpTime && !c.transpEnd && diffSegundos(c.transpTime) >= 600);
    
    // Status do especialista
    let espUI = '';
    if (c.espChegou) {
      espUI = '<div class="status-tag" style="background:#065f46; color:#34d399;">ESPEC. NA SALA ✅</div>';
    } else if (c.nacAcionouEspTime) {
      const mins = Math.floor(diffSegundos(c.nacAcionouEspTime) / 60);
      const cor = mins >= 10 ? 'background:#7f1d1d; color:#fca5a5;' : 'background:#7c2d12; color:#fdba74;';
      espUI = `<div class="status-tag" style="${cor}">ESPEC. AVISADO: <span class="live-timer" data-start="${c.nacAcionouEspTime?.toMillis?.() || c.nacAcionouEspTime}">--:--</span></div>`;
    } else {
      espUI = '<div class="status-tag" style="background:#334155; color:#94a3b8;">ESPEC: AGUARDANDO LIGAÇÃO</div>';
    }
    
    // Timer
    let timerUI = '';
    if (c.transpTime && !c.transpEnd) {
      timerUI = `<div class="timer"><span class="live-timer" data-start="${c.transpTime?.toMillis?.() || c.transpTime}">--:--</span></div>`;
    } else if (c.hemoStartTime) {
      timerUI = `<div class="timer"><span class="live-timer" data-start="${c.hemoStartTime?.toMillis?.() || c.hemoStartTime}">--:--</span></div>`;
    }
    
    // Critérios
    const criteriosUI = (c.criterios || []).map(cr => 
      `<span class="criterio-pill">${cr}</span>`
    ).join('');
    
    return `
      <div class="case-card ${!c.nacAck ? 'needs-attention' : ''} ${isOnda ? 'onda-ativa' : ''}">
        <div class="card-header">
          <div class="patient-info">
            <div class="patient-avatar">${(c.ident || 'P')[0].toUpperCase()}</div>
            <div class="patient-details">
              <h3>${c.ident || 'NÃO IDENTIFICADO'}</h3>
              <span>${c.sexo || '-'} • ${c.idade || '-'} anos</span>
            </div>
          </div>
          <div class="patient-id">${c.id}</div>
        </div>
        
        <div class="card-body">
          ${isOnda ? `
            <div class="onda-alert">
              <h4>🚨 ONDA VERMELHA ATIVADA</h4>
              <p>Acionar Centro Cirúrgico e Agência Transfusional</p>
            </div>
          ` : ''}
          
          <div class="realtime-status">
            <div class="label">Status em Tempo Real</div>
            <div class="value">${c.statusNac || 'AVALIANDO PACIENTE'}</div>
          </div>
          
          ${hasEsp ? `
            <div class="especialidade-tag">
              <span class="icon">📞</span>
              LIGAR PARA: ${c.especialidades.join(' + ')}
            </div>
          ` : ''}
          
          ${timerUI ? `
            <div class="big-timer ${isGlow ? 'critical' : ''}">
              <div class="label">Tempo desde acionamento</div>
              ${timerUI}
            </div>
          ` : ''}
          
          ${criteriosUI ? `
            <div class="criterios-list">${criteriosUI}</div>
          ` : ''}
          
          <div class="info-grid">
            <div class="info-item ${isOnda ? 'highlight' : ''}">
              <div class="label">Onda Vermelha</div>
              <div class="value">${c.onda || 'PENDENTE'}</div>
            </div>
            <div class="info-item">
              <div class="label">Especialista</div>
              <div class="value">${c.espChegou ? 'PRESENTE' : 'AGUARDANDO'}</div>
            </div>
          </div>
          
          <div class="action-buttons">
            ${!c.nacAck ? `
              <button class="btn btn-silenciar" onclick="silenciarAlarme('${c.id}', this)">
                🔊 SILENCIAR
              </button>
            ` : `
              <span class="btn btn-silenciado">✅ SILENCIADO</span>
            `}
            ${!c.nacAcionouEspTime ? `
              <button class="btn btn-ligar" onclick="registrarLigacao('${c.id}', this)">
                📞 REGISTRAR LIGAÇÃO
              </button>
            ` : `
              <span class="btn btn-ligado">✅ MÉDICO AVISADO</span>
            `}
          </div>
        </div>
        
        <div class="card-footer">
          <div class="footer-info">Abertura: ${formatarHora(c.createdAt)}</div>
          <div class="footer-timer">Tempo total: <span class="live-timer" data-start="${c.createdAt?.toMillis?.() || c.createdAt}">--:--</span></div>
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
    badge.textContent = 'SISTEMA OPERACIONAL';
    badge.classList.remove('alert');
  } else {
    badge.textContent = `${casos.length} PTM ATIVO${casos.length > 1 ? 'S' : ''}`;
    badge.classList.add('alert');
  }
}

function formatarHora(timestamp) {
  if (!timestamp) return '--:--:--';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
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

async function silenciarAlarme(id, btn) {
  if (btn) {
    btn.textContent = '⏳...';
    btn.disabled = true;
  }
  
  try {
    await casosRef.doc(id).update({
      nacAck: true,
      nacAckTime: agora()
    });
  } catch (error) {
    console.error('Erro ao silenciar:', error);
    if (btn) {
      btn.textContent = '🔊 SILENCIAR';
      btn.disabled = false;
    }
  }
}

async function registrarLigacao(id, btn) {
  if (btn) {
    btn.textContent = '⏳...';
    btn.disabled = true;
  }
  
  try {
    await casosRef.doc(id).update({
      nacAcionouEspTime: agora()
    });
  } catch (error) {
    console.error('Erro ao registrar ligação:', error);
    if (btn) {
      btn.textContent = '📞 REGISTRAR LIGAÇÃO';
      btn.disabled = false;
    }
  }
}

console.log('NAC Dashboard carregado!');
