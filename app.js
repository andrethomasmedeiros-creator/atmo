// ============================================
// PTM SALA VERMELHA - LÓGICA PRINCIPAL
// ============================================

// Estado global
let currentPatient = null;
let patients = [];
let timers = {};
let unsubscribe = null;

// ============================================
// INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  atualizarRelogio();
  setInterval(atualizarRelogio, 1000);

  escutarCasos();
  inicializarConectividade();

  document.body.addEventListener('click', initAudio, { once: true });
});

function atualizarRelogio() {
  const el = document.getElementById('clock');
  if (el) {
    el.textContent = new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }
}

// ============================================
// FIRESTORE - ESCUTAR CASOS
// ============================================

function escutarCasos() {
  if (unsubscribe) unsubscribe();

  unsubscribe = casosRef
    .where('status', '==', 'ATIVO')
    .orderBy('createdAt', 'desc')
    .onSnapshot((snapshot) => {
      patients = [];
      snapshot.forEach((doc) => {
        patients.push({ id: doc.id, ...doc.data() });
      });
      renderizarPacientes();

      if (!currentPatient && patients.length > 0) {
        selecionarPaciente(patients[0].id);
      }

      if (currentPatient && !patients.find(p => p.id === currentPatient.id)) {
        currentPatient = null;
        mostrarPainel('empty');
      }
    }, (error) => {
      console.error('Erro ao escutar casos:', error);
      mostrarToast('Erro de conexão com o banco de dados. Atualize a página.', 'error');
    });
}

// ============================================
// RENDERIZAÇÃO
// ============================================

function renderizarPacientes() {
  const lista = document.getElementById('patientsList');
  if (!lista) return;

  if (patients.length === 0) {
    lista.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 30px;">Nenhum paciente ativo</div>';
    return;
  }

  lista.innerHTML = patients.map(p => `
    <div class="patient-card ${p.id === currentPatient?.id ? 'active' : ''} ${p.currentPanel >= 4 ? 'critical' : ''}"
         onclick="selecionarPaciente('${p.id}')">
      <div class="patient-header">
        <div class="patient-id">${p.id}</div>
        <div class="patient-step">PASSO ${p.currentPanel || 2}</div>
      </div>
      <div class="patient-name">${p.ident || 'Não identificado'}</div>
      <div class="patient-info">${p.sexo || '-'} • ${p.idade || '-'} anos</div>
      <div class="patient-timer">${calcularTempoDecorrido(p.createdAt)}</div>
    </div>
  `).join('');
}

function calcularTempoDecorrido(timestamp) {
  if (!timestamp) return '00:00';
  return formatarTempoCurto(diffSegundos(timestamp));
}

// ============================================
// NAVEGAÇÃO
// ============================================

function mostrarPainel(panelId) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  const panel = document.getElementById(`panel-${panelId}`);
  if (panel) panel.classList.add('active');
  atualizarStepper(panelId);
}

function atualizarStepper(step) {
  const stepMap = { 'empty': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5a': 5, '5b': 5, '6': 5 };
  const currentStep = stepMap[step] || 0;

  document.querySelectorAll('.step').forEach((el, idx) => {
    el.classList.remove('active', 'completed');
    if (idx + 1 < currentStep) el.classList.add('completed');
    if (idx + 1 === currentStep) el.classList.add('active');
  });

  document.querySelectorAll('.step-connector').forEach((el, idx) => {
    el.classList.remove('completed');
    if (idx + 1 < currentStep) el.classList.add('completed');
  });
}

// ============================================
// AÇÕES DO PROTOCOLO
// ============================================

function novoPaciente() {
  currentPatient = null;
  mostrarPainel('1');

  const campos = ['inpIdent', 'inpSexo', 'inpIdade'];
  campos.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.value = '';
      limparErroCampo(el);
    }
  });
}

