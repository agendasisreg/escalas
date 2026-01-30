// js/dashboard.js
// Versão refatorada com configuração centralizada e novos gráficos
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
   */
  function atualizarCards(dadosFiltrados) {
    const kpiVagas = document.getElementById("kpiVagas");
    const kpiProfs = document.getElementById("kpiProfissionais");
    const kpiRetorno = document.getElementById("kpiRetorno");
    const kpiProcedimentos = document.getElementById("kpiProcedimentos");
    
    if (!dadosFiltrados || dadosFiltrados.length === 0) {
      if (kpiVagas) kpiVagas.textContent = "0";
      if (kpiProfs) kpiProfs.textContent = "0";
      if (kpiRetorno) kpiRetorno.textContent = "0%";
      if (kpiProcedimentos) kpiProcedimentos.textContent = "0";
      return;
    }
    
    let totalVagas = 0;
    let vagasRetorno = 0;
    const cpfs = new Set();
    const procsUnicos = new Set();
    
    dadosFiltrados.forEach(item => {
      const d = SisregUtils.normalizarItem(item);
      totalVagas += d.vagas;
      
      const campoProc = String(d.procedimento || "").toUpperCase().trim();
      const campoExame = String(d.exames || "").toUpperCase().trim();
      
      if (campoProc.includes("RETORNO") || campoExame.includes("RETORNO")) {
        vagasRetorno += d.vagas;
      }
      
      if (d.cpf) cpfs.add(d.cpf);
      if (d.procedimento) procsUnicos.add(d.procedimento.trim());
    });
    
    const nProfs = cpfs.size;
    const nProcs = procsUnicos.size;
    const percRetorno = totalVagas > 0 ? Math.round((vagasRetorno / totalVagas) * 100) : 0;
    
    // Atualizar UI
    if (kpiVagas) kpiVagas.textContent = SisregUtils.formatarNumero(totalVagas);
    if (kpiProfs) kpiProfs.textContent = nProfs;
    if (kpiProcedimentos) kpiProcedimentos.textContent = nProcs;
    if (kpiRetorno) kpiRetorno.textContent = `${percRetorno}%`;
  }
  
  /**
   * Renderiza dados na tabela
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
    atualizarGraficos(dados);
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
    atualizarGraficos(dadosParaKPI);
  }
  
  // ==================== GRÁFICOS ====================
  
  /**
   * Atualiza TODOS os gráficos
   */
  function atualizarGraficos(dados) {
    gerarHeatmap(dados);
    gerarHorario(dados);
    gerarProcedimentos(dados);
    gerarRanking(dados);
    gerarComparacao(dados);
    gerarEvolucao(dados);
    gerarInsights(dados);
  }
  
  /**
   * Gráfico 1: Heatmap - Oferta por Dia e Horário
   */
  function gerarHeatmap(dados) {
    const canvas = document.getElementById("chartHeatmap");
    if (!canvas) return;
    if (charts.heatmap) charts.heatmap.destroy();
    
    const dias = SISREG_CONFIG.DIAS_SEMANA;
    const idxDia = Object.fromEntries(dias.map((d,i)=>[d,i]));
    
    // Agrega (dia, hora) -> vagas
    const mapa = new Map();
    dados.forEach(d => {
      const diasSel = SisregUtils.extrairDias(d.dias_semana);
      const h0 = parseInt(String(SisregUtils.formatarHora(d.hora_inicio) || "0").split(":")[0] || "0", 10);
      
      diasSel.forEach(di => {
        const key = `${di}|${h0}`;
        mapa.set(key, (mapa.get(key) || 0) + (Number(d.vagas) || 0));
      });
    });
    
    const pontos = [];
    let maxV = 1;
    mapa.forEach(v => { if (v > maxV) maxV = v; });
    
    mapa.forEach((v, key) => {
      const [di, h] = key.split("|");
      const x = idxDia[di];
      const y = Number(h);
      pontos.push({
        x, y,
        r: Math.max(6, Math.round((v / maxV) * 18)),
        _v: v,
        _dia: di,
        _h: y
      });
    });
    
    charts.heatmap = new Chart(canvas, {
      type: "bubble",
      data: {
        datasets: [{
          label: "Intensidade",
          data: pontos,
          backgroundColor: (ctx) => {
            const raw = ctx.raw;
            const v = raw && raw._v ? raw._v : 0;
            const a = maxV ? Math.min(0.95, 0.15 + (v / maxV) * 0.8) : 0.4;
            return `rgba(253,187,45,${a})`;
          },
          borderColor: "rgba(0,0,0,0.06)",
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const r = ctx.raw || {};
                return `${r._dia} ${String(r._h).padStart(2,"0")}:00 • ${r._v || 0} vagas`;
              }
            }
          }
        },
        scales: {
          x: {
            min: -0.5,
            max: 6.5,
            ticks: { callback: (v) => dias[v] || "" },
            grid: { display: false }
          },
          y: {
            ticks: { callback: (v) => `${String(v).padStart(2,"0")}:00` },
            title: { display: true, text: "Hora (início)" }
          }
        }
      }
    });
  }
  
  /**
   * Gráfico 2: Oferta por Horário (Barras)
   */
  function gerarHorario(dados) {
    const canvas = document.getElementById("chartHorario");
    if (!canvas) return;
    if (charts.horario) charts.horario.destroy();
    
    // Agrega por hora de início
    const horas = {};
    for (let h = 7; h <= 18; h++) {
      horas[`${h}:00`] = 0;
    }
    
    dados.forEach(d => {
      const h = SisregUtils.formatarHora(d.hora_inicio);
      if (horas[h] !== undefined) {
        horas[h] += Number(d.vagas) || 0;
      }
    });
    
    const labels = Object.keys(horas);
    const valores = Object.values(horas);
    
    charts.horario = new Chart(canvas, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [{
          label: "Vagas por Horário",
          data: valores,
          backgroundColor: SISREG_CONFIG.CORES.PRIMARY,
          borderColor: SISREG_CONFIG.CORES.PRIMARY,
          borderWidth: 1,
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: "rgba(0,0,0,0.06)" },
            title: { display: true, text: "Vagas" }
          },
          x: {
            grid: { display: false },
            title: { display: true, text: "Horário" }
          }
        }
      }
    });
  }
  
  /**
   * Gráfico 3: Principais Procedimentos (Top 5)
   */
  function gerarProcedimentos(dados) {
    const canvas = document.getElementById("chartProcedimentos");
    if (!canvas) return;
    if (charts.procedimentos) charts.procedimentos.destroy();
    
    // Conta vagas por procedimento
    const procMap = {};
    dados.forEach(d => {
      const proc = (d.procedimento || "Outros").trim();
      procMap[proc] = (procMap[proc] || 0) + (Number(d.vagas) || 0);
    });
    
    // Ordena e pega top 5
    const top5 = Object.entries(procMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    const labels = top5.map(([proc]) => proc);
    const valores = top5.map(([, vagas]) => vagas);
    
    charts.procedimentos = new Chart(canvas, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [{
          label: "Vagas",
          data: valores,
          backgroundColor: SISREG_CONFIG.CORES.SECONDARY,
          borderColor: SISREG_CONFIG.CORES.SECONDARY,
          borderWidth: 1,
          borderRadius: 8
        }]
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: "rgba(0,0,0,0.06)" }
          },
          y: { grid: { display: false } }
        }
      }
    });
  }
  
  /**
   * Gráfico 4: Ranking de Profissionais (Top 3 + Bottom 2)
   */
  function gerarRanking(dados) {
    const canvas = document.getElementById("chartRanking");
    if (!canvas) return;
    if (charts.ranking) charts.ranking.destroy();
    
    // Conta vagas por profissional
    const profMap = {};
    dados.forEach(d => {
      const prof = (d.profissional || "Sem nome").trim();
      profMap[prof] = (profMap[prof] || 0) + (Number(d.vagas) || 0);
    });
    
    // Ordena
    const ordenado = Object.entries(profMap).sort((a, b) => b[1] - a[1]);
    
    // Top 3 (mais)
    const top3 = ordenado.slice(0, 3);
    // Bottom 2 (menos)
    const bottom2 = ordenado.slice(-2).reverse();
    
    // Combina: Top 3 + Bottom 2
    const combinado = [...top3, ...bottom2];
    const labels = combinado.map(([prof]) => prof);
    const valores = combinado.map(([, vagas]) => vagas);
    
    // Cores: verde para top, vermelho para bottom
    const cores = [
      SISREG_CONFIG.CORES.SECONDARY, // Top 1
      SISREG_CONFIG.CORES.INFO,      // Top 2
      SISREG_CONFIG.CORES.YELLOW,    // Top 3
      SISREG_CONFIG.CORES.WARNING,   // Bottom 2
      SISREG_CONFIG.CORES.DANGER     // Bottom 1
    ];
    
    charts.ranking = new Chart(canvas, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [{
          label: "Vagas",
          data: valores,
          backgroundColor: cores,
          borderColor: cores.map(c => c.replace(")", ",0.8)").replace("rgb", "rgba")),
          borderWidth: 1,
          borderRadius: 8
        }]
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: { 
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const idx = ctx.dataIndex;
                const tipo = idx < 3 ? "Top" : "Bottom";
                const pos = idx < 3 ? (idx + 1) : (5 - idx);
                return `${tipo} ${pos}: ${ctx.parsed.x} vagas`;
              }
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: "rgba(0,0,0,0.06)" }
          },
          y: { grid: { display: false } }
        }
      }
    });
  }
  
  /**
   * Gráfico 5: Comparação 1ª Vez vs Retorno
   */
  function gerarComparacao(dados) {
    const canvas = document.getElementById("chartComparacao");
    if (!canvas) return;
    if (charts.comparacao) charts.comparacao.destroy();
    
    let vagasPrimeiraVez = 0;
    let vagasRetorno = 0;
    
    dados.forEach(d => {
      const campoProc = String(d.procedimento || "").toUpperCase().trim();
      const campoExame = String(d.exames || "").toUpperCase().trim();
      
      if (campoProc.includes("RETORNO") || campoExame.includes("RETORNO")) {
        vagasRetorno += Number(d.vagas) || 0;
      } else {
        vagasPrimeiraVez += Number(d.vagas) || 0;
      }
    });
    
    const total = vagasPrimeiraVez + vagasRetorno;
    const percPrimeira = total > 0 ? Math.round((vagasPrimeiraVez / total) * 100) : 0;
    const percRetorno = total > 0 ? Math.round((vagasRetorno / total) * 100) : 0;
    
    charts.comparacao = new Chart(canvas, {
      type: "doughnut",
      data: {
        labels: ["1ª Vez", "Retorno"],
        datasets: [{
          data: [vagasPrimeiraVez, vagasRetorno],
          backgroundColor: [
            SISREG_CONFIG.CORES.SECONDARY, // Verde para 1ª vez
            SISREG_CONFIG.CORES.DANGER     // Vermelho para retorno
          ],
          borderWidth: 2,
          borderColor: "#ffffff"
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom" },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const label = ctx.label || "";
                const value = ctx.parsed || 0;
                const perc = ctx.dataset.data.reduce((a, b) => a + b, 0);
                const percentual = perc > 0 ? Math.round((value / perc) * 100) : 0;
                return `${label}: ${value} vagas (${percentual}%)`;
              }
            }
          }
        },
        cutout: "60%"
      }
    });
  }
  
  /**
   * Gráfico 6: Evolução da Oferta (Linha)
   */
  function gerarEvolucao(dados) {
    const canvas = document.getElementById("chartEvolucao");
    if (!canvas) return;
    if (charts.evolucao) charts.evolucao.destroy();
    
    // Agrupa por mês de vigência
    const byMes = {};
    dados.forEach(d => {
      const dt = SisregUtils.formatarDataBR(d.vigencia_inicio);
      if (!dt) return;
      
      // Extrai mês/ano
      const partes = dt.split("/");
      if (partes.length >= 2) {
        const mesAno = `${partes[1]}/${partes[2]}`; // MM/AAAA
        byMes[mesAno] = (byMes[mesAno] || 0) + (Number(d.vagas) || 0);
      }
    });
    
    // Ordena por data
    const labels = Object.keys(byMes).sort((a, b) => {
      const [ma, aa] = a.split("/");
      const [mb, ab] = b.split("/");
      return (aa - ab) || (ma - mb);
    });
    
    const valores = labels.map(m => byMes[m]);
    
    charts.evolucao = new Chart(canvas, {
      type: "line",
      data: {
        labels: labels,
        datasets: [{
          label: "Vagas",
          data: valores,
          borderColor: SISREG_CONFIG.CORES.PRIMARY,
          backgroundColor: "rgba(26,42,108,0.1)",
          borderWidth: 3,
          fill: true,
          tension: 0.3,
          pointBackgroundColor: SISREG_CONFIG.CORES.PRIMARY,
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            grid: { display: false },
            title: { display: true, text: "Mês/Ano" }
          },
          y: {
            beginAtZero: true,
            grid: { color: "rgba(0,0,0,0.06)" },
            title: { display: true, text: "Vagas" }
          }
        }
      }
    });
  }
  
  /**
   * Gráfico 7: Insights Automáticos
   */
  function gerarInsights(dados) {
    const ul = document.getElementById("listaInsights");
    if (!ul) return;
    ul.innerHTML = "";
    
    if (!dados || dados.length === 0) {
      ul.innerHTML = "<li>Nenhum dado disponível para análise.</li>";
      return;
    }
    
    const totalVagas = dados.reduce((s, d) => s + (Number(d.vagas) || 0), 0);
    
    // Concentração por dia
    const byDay = { "DOM":0,"SEG":0,"TER":0,"QUA":0,"QUI":0,"SEX":0,"SAB":0 };
    dados.forEach(d => {
      const v = Number(d.vagas) || 0;
      const dias = SisregUtils.extrairDias(d.dias_semana);
      if (dias.length === 0) byDay["SEG"] += v;
      else dias.forEach(di => byDay[di] += v);
    });
    
    let topDay = "SEG";
    Object.keys(byDay).forEach(di => { 
      if (byDay[di] > byDay[topDay]) topDay = di; 
    });
    const percTopDay = totalVagas > 0 ? Math.round((byDay[topDay] / totalVagas) * 100) : 0;
    
    // Top 4 profissionais
    const byProf = {};
    dados.forEach(d => {
      const p = d.profissional || "(Sem nome)";
      byProf[p] = (byProf[p] || 0) + (Number(d.vagas) || 0);
    });
    
    const profOrdenado = Object.entries(byProf).sort((a,b)=>b[1]-a[1]);
    const top4 = profOrdenado.slice(0,4).reduce((s, x)=>s + x[1], 0);
    const percTop4 = totalVagas > 0 ? Math.round((top4 / totalVagas) * 100) : 0;
    
    // Retorno %
    let retornoV = 0;
    dados.forEach(d => {
      const isRet = SisregUtils.tipoProcedimento(d.procedimento) === SISREG_CONFIG.TIPOS_PROCEDIMENTO.RETORNO || 
                    String(d.exames||"").toUpperCase().includes("RETORNO");
      if (isRet) retornoV += (Number(d.vagas) || 0);
    });
    const percRet = totalVagas > 0 ? Math.round((retornoV / totalVagas) * 100) : 0;
    
    // Procedimento campeão
    const byProc = {};
    dados.forEach(d => {
      const k = (d.procedimento || "OUTROS").trim();
      byProc[k] = (byProc[k] || 0) + (Number(d.vagas) || 0);
    });
    const procTop = Object.entries(byProc).sort((a,b)=>b[1]-a[1])[0];
    const procNome = procTop ? procTop[0] : "-";
    
    ul.innerHTML = `
      <li>📌 <strong>${topDay}</strong> concentra <strong>${percTopDay}%</strong> das vagas ofertadas.</li>
      <li>👥 Os <strong>4 principais profissionais</strong> respondem por <strong>${percTop4}%</strong> das vagas.</li>
      <li>🔁 <strong>Retornos</strong> representam <strong>${percRet}%</strong> das vagas.</li>
      <li>🏆 Procedimento líder: <strong>${procNome}</strong>.</li>
    `;
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
    SisregUtils.showToast("ℹ️ Nenhum dado em cache. Clique em 'Sincronizar' para carregar.", "info");
  }
  
});
