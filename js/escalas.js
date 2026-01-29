// js/escalas.js
// Versão refatorada com configuração centralizada
// ============================================================

document.addEventListener("DOMContentLoaded", async () => {
  
  // ==================== INICIALIZAÇÃO ====================
  
  // Carregar créditos
  await SisregUtils.preencherCreditos("footerCreditos");
  
  // Obter unidade atual
  const UNIDADE_ATUAL = SisregUtils.getUnidade();
  
  // Preencher nome da unidade na tela
  const txtUnidade = document.getElementById("txtUnidade");
  if (txtUnidade) txtUnidade.textContent = UNIDADE_ATUAL;
  
  // ==================== VARIÁVEIS ====================
  
  let profissionais = [];
  let procedimentos = [];
  let profissionalSelecionado = null;
  let procedimentoSelecionado = null;
  
  // ===== CAMPOS DO FORMULÁRIO =====
  const form = document.getElementById("formEscala");
  const cpfInput = document.getElementById("cpfInput");
  const nomeInput = document.getElementById("nomeInput");
  const listaNomes = document.getElementById("listaNomes");
  const avisoInativo = document.getElementById("avisoInativo");
  const procedimentoInput = document.getElementById("procedimentoInput");
  const listaProcedimentos = document.getElementById("listaProcedimentos");
  const examesInput = document.getElementById("examesInput");
  const diasInput = document.getElementById("dias");
  const horaInicioInput = document.getElementById("horaInicio");
  const horaFimInput = document.getElementById("horaFim");
  const vagasInput = document.getElementById("vagas");
  const vigInicioInput = document.getElementById("vigenciaInicio");
  const vigFimInput = document.getElementById("vigenciaFim");
  const btnExport = document.getElementById("btnExportarCSV");
  const btnLimpar = document.getElementById("btnLimparTudo");
  
  // ==================== CARREGAMENTO DE DADOS ====================
  
  // Carregar profissionais e procedimentos
  try {
    const [profData, procData] = await Promise.all([
      SisregUtils.carregarDadosJson(SISREG_CONFIG.ARQUIVOS.PROFISSIONAIS),
      SisregUtils.carregarDadosJson(SISREG_CONFIG.ARQUIVOS.PROCEDIMENTOS)
    ]);
    
    if (profData) {
      profissionais = profData.filter(p => p.unidade === UNIDADE_ATUAL);
    }
    
    if (procData) {
      procedimentos = procData;
    }
  } catch (error) {
    console.error("Erro ao carregar dados:", error);
    SisregUtils.showToast(SISREG_CONFIG.MENSAGENS.ERRO_CONEXAO, "error");
  }
  
  // ==================== FUNÇÕES PRINCIPAIS ====================
  
  /**
   * Carrega tabela local com dados salvos
   */
  function carregarTabelaLocal() {
    const tabelaBody = document.querySelector("#tabelaEscalas tbody");
    const escalas = SisregUtils.carregarLocalStorage(SISREG_CONFIG.ESCALAS_SALVAS_KEY, []);
    
    tabelaBody.innerHTML = "";
    
    if (escalas.length === 0) {
      tabelaBody.innerHTML = `
        <tr>
          <td colspan='11' style='text-align:center; padding: 40px 20px; color: ${SISREG_CONFIG.CORES.GRAY}; font-size: 1.1rem;'>
            ${SISREG_CONFIG.MENSAGENS.TABELA_VAZIA}
          </td>
        </tr>
      `;
      return;
    }
    
    escalas.forEach((payload, index) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${payload.cpf || ''}</td>
        <td><strong>${payload.profissional || ''}</strong></td>
        <td>${payload.cod_procedimento || ''} - ${payload.procedimento || ''}</td>
        <td>${payload.exames || '-'}</td>
        <td>${payload.dias_semana || ''}</td>
        <td>${payload.hora_inicio || ''}</td>
        <td>${payload.hora_fim || ''}</td>
        <td>${payload.vagas || 0}</td>
        <td>${SisregUtils.formatarDataBR(payload.vigencia_inicio)}</td>
        <td>${SisregUtils.formatarDataBR(payload.vigencia_fim)}</td>
        <td style="text-align:center;">
          <button class="btn-excluir" data-index="${index}" title="Excluir" style="background:none; border:none; cursor:pointer; color:${SISREG_CONFIG.CORES.DANGER}; font-weight:bold; font-size: 1.2rem; padding: 4px 8px; border-radius: 6px; transition: 0.2s;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${SISREG_CONFIG.CORES.DANGER}" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"></path>
            </svg>
          </button>
        </td>
      `;
      tabelaBody.appendChild(tr);
    });
    
    // Eventos de exclusão
    document.querySelectorAll(".btn-excluir").forEach(btn => {
      btn.onclick = (e) => {
        const idx = e.target.closest("button").getAttribute("data-index");
        let atual = SisregUtils.carregarLocalStorage(SISREG_CONFIG.ESCALAS_SALVAS_KEY, []);
        atual.splice(idx, 1);
        SisregUtils.salvarLocalStorage(SISREG_CONFIG.ESCALAS_SALVAS_KEY, atual);
        carregarTabelaLocal();
        SisregUtils.showToast(SISREG_CONFIG.MENSAGENS.ITEM_EXCLUIDO, "success");
      };
    });
  }
  
  /**
   * Exporta dados para CSV e envia para API
   */
  async function exportarEEnviar() {
    const escalas = SisregUtils.carregarLocalStorage(SISREG_CONFIG.ESCALAS_SALVAS_KEY, []);
    
    if (escalas.length === 0) {
      SisregUtils.showToast(SISREG_CONFIG.MENSAGENS.NENHUM_DADO, "warning");
      return;
    }
    
    if (!confirm(SISREG_CONFIG.MENSAGENS.CONFIRMAR_EXPORTACAO)) return;
    
    // 1. GERAR E BAIXAR CSV
    const csvContent = SisregUtils.gerarCSV(escalas);
    SisregUtils.baixarCSV(csvContent);
    
    // 2. ENVIAR PARA O SHEETS (EM LOTE)
    if (btnExport) {
      SisregUtils.showLoading(btnExport, "Enviando para Nuvem...");
    }
    
    let erros = 0;
    for (let item of escalas) {
      try {
        await fetch(SISREG_CONFIG.API_URL, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain" },
          body: JSON.stringify(item)
        });
      } catch (err) {
        erros++;
      }
    }
    
    if (erros === 0) {
      SisregUtils.showToast(SISREG_CONFIG.MENSAGENS.EXPORTADO_SUCESSO, "success");
      SisregUtils.salvarLocalStorage(SISREG_CONFIG.ESCALAS_SALVAS_KEY, []);
      carregarTabelaLocal();
    } else {
      const msgErro = SISREG_CONFIG.MENSAGENS.EXPORTADO_ERRO.replace("{erros}", erros);
      SisregUtils.showToast(msgErro, "warning");
    }
    
    if (btnExport) {
      SisregUtils.hideLoading(btnExport);
    }
  }
  
  /**
   * Limpa todos os dados locais
   */
  function limparTudo() {
    if (!confirm(SISREG_CONFIG.MENSAGENS.CONFIRMAR_LIMPEZA)) return;
    
    SisregUtils.salvarLocalStorage(SISREG_CONFIG.ESCALAS_SALVAS_KEY, []);
    carregarTabelaLocal();
    SisregUtils.showToast("✅ Todos os dados locais foram limpos!", "success");
  }
  
  // ==================== EVENTOS ====================
  
  // Botão Exportar
  if (btnExport) {
    btnExport.onclick = exportarEEnviar;
  }
  
  // Botão Limpar
  if (btnLimpar) {
    btnLimpar.onclick = limparTudo;
  }
  
  // Logout
  const btnLogoutTopo = document.getElementById("btnLogoutTopo");
  if (btnLogoutTopo) {
    btnLogoutTopo.onclick = () => {
      window.location.href = SISREG_CONFIG.PAGINAS.INDEX;
    };
  }
  
  // ==================== AUTOCOMPLETE CPF/NOME ====================
  
  cpfInput.addEventListener("blur", () => {
    const prof = profissionais.find(p => p.cpf === cpfInput.value.trim());
    avisoInativo.style.display = "none";
    if (prof) {
      profissionalSelecionado = prof;
      nomeInput.value = prof.nome;
      if (prof.status === "INATIVO") {
        avisoInativo.style.display = "block";
      }
    }
  });
  
  nomeInput.addEventListener("input", () => {
    listaNomes.innerHTML = "";
    const termo = nomeInput.value.toLowerCase();
    if (termo.length < 2) { 
      listaNomes.style.display = "none"; 
      return; 
    }
    
    profissionais
      .filter(p => p.status === "ATIVO")
      .filter(p => p.nome.toLowerCase().includes(termo))
      .slice(0, 10)
      .forEach(p => {
        const div = document.createElement("div");
        div.textContent = `${p.nome} (${p.cpf})`;
        div.onclick = () => {
          profissionalSelecionado = p;
          cpfInput.value = p.cpf;
          nomeInput.value = p.nome;
          avisoInativo.style.display = p.status === "INATIVO" ? "block" : "none";
          listaNomes.style.display = "none";
        };
        listaNomes.appendChild(div);
      });
    
    listaNomes.style.display = "block";
  });
  
  // ==================== AUTOCOMPLETE PROCEDIMENTO ====================
  
  procedimentoInput.addEventListener("input", () => {
    listaProcedimentos.innerHTML = "";
    const termo = procedimentoInput.value.toLowerCase();
    if (termo.length < 2) { 
      listaProcedimentos.style.display = "none"; 
      return; 
    }
    
    procedimentos
      .filter(p => SisregUtils.limparTexto(p.procedimento).toLowerCase().includes(termo))
      .slice(0, 30)
      .forEach(p => {
        const codigo = p.cod_int || p["cod int"] || "";
        const texto = SisregUtils.limparTexto(p.procedimento);
        const div = document.createElement("div");
        div.textContent = `${codigo} - ${texto}`;
        div.onclick = () => {
          procedimentoSelecionado = p;
          procedimentoInput.value = `${codigo} - ${texto}`;
          examesInput.disabled = !texto.toUpperCase().startsWith("GRUPO");
          if (examesInput.disabled) examesInput.value = "";
          listaProcedimentos.style.display = "none";
        };
        listaProcedimentos.appendChild(div);
      });
    
    listaProcedimentos.style.display = "block";
  });
  
  // ==================== SUBMISSÃO DO FORMULÁRIO ====================
  
  form.addEventListener("submit", e => {
    e.preventDefault();
    
    const payload = {
      cpf: cpfInput.value,
      profissional: nomeInput.value,
      cod_procedimento: procedimentoSelecionado ? (procedimentoSelecionado.cod_int || procedimentoSelecionado["cod int"] || "") : (procedimentoInput.value.split(" - ")[0] || ""),
      procedimento: procedimentoSelecionado ? SisregUtils.limparTexto(procedimentoSelecionado.procedimento) : (procedimentoInput.value.split(" - ")[1] || procedimentoInput.value),
      exames: examesInput.value,
      dias_semana: diasInput.value,
      hora_inicio: horaInicioInput.value,
      hora_fim: horaFimInput.value,
      vagas: vagasInput.value,
      vigencia_inicio: vigInicioInput.value,
      vigencia_fim: vigFimInput.value,
      unidade: UNIDADE_ATUAL
    };
    
    let locais = SisregUtils.carregarLocalStorage(SISREG_CONFIG.ESCALAS_SALVAS_KEY, []);
    locais.push(payload);
    SisregUtils.salvarLocalStorage(SISREG_CONFIG.ESCALAS_SALVAS_KEY, locais);
    
    carregarTabelaLocal();
    form.reset();
    examesInput.disabled = true;
    profissionalSelecionado = null;
    procedimentoSelecionado = null;
    
    // Feedback visual
    const card = form.closest('.card');
    if (card) {
      card.style.boxShadow = `0 0 30px 6px ${SISREG_CONFIG.CORES.ACCENT}`;
      setTimeout(() => {
        card.style.boxShadow = "";
      }, 600);
    }
    
    SisregUtils.showToast(SISREG_CONFIG.MENSAGENS.DADOS_SALVOS, "success");
  });
  
  // ==================== INICIALIZAÇÃO ====================
  
  // Carregar tabela inicial
  carregarTabelaLocal();
  
});