async function iniciarProtocolo() {
  const identEl = document.getElementById('inpIdent');
  const idadeEl = document.getElementById('inpIdade');
  const ident = identEl?.value?.trim() || '';
  const idade = idadeEl?.value?.trim() || '';

  // Validação
  const erroIdent = validarIdentificacao(ident);
  if (erroIdent) {
    mostrarErroCampo(identEl, erroIdent);
    identEl.focus();
    return;
  }
  limparErroCampo(identEl);

  const erroIdade = validarIdade(idade);
  if (erroIdade) {
    mostrarErroCampo(idadeEl, erroIdade);
    idadeEl.focus();
    return;
  }
  limparErroCampo(idadeEl);

  const btn = document.getElementById('btnIniciarProtocolo');
  setLoading(btn, true);

  const id = gerarIdCaso();
  const novoCaso = {
    id,
    ident,
    sexo: document.getElementById('inpSexo')?.value || 'Não Informado',
    idade: idade || 'Não Informado',
    status: 'ATIVO',
    currentPanel: 2,
    visibleToNac: false,
    statusNac: 'AVALIANDO CRITÉRIOS CLÍNICOS',
    createdAt: agora(),
    criterios: [],
    criteriosOutros: [],
    especialidades: []
  };

  try {
    await casosRef.doc(id).set(novoCaso);
    currentPatient = novoCaso;
    mostrarPainel('2');
    registrarLog('PROTOCOLO_INICIADO', id, { ident, sexo: novoCaso.sexo, idade: novoCaso.idade });
  } catch (error) {
    console.error('Erro ao criar caso:', error);
    mostrarToast('Erro ao criar protocolo. Verifique a conexão e tente novamente.', 'error');
  } finally {
    setLoading(btn, false);
  }
}

function selecionarPaciente(id) {
  const paciente = patients.find(p => p.id === id);
  if (!paciente) return;

  currentPatient = paciente;
  renderizarPacientes();

  document.querySelectorAll('.criteria-item').forEach(el => {
    el.classList.remove('selected');
    if (paciente.criterios?.includes(el.dataset.value) ||
        paciente.criteriosOutros?.includes(el.dataset.value)) {
      el.classList.add('selected');
    }
  });

  document.querySelectorAll('.esp-item').forEach(el => {
    el.classList.remove('selected');
    if (paciente.especialidades?.includes(el.dataset.value)) {
      el.classList.add('selected');
    }
  });

  mostrarPainel(paciente.currentPanel?.toString() || '2');

  if (paciente.nacTime && !paciente.especialidades?.length) {
    iniciarTimer('timerNac', paciente.nacTime);
  }
  if (paciente.espTime && !paciente.espChegou) {
    iniciarTimer('timerEsp', paciente.espTime);
  }
  if (paciente.transpTime && !paciente.transpEnd) {
    iniciarTimer('timerTransp', paciente.transpTime);
  }
}

function toggleCriteria(el) {
  el.classList.toggle('selected');
  atualizarContadorCriterios();
}

function atualizarContadorCriterios() {
  const mainCount = document.querySelectorAll('.criteria-item.main-criteria.selected').length;
  const otherCount = document.querySelectorAll('.criteria-item.other-criteria.selected').length;

  let text = `${mainCount} critérios principais`;
  if (otherCount > 0) text += ` + ${otherCount} de suporte`;

  const counter = document.getElementById('criteriaCounter');
  if (counter) {
    counter.textContent = text;
    counter.style.color = mainCount >= 2 ? 'var(--accent-green)' : 'var(--text-secondary)';
  }
}

async function confirmarCriterios() {
  const mainSelected = [...document.querySelectorAll('.criteria-item.main-criteria.selected')].map(el => el.dataset.value);
  const otherSelected = [...document.querySelectorAll('.criteria-item.other-criteria.selected')].map(el => el.dataset.value);

  if (mainSelected.length < 2) {
    mostrarToast('Selecione pelo menos 2 CRITÉRIOS PRINCIPAIS do protocolo!', 'warning');
    return;
  }

  const btn = document.getElementById('btnConfirmarCriterios');
  setLoading(btn, true);

  try {
    await casosRef.doc(currentPatient.id).update({
      criterios: mainSelected,
      criteriosOutros: otherSelected,
      currentPanel: 3,
      visibleToNac: true,
      statusNac: 'SELECIONANDO MÉDICO ESPECIALISTA',
      nacTime: agora()
    });

    iniciarTimer('timerNac', firebase.firestore.Timestamp.now());
    mostrarPainel('3');
    registrarLog('CRITERIOS_CONFIRMADOS', currentPatient.id, { criterios: mainSelected, criteriosOutros: otherSelected });
  } catch (error) {
    console.error('Erro ao salvar critérios:', error);
    mostrarToast('Erro ao salvar critérios. Verifique a conexão e tente novamente.', 'error');
  } finally {
    setLoading(btn, false);
  }
}

function toggleEsp(el) {
  el.classList.toggle('selected');
}

