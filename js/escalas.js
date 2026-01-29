// js/escalas.js
// Versão refatorada com configuração centralizada
document.addEventListener("DOMContentLoaded", async () => {
  // Carregar configurações
  await SisregUtils.preencherCreditos("footerCreditos");
  
  // =====================
  // CONFIGURAÇÕES LOCAIS
  // =====================
  const UNIDADE_ATUAL = SisregUtils.getUnidade();
  
  // Preencher nome da unidade
  const txtUnidade = document.getElementById("txtUnidade");
  if (txtUnidade) txtUnidade.innerText = UNIDADE_ATUAL;
  
  // =====================
  // VARIÁVEIS
  // =====================
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
  
  // =====================
  // GERENCIAMENTO DE TABELA LOCAL
  // =====================
  function carregarTabelaLocal() {
    const tabelaBody = document.querySelector("#tabelaEscalas tbody");
    const escalas = JSON.parse(localStorage.getItem("escalas_salvas") || "[]");
    
    tabelaBody.innerHTML = "";
    
    if (escalas.length === 0) {
      tabelaBody.innerHTML = `<tr><td colspan='11' style='text-align:center; padding: 20px; color: ${SISREG_CONFIG.COLORS.gray};'>${SISREG_CONFIG.MESSAGES.emptyTable}</td></tr>`;
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
          <button class="btn-excluir" data-index="${index}" title="Excluir">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${SISREG_CONFIG.COLORS.danger}" stroke-width="2">
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
        let atual = JSON.parse(localStorage.getItem("escalas_salvas") || "[]");
        atual.splice(idx, 1);
        localStorage.setItem("escalas_salvas", JSON.stringify(atual));
        carregarTabelaLocal();
      };
    });
  }
  
  // =====================
  // LÓGICA DE EXPORTAÇÃO E ENVIO
  // =====================
  async function exportarEEnviar() {
    const escalas = JSON.parse(localStorage.getItem("escalas_salvas") || "[]");
    
    if (escalas.length === 0) {
      alert(SISREG_CONFIG.MESSAGES.noData);
      return;
    }
    
    if (!confirm(SISREG_CONFIG.MESSAGES.confirmExport)) return;
    
    // 1. GERAR E BAIXAR CSV
    const rows = escalas.map(e => [
      e.cpf, e.profissional, e.cod_procedimento, e.procedimento, e.exames,
      e.dias_semana, e.hora_inicio, e.hora_fim, e.vagas, 
      e.vigencia_inicio, e.vigencia_fim, e.unidade
    ]);
    
    let csvContent = "data:text/csv;charset=utf-8," +
      SISREG_CONFIG.CSV_HEADERS.join(",") + "\n" +
      rows.map(e => e.join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Escalas_${UNIDADE_ATUAL}_${new Date().toLocaleDateString('pt-BR')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // 2. ENVIAR PARA O SHEETS (EM LOTE)
    if (btnExport) {
      btnExport.innerHTML = `<span style="display:inline-flex;align-items:center;gap:6px;"><svg width="16" height="16" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="#fff" stroke-width="2" fill="none"><animate attributeName="stroke-dasharray" values="0,63 63,0" dur="1.5s" repeatCount="indefinite"/></circle></svg>Enviando...</span>`;
      btnExport.disabled = true;
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
      alert("✅ CSV baixado e todos os dados enviados ao Sheets com sucesso!");
      localStorage.setItem("escalas_salvas", "[]");
      carregarTabelaLocal();
    } else {
      alert(`⚠️ CSV baixado, mas houve erro no envio de ${erros} itens para o Sheets. Verifique sua conexão.`);
    }
    
    if (btnExport) {
      btnExport.textContent = "Exportar CSV e Finalizar Escalas";
      btnExport.disabled = false;
    }
  }
  
  // Vincular botão
  if (btnExport) {
    btnExport.onclick = exportarEEnviar;
  }
  
  // =====================
  // UTILITÁRIOS E AUTOCOMPLETE
  // =====================
  function limparTexto(txt) { return txt ? txt.replace(/"/g, "").trim() : ""; }
  function obterCodigo(p) { return p.cod_int || p["cod int"] || ""; }
  
  // Carregar dados
  Promise.all([
    fetch("data/profissionais.json").then(r => r.json()),
    fetch("data/procedimentos_exames.json").then(r => r.json())
  ]).then(([profData, procData]) => {
    profissionais = profData.filter(p => p.unidade === UNIDADE_ATUAL);
    procedimentos = procData;
  });
  
  // Autocomplete CPF
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
  
  // Autocomplete Nome
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
  
  // Autocomplete Procedimento
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
  
  // Submissão do formulário
  form.addEventListener("submit", e => {
    e.preventDefault();
    
    const payload = {
      cpf: cpfInput.value,
      profissional: nomeInput.value,
      cod_procedimento: procedimentoSelecionado ? obterCodigo(procedimentoSelecionado) : (procedimentoInput.value.split(" - ")[0] || ""),
      procedimento: procedimentoSelecionado ? limparTexto(procedimentoSelecionado.procedimento) : (procedimentoInput.value.split(" - ")[1] || procedimentoInput.value),
      exames: examesInput.value,
      dias_semana: diasInput.value,
      hora_inicio: horaInicioInput.value,
      hora_fim: horaFimInput.value,
      vagas: vagasInput.value,
      vigencia_inicio: vigInicioInput.value,
      vigencia_fim: vigFimInput.value,
      unidade: UNIDADE_ATUAL
    };
    
    let locais = JSON.parse(localStorage.getItem("escalas_salvas") || "[]");
    locais.push(payload);
    localStorage.setItem("escalas_salvas", JSON.stringify(locais));
    
    carregarTabelaLocal();
    form.reset();
    examesInput.disabled = true;
    profissionalSelecionado = null;
    procedimentoSelecionado = null;
    
    // Feedback visual
    const card = form.closest('.card');
    card.style.boxShadow = `0 0 20px 4px ${SISREG_CONFIG.COLORS.accent}`;
    setTimeout(() => {
      card.style.boxShadow = "";
    }, 500);
  });
  
  // Carregar tabela inicial
  carregarTabelaLocal();
});
