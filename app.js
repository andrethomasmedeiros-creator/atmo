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
  // Iniciar relógio
  atualizarRelogio();
  setInterval(atualizarRelogio, 1000);
  
  // Escutar mudanças no Firestore
  escutarCasos();
  
  // Inicializar áudio no primeiro clique
  document.body.addEventListener('click', initAudio, { once: true });
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
// FIRESTORE - ESCUTAR CASOS
// ============================================

function escutarCasos() {
  // Cancelar listener anterior se existir
  if (unsubscribe) unsubscribe();
  
  // Escutar casos ativos em tempo real
  unsubscribe = casosRef
    .where('status', '==', 'ATIVO')
    .orderBy('createdAt', 'desc')
    .onSnapshot((snapshot) => {
      patients = [];
      snapshot.forEach((doc) => {
        patients.push({ id: doc.id, ...doc.data() });
      });
      renderizarPacientes();
      
      // Se não há paciente selecionado e existem pacientes, selecionar o primeiro
      if (!currentPatient && patients.length > 0) {
        selecionarPaciente(patients[0].id);
      }
      
      // Se o paciente atual foi finalizado, limpar tela
      if (currentPatient && !patients.find(p => p.id === currentPatient.id)) {
        currentPatient = null;
        mostrarPainel('empty');
      }
    }, (error) => {
      console.error('Erro ao escutar casos:', error);
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
  const segundos = diffSegundos(timestamp);
  return formatarTempoCurto(segundos);
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

// Novo paciente
function novoPaciente() {
  currentPatient = null;
  mostrarPainel('1');
  
  // Limpar formulário
  document.getElementById('inpIdent').value = '';
  document.getElementById('inpSexo').value = '';
  document.getElementById('inpIdade').value = '';
}

// Iniciar protocolo
async function iniciarProtocolo() {
  const ident = document.getElementById('inpIdent').value;
  if (!ident) {
    alert('Preencha a identificação do paciente!');
    return;
  }
  
  const id = gerarIdCaso();
  
  const novoCaso = {
    id: id,
    ident: ident,
    sexo: document.getElementById('inpSexo').value || 'Não Informado',
    idade: document.getElementById('inpIdade').value || 'Não Informado',
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
  } catch (error) {
    console.error('Erro ao criar caso:', error);
    alert('Erro ao criar caso. Tente novamente.');
  }
}

// Selecionar paciente existente
function selecionarPaciente(id) {
  const paciente = patients.find(p => p.id === id);
  if (paciente) {
    currentPatient = paciente;
    renderizarPacientes();
    
    // Restaurar seleções de critérios
    document.querySelectorAll('.criteria-item').forEach(el => {
      el.classList.remove('selected');
      if (paciente.criterios?.includes(el.dataset.value) || 
          paciente.criteriosOutros?.includes(el.dataset.value)) {
        el.classList.add('selected');
      }
    });
    
    // Restaurar seleções de especialidades
    document.querySelectorAll('.esp-item').forEach(el => {
      el.classList.remove('selected');
      if (paciente.especialidades?.includes(el.dataset.value)) {
        el.classList.add('selected');
      }
    });
    
    // Mostrar painel correto
    mostrarPainel(paciente.currentPanel?.toString() || '2');
    
    // Reiniciar timers se necessário
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
}

// Toggle critérios
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

// Confirmar critérios
async function confirmarCriterios() {
  const mainSelected = [...document.querySelectorAll('.criteria-item.main-criteria.selected')].map(el => el.dataset.value);
  const otherSelected = [...document.querySelectorAll('.criteria-item.other-criteria.selected')].map(el => el.dataset.value);
  
  if (mainSelected.length < 2) {
    alert('⚠️ Selecione pelo menos 2 CRITÉRIOS PRINCIPAIS do protocolo!');
    return;
  }
  
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
  } catch (error) {
    console.error('Erro ao salvar critérios:', error);
    alert('Erro ao salvar. Tente novamente.');
  }
}

// Toggle especialidades
function toggleEsp(el) {
  el.classList.toggle('selected');
}

// Acionar especialista
async function acionarEspecialista() {
  const selected = [...document.querySelectorAll('.esp-item.selected')].map(el => el.dataset.value);
  
  if (selected.length === 0) {
    alert('⚠️ Selecione pelo menos um especialista!');
    return;
  }
  
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
  } catch (error) {
    console.error('Erro ao acionar especialista:', error);
    alert('Erro ao salvar. Tente novamente.');
  }
}

// Especialista chegou
async function especialistaChegou() {
  const btn = document.getElementById('btnEspChegou');
  if (btn) {
    btn.textContent = '✅ PRESENTE';
    btn.disabled = true;
  }
  
  pararTimer('timerEsp');
  
  try {
    await casosRef.doc(currentPatient.id).update({
      espChegou: true,
      espChegouTime: agora(),
      statusNac: 'DECIDINDO ONDA VERMELHA'
    });
  } catch (error) {
    console.error('Erro ao registrar chegada:', error);
  }
}

// Ativar Onda Vermelha
async function ativarOnda(valor) {
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
  } catch (error) {
    console.error('Erro ao registrar onda:', error);
    alert('Erro ao salvar. Tente novamente.');
  }
}

// Iniciar transporte
async function iniciarTransporte() {
  document.getElementById('btnTranspStart').style.display = 'none';
  document.getElementById('btnTranspEnd').style.display = 'block';
  
  try {
    await casosRef.doc(currentPatient.id).update({
      transpTime: agora(),
      statusNac: 'TRANSPORTE A CAMINHO DO C.C.'
    });
    
    iniciarTimer('timerTransp', firebase.firestore.Timestamp.now());
  } catch (error) {
    console.error('Erro ao iniciar transporte:', error);
  }
}

// Finalizar transporte
async function finalizarTransporte() {
  pararTimer('timerTransp');
  
  try {
    await casosRef.doc(currentPatient.id).update({
      transpEnd: true,
      transpEndTime: agora(),
      currentPanel: '6',
      statusNac: 'PACIENTE NO C.C. (AGUARDANDO AUDITORIA)'
    });
    
    mostrarPainel('6');
  } catch (error) {
    console.error('Erro ao finalizar transporte:', error);
  }
}

// Avançar para hemoderivados (onda NÃO)
async function avancarHemo() {
  try {
    await casosRef.doc(currentPatient.id).update({
      currentPanel: '6',
      labReq: true,
      statusNac: 'SOLICITANDO HEMODERIVADOS'
    });
    
    mostrarPainel('6');
  } catch (error) {
    console.error('Erro ao avançar:', error);
  }
}

// Finalizar protocolo
async function finalizarProtocolo() {
  const prontuario = document.getElementById('inpProntuario').value;
  if (!prontuario) {
    alert('Prontuário é obrigatório!');
    return;
  }
  
  const desfecho = document.getElementById('inpDesfecho').value;
  if (!desfecho) {
    alert('Selecione o desfecho!');
    return;
  }
  
  try {
    await casosRef.doc(currentPatient.id).update({
      status: 'FINALIZADO',
      prontuario: prontuario,
      nome: document.getElementById('inpNome').value || 'Não Informado',
      dataNasc: document.getElementById('inpNasc').value || 'Não Informado',
      medico: document.getElementById('inpMedico').value || 'Não Informado',
      desfecho: desfecho,
      finalizadoAt: agora()
    });
    
    currentPatient = null;
    mostrarPainel('empty');
    alert('✅ Protocolo finalizado com sucesso!');
  } catch (error) {
    console.error('Erro ao finalizar:', error);
    alert('Erro ao finalizar. Tente novamente.');
  }
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
      
      // Alerta visual se passar de 10 min
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