async function acionarEspecialista() {
  const selected = [...document.querySelectorAll('.esp-item.selected')].map(el => el.dataset.value);

  if (selected.length === 0) {
    mostrarToast('Selecione pelo menos um especialista!', 'warning');
    return;
  }

  const btn = document.getElementById('btnAcionarEsp');
  setLoading(btn, true);

  try {
    await casosRef.doc(currentPatient.id).update({
      especialidades: selected,
      currentPanel: 4,
      statusNac: 'AGUARDANDO ESPECIALISTA NA SALA',
      espTime: agora(),
      nacAck: false
    });

    pararTimer('timerNac');
    iniciarTimer('timerEsp', firebase.firestore.Timestamp.now());
    mostrarPainel('4');
    registrarLog('ESPECIALISTA_ACIONADO', currentPatient.id, { especialidades: selected });
  } catch (error) {
    console.error('Erro ao acionar especialista:', error);
    mostrarToast('Erro ao acionar especialista. Verifique a conexão e tente novamente.', 'error');
  } finally {
    setLoading(btn, false);
  }
}

async function especialistaChegou() {
  const btn = document.getElementById('btnEspChegou');
  setLoading(btn, true);

  pararTimer('timerEsp');

  try {
    await casosRef.doc(currentPatient.id).update({
      espChegou: true,
      espChegouTime: agora(),
      statusNac: 'DECIDINDO ONDA VERMELHA'
    });
    registrarLog('ESPECIALISTA_CHEGOU', currentPatient.id, {});
  } catch (error) {
    console.error('Erro ao registrar chegada:', error);
    mostrarToast('Erro ao registrar chegada do especialista.', 'error');
    setLoading(btn, false, '✅ REGISTRAR CHEGADA');
  }
}

async function ativarOnda(valor) {
  mostrarConfirmacao(
    valor === 'SIM' ? 'Ativar Onda Vermelha?' : 'Confirmar SEM Onda Vermelha?',
    valor === 'SIM'
      ? 'Isso acionará o Centro Cirúrgico e a Agência Transfusional imediatamente.'
      : 'O protocolo seguirá sem acionar o Centro Cirúrgico.',
    async () => {
      const nextPanel = valor === 'SIM' ? '5a' : '5b';
      const statusText = valor === 'SIM' ? 'ACIONANDO TRANSPORTE (C.C.)' : 'SOLICITANDO LABORATÓRIO E AGÊNCIA';

      try {
        await casosRef.doc(currentPatient.id).update({
          onda: valor,
          currentPanel: nextPanel,
          statusNac: statusText,
          ondaTime: agora(),
          ccAck: valor === 'SIM' ? false : null
        });

        mostrarPainel(nextPanel);
        registrarLog('ONDA_DEFINIDA', currentPatient.id, { onda: valor });
      } catch (error) {
        console.error('Erro ao registrar onda:', error);
        mostrarToast('Erro ao registrar decisão de Onda Vermelha. Tente novamente.', 'error');
      }
    }
  );
}

async function iniciarTransporte() {
  const btnStart = document.getElementById('btnTranspStart');
  const btnEnd = document.getElementById('btnTranspEnd');
  setLoading(btnStart, true);

  try {
    await casosRef.doc(currentPatient.id).update({
      transpTime: agora(),
      statusNac: 'TRANSPORTE A CAMINHO DO C.C.'
    });

    if (btnStart) btnStart.style.display = 'none';
    if (btnEnd) btnEnd.style.display = 'block';
    iniciarTimer('timerTransp', firebase.firestore.Timestamp.now());
    registrarLog('TRANSPORTE_INICIADO', currentPatient.id, {});
  } catch (error) {
    console.error('Erro ao iniciar transporte:', error);
    mostrarToast('Erro ao iniciar transporte. Tente novamente.', 'error');
    setLoading(btnStart, false);
  }
}

async function finalizarTransporte() {
  const btn = document.getElementById('btnTranspEnd');
  setLoading(btn, true);
  pararTimer('timerTransp');

  try {
    await casosRef.doc(currentPatient.id).update({
      transpEnd: true,
      transpEndTime: agora(),
      currentPanel: '6',
      statusNac: 'PACIENTE NO C.C. (AGUARDANDO AUDITORIA)'
    });

    mostrarPainel('6');
    registrarLog('TRANSPORTE_FINALIZADO', currentPatient.id, {});
  } catch (error) {
    console.error('Erro ao finalizar transporte:', error);
    mostrarToast('Erro ao finalizar transporte. Tente novamente.', 'error');
    setLoading(btn, false);
  }
}

