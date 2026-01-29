// js/dashboard.js
// Versão refatorada com configuração centralizada
// ============================================================

document.addEventListener("DOMContentLoaded", async () => {
  
  // ==================== INICIALIZAÇÃO ====================
  
  // Carregar créditos
  await SisregUtils.preencherCreditos("footerCreditos");
  
  // Obter unidade atual
  const UNIDADE = SisregUtils.getUnidade();
  const CACHE_KEY = SisregUtils.getCacheKey(UNIDADE);
  
  // Preencher nome da unidade na tela
  const txtUnidadeEl = document.getElementById("txtUnidade");
  if (txtUnidadeEl) txtUnidadeEl.textContent = UNIDADE;
  
  // ==================== VARIÁVEIS ====================
  
  let charts = {}; // Armazena instâncias dos gráficos
  
  // ==================== FUNÇÕES PRINCIPAIS ====================
  
  /**
   * Atualiza os cards KPI com base nos dados
   * @param {Array} dadosFiltrados - Dados filtrados
   */
  function atualizarCards(dadosFiltrados) {
    const kpiVagas = document.getElementById("kpiVagas");
    const kpiProfs = document.getElementById("kpiProfissionais");
    const kpiLider = document.getElementById("kpiLider");
    const kpiRetorno = document.getElementById("kpiRetorno");
    const kpiProcedimentos = document.getElementById("kpiProcedimentos");
    
    if (!dadosFiltrados || dadosFiltrados.length === 0) {
      if (kpiVagas) kpiVagas.textContent = "0";
      if (kpiProfs) kpiProfs.textContent = "0";
      if (kpiLider) kpiLider.textContent = "-";
      if (kpiRetorno) kpiRetorno.textContent = "0%";
      if (kpiProcedimentos) kpiProcedimentos.textContent = "0";
      return;
    }
    
    let totalVagas = 0;
    let vagasRetorno = 0;
    const cpfs = new Set();
    const procsUnicos = new Set();
    const contagemProcs = {};
    
    dadosFiltrados.forEach(item => {
      const d = SisregUtils.normalizarItem(item);
      totalVagas += d.vagas;
      
      const campoProc = String(d.procedimento || "").toUpperCase().trim();
      const campoExame = String(d.exames || "").toUpperCase().trim();
      
      if (campoProc.includes("RETORNO") || campoExame.includes("RETORNO")) {
        vagasRetorno += d.vagas;
      }
      
      if (d.cpf) cpfs.add(d.cpf);
      if (d.procedimento) {
        const procKey = d.procedimento.trim();
        procsUnicos.add(procKey);
        contagemProcs[procKey] = (contagemProcs[procKey] || 0) + 1;
      }
    });
    
    const nProfs = cpfs.size;
    const nProcs = procsUnicos.size;
    const percRetorno = totalVagas > 0 ? Math.round((vagasRetorno / totalVagas) * 100) : 0;
    
    // Encontrar procedimento líder
    let liderNome = "-";
    const chaves = Object.keys(contagemProcs);
    if (chaves.length > 0) {
      liderNome = chaves.reduce((a, b) => contagemProcs[a] > contagemProcs[b] ? a : b);
    }
    
    // Atualizar UI
    if (kpiVagas) kpiVagas.textContent = SisregUtils.formatarNumero(totalVagas);
    if (kpiProfs) kpiProfs.textContent = nProfs;
    if (kpiProcedimentos) kpiProcedimentos.textContent = nProcs;
    if (kpiLider) kpiLider.textContent = liderNome;
    if (kpiRetorno) kpiRetorno.textContent = `${percRetorno}%`;
  }
  
  /**
   * Renderiza dados na tabela
   * @param {Array} dadosRaw - Dados brutos
   */
  function renderizarDados(dadosRaw) {
    const tbody = document.getElementById("corpoTabela");
    if (!tbody) return;
    
    const dados = SisregUtils.normalizarLista(dadosRaw);
    
    if (!dados || dados.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan='11' style='text-align:center; padding: 40px 20px; color: ${SISREG_CONFIG.CORES.GRAY}; font-size: 1.1rem;'>
            ${SISREG_CONFIG.MENSAGENS.NENHUM_DADO}
          </td>
        </tr>
      `;
      return;
    }
    
    tbody.innerHTML = dados.map(d => {
      const mesISO = d.vigencia_inicio ? String(d.vigencia_inicio).split('-')[1] : "";
      return `
        <tr data-mes="${mesISO}">
          <td>${d.cpf || ''}</td>
          <td><strong>${d.profissional || ''}</strong></td>
          <td>${d.cod_procedimento || ''}</td>
          <td>${d.procedimento || ''}</td>
          <td>${d.exames || ''}</td>
          <td>${d.dias_semana || ''}</td>
          <td>${SisregUtils.formatarHora(d.hora_inicio)}</td>
          <td>${SisregUtils.formatarHora(d.hora_fim)}</td>
          <td>${d.vagas || 0}</td>
          <td>${SisregUtils.formatarDataBR(d.vigencia_inicio)}</td>
          <td>${SisregUtils.formatarDataBR(d.vigencia_fim)}</td>
        </tr>
      `;
    }).join('');
    
    atualizarCards(dados);
    filtrarTabela();
  }
  
  /**
   * Filtra tabela por mês
   */
  function filtrarTabela() {
    const mesSelecionado = document.getElementById("filtroMes").value;
    const linhas = document.querySelectorAll("#corpoTabela tr");
    let dadosParaKPI = [];
    
    // Recuperar dados do cache para recalcular os cards
    const cache = SisregUtils.normalizarLista(
      SisregUtils.carregarLocalStorage(CACHE_KEY, [])
    );
    
    linhas.forEach((linha, index) => {
      const dataVigencia = linha.getAttribute("data-mes");
      if (mesSelecionado === "todos" || dataVigencia === mesSelecionado) {
        linha.style.display = "";
        if (cache[index]) dadosParaKPI.push(cache[index]);
      } else {
        linha.style.display = "none";
      }
    });
    
    // Atualizar KPIs com dados filtrados
    atualizarCards(dadosParaKPI);
  }
  
  // ==================== EVENTOS ====================
  
  // Filtro de mês
  document.getElementById("filtroMes")?.addEventListener("change", filtrarTabela);
  
  // Sincronizar com API
  document.getElementById("btnSincronizar").onclick = async function() {
    const btn = this;
    SisregUtils.showLoading(btn, "Sincronizando...");
    
    try {
      const resp = await fetch(`${SISREG_CONFIG.API_URL}?unidade=${encodeURIComponent(UNIDADE)}&t=${Date.now()}`);
      const res = await resp.json();
      
      if (res.status === "OK") {
        const dadosNorm = SisregUtils.normalizarLista(res.dados);
        SisregUtils.salvarLocalStorage(CACHE_KEY, dadosNorm);
        renderizarDados(dadosNorm);
        SisregUtils.showToast(SISREG_CONFIG.MENSAGENS.SINCRONIZADO, "success");
      } else {
        SisregUtils.showToast(SISREG_CONFIG.MENSAGENS.ERRO_SHEETS, "warning");
      }
    } catch (e) {
      SisregUtils.showToast(SISREG_CONFIG.MENSAGENS.ERRO_CONEXAO, "error");
    } finally {
      SisregUtils.hideLoading(btn);
    }
  };
  
  // Logout
  document.getElementById("btnLogout").onclick = () => {
    window.location.href = SISREG_CONFIG.PAGINAS.INDEX;
  };
  
  // Toggle tabela
  document.getElementById("btnToggleTabela").onclick = () => {
    const sec = document.getElementById("secTabela");
    const aberto = sec.style.display === "block";
    sec.style.display = aberto ? "none" : "block";
    document.getElementById("btnToggleTabela").textContent = 
      aberto ? "📋 Ver Tabela" : "📋 Ocultar Tabela";
  };
  
  // Exportar PDF
  document.getElementById("btnExportarPDF").onclick = async () => {
    const area = document.getElementById("dashboardArea");
    if (!area) return;
    
    SisregUtils.showToast("📝 Gerando PDF...", "info");
    
    // Aguarda um frame para melhor captura
    await new Promise(r => requestAnimationFrame(r));
    
    try {
      const canvas = await html2canvas(area, { 
        scale: 2, 
        useCORS: true,
        logging: false
      });
      
      const img = canvas.toDataURL("image/png");
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF("p", "mm", "a4");
      const pageW = 210;
      const imgW = pageW;
      const imgH = (canvas.height * imgW) / canvas.width;
      
      pdf.addImage(img, "PNG", 0, 10, imgW, imgH);
      
      const unidade = (document.getElementById("txtUnidade")?.textContent || "UNIDADE").trim();
      pdf.save(`Dashboard_${unidade}.pdf`);
      
      SisregUtils.showToast("✅ PDF exportado com sucesso!", "success");
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      SisregUtils.showToast("❌ Erro ao gerar PDF", "error");
    }
  };
  
  // ==================== INICIALIZAÇÃO ====================
  
  // Carregar dados do cache
  const dadosSalvos = SisregUtils.carregarLocalStorage(CACHE_KEY);
  if (dadosSalvos && dadosSalvos.length > 0) {
    renderizarDados(dadosSalvos);
  } else {
    // Se não houver cache, tentar sincronizar
    SisregUtils.showToast("ℹ️ Nenhum dado em cache. Clique em 'Sincronizar' para carregar.", "info");
  }
  
});
