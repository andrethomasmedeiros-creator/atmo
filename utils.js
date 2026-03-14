// ============================================
// UTILS.JS - Utilitários Compartilhados PTM
// ============================================

// ============================================
// SISTEMA DE TOAST (substitui alert())
// ============================================

function mostrarToast(mensagem, tipo = 'info', duracao = 4000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${tipo}`;

  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  toast.innerHTML = `
    <span class="toast-icon">${icons[tipo] || icons.info}</span>
    <span class="toast-msg">${mensagem}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">×</button>
  `;

  container.appendChild(toast);

  // Animação de entrada
  requestAnimationFrame(() => toast.classList.add('toast-visible'));

  // Auto-remover
  setTimeout(() => {
    toast.classList.remove('toast-visible');
    setTimeout(() => toast.remove(), 300);
  }, duracao);
}

// ============================================
// MODAL DE CONFIRMAÇÃO (substitui confirm())
// ============================================

function mostrarConfirmacao(titulo, mensagem, onConfirmar, onCancelar = null) {
  const overlay = document.createElement('div');
  overlay.className = 'confirm-overlay';
  overlay.innerHTML = `
    <div class="confirm-box">
      <div class="confirm-icon">⚠️</div>
      <h3 class="confirm-title">${titulo}</h3>
      <p class="confirm-msg">${mensagem}</p>
      <div class="confirm-actions">
        <button class="confirm-btn confirm-cancel" id="confirmCancelBtn">Cancelar</button>
        <button class="confirm-btn confirm-ok" id="confirmOkBtn">Confirmar</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('confirm-visible'));

  const remover = () => {
    overlay.classList.remove('confirm-visible');
    setTimeout(() => overlay.remove(), 300);
  };

  overlay.querySelector('#confirmOkBtn').addEventListener('click', () => {
    remover();
    if (onConfirmar) onConfirmar();
  });

  overlay.querySelector('#confirmCancelBtn').addEventListener('click', () => {
    remover();
    if (onCancelar) onCancelar();
  });
}

// ============================================
// LOADING STATE EM BOTÕES
// ============================================

function setLoading(btn, loading, textoOriginal = null) {
  if (!btn) return;
  if (loading) {
    btn._textoOriginal = btn.innerHTML;
    btn.innerHTML = '<span class="btn-spinner"></span> Aguardando...';
    btn.disabled = true;
    btn.classList.add('btn-loading');
  } else {
    btn.innerHTML = textoOriginal || btn._textoOriginal || btn.innerHTML;
    btn.disabled = false;
    btn.classList.remove('btn-loading');
  }
}

// ============================================
// INDICADOR DE CONECTIVIDADE
// ============================================

function inicializarConectividade() {
  const indicador = document.getElementById('conectividadeIndicador');
  if (!indicador) return;

  function atualizar(online) {
    indicador.textContent = online ? '● ONLINE' : '● OFFLINE';
    indicador.className = online ? 'conectividade-online' : 'conectividade-offline';
    if (!online) {
      mostrarToast('Sem conexão com a internet. Dados podem estar desatualizados.', 'warning', 0);
    }
  }

  window.addEventListener('online', () => atualizar(true));
  window.addEventListener('offline', () => atualizar(false));
  atualizar(navigator.onLine);
}

// ============================================
// VALIDAÇÃO DE INPUTS
// ============================================

function validarIdentificacao(valor) {
  if (!valor || valor.trim().length === 0) {
    return 'Identificação é obrigatória.';
  }
  if (valor.trim().length < 2) {
    return 'Identificação deve ter ao menos 2 caracteres.';
  }
  if (valor.trim().length > 100) {
    return 'Identificação muito longa (máx. 100 caracteres).';
  }
  // Apenas letras, números, espaços, hífens
  if (!/^[A-Za-zÀ-ÿ0-9\s\-\.\/]+$/.test(valor.trim())) {
    return 'Identificação contém caracteres inválidos.';
  }
  return null;
}

function validarIdade(valor) {
  if (!valor || valor === '') return null; // Opcional
  const num = parseInt(valor);
  if (isNaN(num) || num < 0 || num > 130) {
    return 'Idade inválida (0-130).';
  }
  return null;
}

function validarProntuario(valor) {
  if (!valor || valor.trim().length === 0) {
    return 'Número do prontuário é obrigatório.';
  }
  if (!/^[A-Za-z0-9\-\/\.]+$/.test(valor.trim())) {
    return 'Prontuário contém caracteres inválidos.';
  }
  return null;
}

function mostrarErroCampo(inputEl, mensagem) {
  // Remove erro anterior se existir
  limparErroCampo(inputEl);
  if (!mensagem) return;

  inputEl.classList.add('input-error');
  const span = document.createElement('span');
  span.className = 'campo-erro';
  span.textContent = mensagem;
  inputEl.insertAdjacentElement('afterend', span);
}

function limparErroCampo(inputEl) {
  inputEl.classList.remove('input-error');
  const anterior = inputEl.nextElementSibling;
  if (anterior && anterior.classList.contains('campo-erro')) {
    anterior.remove();
  }
}

// ============================================
// AUDIT LOG
// ============================================

const logsRef = typeof db !== 'undefined' ? db.collection('logs') : null;

function registrarLog(acao, casoId, dados = {}) {
  if (!logsRef) return;

  const entrada = {
    acao,
    casoId: casoId || null,
    dados,
    pagina: window.location.pathname.split('/').pop() || 'index.html',
    ts: firebase.firestore.Timestamp.now(),
    userAgent: navigator.userAgent.substring(0, 100)
  };

  logsRef.add(entrada).catch(err => {
    console.warn('Falha ao registrar log de auditoria:', err);
  });
}

// ============================================
// HASH SHA-256 (para verificação de senha)
// ============================================

async function sha256(texto) {
  const encoder = new TextEncoder();
  const data = encoder.encode(texto);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

console.log('✅ utils.js carregado');