async function avancarHemo() {
  const btn = document.getElementById('btnAvancarHemo');
  setLoading(btn, true);

  try {
    await casosRef.doc(currentPatient.id).update({
      currentPanel: '6',
      labReq: true,
      statusNac: 'SOLICITANDO HEMODERIVADOS',
      hemoStartTime: agora()
    });

    mostrarPainel('6');
    registrarLog('HEMO_SOLICITADO', currentPatient.id, {});
  } catch (error) {
    console.error('Erro ao avançar:', error);
    mostrarToast('Erro ao avançar. Tente novamente.', 'error');
    setLoading(btn, false);
  }
}

async function finalizarProtocolo() {
  const prontuarioEl = document.getElementById('inpProntuario');
  const desfechoEl = document.getElementById('inpDesfecho');
  const prontuario = prontuarioEl?.value?.trim() || '';
  const desfecho = desfechoEl?.value || '';

  // Validações
  const erroProntuario = validarProntuario(prontuario);
  if (erroProntuario) {
    mostrarErroCampo(prontuarioEl, erroProntuario);
    prontuarioEl.focus();
    return;
  }
  limparErroCampo(prontuarioEl);

  if (!desfecho) {
    mostrarToast('Selecione o desfecho do protocolo!', 'warning');
    return;
  }

  mostrarConfirmacao(
    'Finalizar Protocolo PTM?',
    `Isso encerrará o protocolo para o paciente <strong>${currentPatient.ident}</strong>. Esta ação não pode ser desfeita.`,
    async () => {
      const btn = document.getElementById('btnFinalizarProtocolo');
      setLoading(btn, true);

      try {
        await casosRef.doc(currentPatient.id).update({
          status: 'FINALIZADO',
          prontuario,
          nome: document.getElementById('inpNome')?.value?.trim() || 'Não Informado',
          dataNasc: document.getElementById('inpNasc')?.value || 'Não Informado',
          medico: document.getElementById('inpMedico')?.value?.trim() || 'Não Informado',
          desfecho,
          finalizadoAt: agora()
        });

        registrarLog('PROTOCOLO_FINALIZADO', currentPatient.id, { desfecho, prontuario });
        currentPatient = null;
        mostrarPainel('empty');
        mostrarToast('Protocolo finalizado com sucesso!', 'success');
      } catch (error) {
        console.error('Erro ao finalizar:', error);
        mostrarToast('Erro ao finalizar protocolo. Tente novamente.', 'error');
        setLoading(btn, false);
      }
    }
  );
}

// ============================================
// TIMERS
// ============================================

function iniciarTimer(elementId, timestamp) {
  if (timers[elementId]) clearInterval(timers[elementId]);

  const startMs = timestamp.toMillis ? timestamp.toMillis() : timestamp;

  timers[elementId] = setInterval(() => {
    const diff = Math.floor((Date.now() - startMs) / 1000);
    const el = document.getElementById(elementId);
    if (el) {
      el.textContent = formatarTempoCurto(diff);
      if (diff >= 600 && el.parentElement) {
        el.parentElement.classList.add('critical');
      }
    }
  }, 1000);
}

function pararTimer(elementId) {
  if (timers[elementId]) {
    clearInterval(timers[elementId]);
    delete timers[elementId];
  }
}

console.log('App Sala Vermelha carregado!');
// ==========================================
// MÓDULO DE COMANDOS DE VOZ (HANDS-FREE)
// ==========================================

// O event listener DOMContentLoaded garante que a página já carregou toda
document.addEventListener('DOMContentLoaded', () => {
  const btnVoz = document.getElementById('btn-voz');
  
  if (!btnVoz) {
    console.error("Botão de voz não encontrado no HTML!");
    return; 
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR'; 
    recognition.continuous = false; 

    btnVoz.addEventListener('click', () => {
      try {
        recognition.start();
        btnVoz.style.backgroundColor = "#28a745"; 
        btnVoz.innerHTML = "🎙️"; 
        console.log("Microfone aberto: A escutar o médico...");
      } catch (e) {
        console.log("O microfone já está ligado ou houve um erro: ", e);
      }
    });

    recognition.onresult = (event) => {
      const transcricao = event.results[0][0].transcript;
      alert("Comando de voz reconhecido:\n\n" + transcricao); 
      btnVoz.style.backgroundColor = "#dc3545";
      btnVoz.innerHTML = "🎤";
    };

    recognition.onerror = (event) => {
      console.error("Erro no comando de voz: ", event.error);
      alert("Erro ao usar o microfone: " + event.error);
      btnVoz.style.backgroundColor = "#dc3545";
      btnVoz.innerHTML = "🎤";
    };
  } else {
    alert("O seu navegador não suporta comandos de voz nativos.");
    btnVoz.style.display = 'none'; 
  }
});
}
