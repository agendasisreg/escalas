// js/escalas.js
// Versão refatorada com configuração centralizada
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  
  // =====================
  // CONFIGURAÇÕES CENTRALIZADAS
  // =====================
  const UNIDADE_ATUAL = SisregUtils.getUnidade();
  
  // Preencher nome da unidade na tela
  const txtUnidade = document.getElementById("txtUnidade");
  if (txtUnidade) txtUnidade.textContent = UNIDADE_ATUAL;
  
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
  
  // Captura os botões
  const btnExport = document.getElementById("btnExportarCSV");
  const btnLimpar = document.getElementById("btnLimparTudo");
  
  // =====================
  // GERENCIAMENTO DE TABELA LOCAL
  // =====================
  function carregarTabelaLocal() {
    const tabelaBody = document.querySelector("#tabelaEscalas tbody");
    const escalas = SisregUtils.carregarLocalStorage(SISREG_CONFIG.ESCALAS_SALVAS_KEY, []);
    
    tabelaBody.innerHTML = "";
    
    if (escalas.length === 0) {
      tabelaBody.innerHTML = `<tr><td colspan='11' style='text-align:center; padding: 20px; color: ${SISREG_CONFIG.CORES.GRAY};'>${SISREG_CONFIG.MENSAGENS.TABELA_VAZIA}</td></tr>`;
      return;
    }
    
    escalas.forEach((payload, index) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${payload.cpf}</td>
        <td><strong>${payload.profissional}</strong></td>
        <td>${payload.cod_procedimento} - ${payload.procedimento}</td>
        <td>${payload.exames || "-"}</td>
        <td>${payload.dias_semana}</td>
        <td>${payload.hora_inicio}</td>
        <td>${payload.hora_fim}</td>
        <td>${payload.vagas}</td>
        <td>${payload.vigencia_inicio}</td>
        <td>${payload.vigencia_fim}</td>
        <td style="text-align:center;">
          <button class="btn-excluir" data-index="${index}" style="background:none; border:none; cursor:pointer; color:${SISREG_CONFIG.CORES.DANGER}; font-weight:bold; font-size: 1.2rem; padding: 4px 8px; border-radius: 6px; transition: 0.2s;">
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
  
  // =====================
  // LÓGICA DE EXPORTAÇÃO E ENVIO
  // =====================
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
      SisregUtils.showLoading(btnExport, SISREG_CONFIG.BOTOES.TEXTOS.ENVIANDO);
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
  
  // Vincular botão Exportar
  if (btnExport) {
    btnExport.onclick = exportarEEnviar;
  }
  
  // =====================
  // FUNÇÃO LIMPAR TUDO
  // =====================
  function limparTudo() {
    if (!confirm(SISREG_CONFIG.MENSAGENS.CONFIRMAR_LIMPEZA)) return;
    
    SisregUtils.salvarLocalStorage(SISREG_CONFIG.ESCALAS_SALVAS_KEY, []);
    carregarTabelaLocal();
    SisregUtils.showToast("✅ Todos os dados locais foram limpos!", "success");
  }
  
  if (btnLimpar) {
    btnLimpar.onclick = limparTudo;
  }
  
  // =====================
  // LOGOUT
  // =====================
  const btnLogoutTopo = document.getElementById("btnLogoutTopo");
  if (btnLogoutTopo) {
    btnLogoutTopo.onclick = () => {
      window.location.href = SISREG_CONFIG.PAGINAS.INDEX;
    };
  }
  
  // =====================
  // UTILITÁRIOS E AUTOCOMPLETE
  // =====================
  function limparTexto(txt) { return txt ? txt.replace(/"/g, "").trim() : ""; }
  function obterCodigo(p) { return p.cod_int || p["cod int"] || ""; }
  
  // Carregar dados
  Promise.all([
    fetch(SISREG_CONFIG.ARQUIVOS.PROFISSIONAIS).then(r => r.json()),
    fetch(SISREG_CONFIG.ARQUIVOS.PROCEDIMENTOS).then(r => r.json())
  ]).then(([profData, procData]) => {
    profissionais = profData.filter(p => p.unidade === UNIDADE_ATUAL);
    procedimentos = procData;
  });
  
  // Função para formatar dias selecionados
  function formatarDiasSelecionados() {
    const dias = [];
    document.querySelectorAll('.dia-checkbox:checked').forEach(checkbox => {
      dias.push(checkbox.value);
    });
    return dias.join(' ');
  }
  
  // Atualiza o campo oculto quando dias são selecionados
  document.querySelectorAll('.dia-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      diasInput.value = formatarDiasSelecionados();
    });
  });
  
  // =====================
  // CPF BLUR - MOSTRA AVISO SÓ SE PROFISSIONAL NÃO FOR ENCONTRADO
  // =====================
  cpfInput.addEventListener("blur", () => {
    const cpf = cpfInput.value.trim();
    const prof = profissionais.find(p => p.cpf === cpf);
    
    // Limpa aviso se campo estiver vazio
    if (!cpf) {
      avisoInativo.style.display = "none";
      return;
    }
    
    // Mostra aviso apenas se profissional não for encontrado
    if (!prof) {
      avisoInativo.style.display = "block";
      profissionalSelecionado = null;
      nomeInput.value = "";
    } else {
      avisoInativo.style.display = "none";
      profissionalSelecionado = prof;
      nomeInput.value = prof.nome;
    }
  });
  
  // =====================
  // AUTOCOMPLETE NOME
  // =====================
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
          avisoInativo.style.display = "none"; // Profissional válido, não mostra aviso
          listaNomes.style.display = "none";
        };
        listaNomes.appendChild(div);
      });
    
    listaNomes.style.display = "block";
  });
  
  // =====================
  // AUTOCOMPLETE PROCEDIMENTO
  // =====================
  procedimentoInput.addEventListener("input", () => {
    listaProcedimentos.innerHTML = "";
    const termo = procedimentoInput.value.toLowerCase();
    if (termo.length < 2) { 
      listaProcedimentos.style.display = "none"; 
      return; 
    }
    
    procedimentos
      .filter(p => limparTexto(p.procedimento).toLowerCase().includes(termo))
      .slice(0, 30)
      .forEach(p => {
        const codigo = obterCodigo(p);
        const texto = limparTexto(p.procedimento);
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
  
  // =====================
  // SUBMISSÃO DO FORMULÁRIO
  // =====================
  form.addEventListener("submit", e => {
    e.preventDefault();
    
    // Garante que o valor formatado seja enviado
    const dias_semana = diasInput.value;
    
    const payload = {
      cpf: cpfInput.value,
      profissional: nomeInput.value,
      cod_procedimento: procedimentoSelecionado ? obterCodigo(procedimentoSelecionado) : (procedimentoInput.value.split(" - ")[0] || ""),
      procedimento: procedimentoSelecionado ? limparTexto(procedimentoSelecionado.procedimento) : (procedimentoInput.value.split(" - ")[1] || procedimentoInput.value),
      exames: examesInput.value,
      dias_semana: dias_semana,
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
    
    // Limpa checkboxes
    document.querySelectorAll('.dia-checkbox').forEach(checkbox => {
      checkbox.checked = false;
    });
    diasInput.value = "";
    
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
  
  // =====================
  // INICIALIZAÇÃO
  // =====================
  carregarTabelaLocal();
  
});
