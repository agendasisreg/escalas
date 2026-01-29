// js/dashboard.js
// Versão refatorada com configuração centralizada
document.addEventListener("DOMContentLoaded", async () => {
  // Carregar configurações
  await SisregUtils.preencherCreditos("footerCreditos");
  
  // =====================
  // CONFIGURAÇÕES LOCAIS
  // =====================
  const UNIDADE = SisregUtils.getUnidade();
  const CACHE_KEY = SisregUtils.getCacheKey(UNIDADE);
  
  // Preencher nome da unidade
  const txtUnidadeEl = document.getElementById("txtUnidade");
  if (txtUnidadeEl) txtUnidadeEl.textContent = UNIDADE;
  
  // =====================
  // VARIÁVEIS
  // =====================
  let charts = {};
  
  // =====================
  // FUNÇÕES PRINCIPAIS
  // =====================
  
  // Atualizar KPIs
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
    if (kpiVagas) kpiVagas.textContent = totalVagas.toLocaleString('pt-BR');
    if (kpiProfs) kpiProfs.textContent = nProfs;
    if (kpiProcedimentos) kpiProcedimentos.textContent = nProcs;
    if (kpiLider) kpiLider.textContent = liderNome;
    if (kpiRetorno) kpiRetorno.textContent = `${percRetorno}%`;
  }
  
  // Renderizar tabela
  function renderizarDados(dadosRaw) {
    const tbody = document.getElementById("corpoTabela");
    if (!tbody) return;
    
    const dados = SisregUtils.normalizarLista(dadosRaw);
    
    if (!dados || dados.length === 0) {
      tbody.innerHTML = `<tr><td colspan='11' style='text-align:center; padding: 20px;'>${SISREG_CONFIG.MESSAGES.noData}</td></tr>`;
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
  
  // Sincronizar com API
  document.getElementById("btnSincronizar").onclick = async function() {
    const btn = this;
    btn.innerHTML = `<span style="display:inline-flex;align-items:center;gap:6px;"><svg width="16" height="16" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="#fff" stroke-width="2" fill="none"><animate attributeName="stroke-dasharray" values="0,63 63,0" dur="1.5s" repeatCount="indefinite"/></circle></svg>Sincronizando...</span>`;
    btn.disabled = true;
    
    try {
      const resp = await fetch(`${SISREG_CONFIG.API_URL}?unidade=${encodeURIComponent(UNIDADE)}&t=${Date.now()}`);
      const res = await resp.json();
      
      if (res.status === "OK") {
        const dadosNorm = SisregUtils.normalizarLista(res.dados);
        localStorage.setItem(CACHE_KEY, JSON.stringify(dadosNorm));
        renderizarDados(dadosNorm);
        alert("✅ " + SISREG_CONFIG.MESSAGES.syncSuccess);
      } else {
        alert("⚠️ Sheets respondeu, mas sem dados para esta unidade.");
      }
    } catch (e) {
      alert("❌ " + SISREG_CONFIG.MESSAGES.syncError);
    } finally {
      btn.innerHTML = "🔄 Sincronizar Sheets";
      btn.disabled = false;
    }
  };
  
  // Logout
  document.getElementById("btnLogout").onclick = () => {
    window.location.href = "index.html";
  };
  
  // =====================
  // INICIALIZAÇÃO
  // =====================
  const dadosSalvos = localStorage.getItem(CACHE_KEY);
  if (dadosSalvos) {
    const dados = JSON.parse(dadosSalvos);
    renderizarDados(dados);
  }
});
