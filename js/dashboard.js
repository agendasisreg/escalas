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
        
        // Cálculo CORRETO das vagas
        const vagasCalculadas = SisregUtils.calcularTotalVagas(
          d.vagas,
          d.dias_semana,
          d.vigencia_inicio,
          d.vigencia_fim
        );
        
        totalVagas += vagasCalculadas;
        
        // Cálculo de vagas de retorno
        const campoProc = String(d.procedimento || "").toUpperCase().trim();
        const campoExame = String(d.exames || "").toUpperCase().trim();
        
        if (campoProc.includes("RETORNO") || campoExame.includes("RETORNO")) {
          vagasRetorno += vagasCalculadas;
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
  // [ALTERADO APENAS AQUI: removi os antigos e coloquei novos]
  
  /**
   * Atualiza TODOS os gráficos (novos)
   */
  function atualizarGraficos(dados) {
    gerarGaugeChart(dados);        // NOVO: Taxa de Renovação
    gerarDonutChart(dados);        // NOVO: Composição da Escala
    gerarStreamHorario(dados);
    gerarSankey(dados);
    gerarInsights(dados); // mantido e melhorado
  }

  // ---------- Helpers de tooltip D3 ----------
  function showTip(html, x, y) {
    const el = document.getElementById("vizTooltip");
    if (!el) return;
    el.innerHTML = html;
    el.style.left = (x + 12) + "px";
    el.style.top = (y + 12) + "px";
    el.style.display = "block";
  }
  function hideTip() {
    const el = document.getElementById("vizTooltip");
    if (!el) return;
    el.style.display = "none";
  }

    /**
     * Gráfico 1: Gauge Chart - Taxa de Renovação (1ª Vez vs Retorno)
     */
    function gerarGaugeChart(dados) {
      const canvas = document.getElementById("gaugeChart");
      if (!canvas) return;
      if (charts.gauge) charts.gauge.destroy();
    
      // Calcular totais com o cálculo correto de vagas
      let vagasPrimeiraVez = 0;
      let vagasRetorno = 0;
    
      dados.forEach(d => {
        const vagasCalculadas = SisregUtils.calcularTotalVagas(
          d.vagas,
          d.dias_semana,
          d.vigencia_inicio,
          d.vigencia_fim
        );
        
        const campoProc = String(d.procedimento || "").toUpperCase().trim();
        const campoExame = String(d.exames || "").toUpperCase().trim();
        
        if (campoProc.includes("RETORNO") || campoExame.includes("RETORNO")) {
          vagasRetorno += vagasCalculadas;
        } else {
          vagasPrimeiraVez += vagasCalculadas;
        }
      });
    
      const total = vagasPrimeiraVez + vagasRetorno;
      const taxaRenovacao = total > 0 ? Math.round((vagasPrimeiraVez / total) * 100) : 0;
      
      // Atualizar texto percentual
      const percTextEl = document.getElementById("percText");
      if (percTextEl) {
        percTextEl.textContent = `${taxaRenovacao}%`;
        percTextEl.style.color = taxaRenovacao > 50 ? '#27ae60' : '#e67e22';
      }
    
      charts.gauge = new Chart(canvas, {
        type: 'doughnut',
        data: {
          datasets: [{
            data: [taxaRenovacao, 100 - taxaRenovacao],
            backgroundColor: [taxaRenovacao > 50 ? '#27ae60' : '#e67e22', '#ecf0f1'],
            borderWidth: 0,
            circumference: 180,
            rotation: 270,
            cutout: '80%'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { enabled: false }
          }
        }
      });
    }
    
    /**
     * Gráfico 2: Donut Chart - Composição da Escala (1ª Vez vs Retorno)
     */
    function gerarDonutChart(dados) {
      const canvas = document.getElementById("donutChart");
      if (!canvas) return;
      if (charts.donut) charts.donut.destroy();
    
      // Calcular totais com o cálculo correto de vagas
      let vagasPrimeiraVez = 0;
      let vagasRetorno = 0;
    
      dados.forEach(d => {
        const vagasCalculadas = SisregUtils.calcularTotalVagas(
          d.vagas,
          d.dias_semana,
          d.vigencia_inicio,
          d.vigencia_fim
        );
        
        const campoProc = String(d.procedimento || "").toUpperCase().trim();
        const campoExame = String(d.exames || "").toUpperCase().trim();
        
        if (campoProc.includes("RETORNO") || campoExame.includes("RETORNO")) {
          vagasRetorno += vagasCalculadas;
        } else {
          vagasPrimeiraVez += vagasCalculadas;
        }
      });
    
      const total = vagasPrimeiraVez + vagasRetorno;
      
      // Atualizar total de vagas
      const totalVagasEl = document.getElementById("totalVagas");
      if (totalVagasEl) {
        totalVagasEl.textContent = `Total: ${SisregUtils.formatarNumero(total)} Vagas`;
      }
    
      charts.donut = new Chart(canvas, {
        type: 'doughnut',
        data: {
          labels: ['1ª Vez', 'Retorno'],
          datasets: [{
            data: [vagasPrimeiraVez, vagasRetorno],
            backgroundColor: ['#2ecc71', '#3498db'],
            hoverOffset: 4,
            cutout: '60%'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { 
              position: 'bottom',
              labels: {
                padding: 20,
                font: {
                  size: 13
                }
              }
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  const value = context.parsed || 0;
                  const percentage = context.dataset.data.reduce((a, b) => a + b, 0);
                  const percent = percentage > 0 ? Math.round((value / percentage) * 100) : 0;
                  return `${context.label}: ${SisregUtils.formatarNumero(value)} (${percent}%)`;
                }
              }
            }
          }
        }
      });
    }
  /**
   * Gráfico C: Stream por horário (ofeta x hora)
   */
  function gerarStreamHorario(dados) {
    const svgEl = document.getElementById("chartStream");
    if (!svgEl || typeof d3 === "undefined") return;
  
    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();
  
    const w = svgEl.clientWidth || 520;
    const h = svgEl.clientHeight || 320;
    const margin = { top: 20, right: 20, bottom: 40, left: 50 };
  
    svg.attr("viewBox", `0 0 ${w} ${h}`);
  
    const hMin = 7;
    const hMax = 18;
    const hours = d3.range(hMin, hMax + 1);
  
    // ===== AGREGAÇÃO: vagas por hora de início =====
    const byH = {};
    hours.forEach(hr => byH[hr] = 0);
  
    dados.forEach(d => {
      const hr = parseInt(
        String(SisregUtils.formatarHora(d.hora_inicio) || "").split(":")[0],
        10
      );
      if (byH[hr] != null) {
        byH[hr] += Number(d.vagas) || 0;
      }
    });
  
    const data = hours.map(hr => ({
      hr,
      vagas: byH[hr]
    }));
  
    // ===== ESCALAS =====
    const x = d3.scaleLinear()
      .domain([hMin, hMax])
      .range([margin.left, w - margin.right]);
  
    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.vagas) || 1])
      .nice()
      .range([h - margin.bottom, margin.top]);
  
    // ===== ÁREA =====
    const area = d3.area()
      .x(d => x(d.hr))
      .y0(y(0))
      .y1(d => y(d.vagas))
      .curve(d3.curveMonotoneX);
  
    svg.append("path")
      .datum(data)
      .attr("fill", "rgba(26, 42, 108, 0.25)")
      .attr("stroke", "rgba(26, 42, 108, 0.9)")
      .attr("stroke-width", 2)
      .attr("d", area);
  
    // ===== PONTOS =====
    svg.append("g")
      .selectAll("circle")
      .data(data)
      .enter()
      .append("circle")
      .attr("cx", d => x(d.hr))
      .attr("cy", d => y(d.vagas))
      .attr("r", 4)
      .attr("fill", "#1a2a6c");
  
    // ===== EIXOS =====
    const axisX = d3.axisBottom(x)
      .ticks(hMax - hMin)
      .tickFormat(d => String(d).padStart(2, "0") + ":00");
  
    const axisY = d3.axisLeft(y).ticks(5);
  
    svg.append("g")
      .attr("transform", `translate(0,${h - margin.bottom})`)
      .call(axisX);
  
    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(axisY);
  
    // ===== TÍTULO AUXILIAR =====
    svg.append("text")
      .attr("x", margin.left)
      .attr("y", margin.top - 6)
      .attr("font-size", 12)
      .attr("fill", "rgba(0,0,0,0.7)")
      .text("Oferta total por horário de início");
  }


  /**
   * Gráfico D: Sankey Dia → Profissional → Tipo
   * (Top N profissionais; resto vai para “Outros”)
   */
  function gerarSankey(dados) {
    const svgEl = document.getElementById("chartSankey");
    if (!svgEl || typeof d3 === "undefined" || typeof d3.sankey !== "function") return;

    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();

    const w = svgEl.clientWidth || 520;
    const h = svgEl.clientHeight || 320;
    svg.attr("viewBox", `0 0 ${w} ${h}`);

    const dias = SISREG_CONFIG.DIAS_SEMANA || ["DOM","SEG","TER","QUA","QUI","SEX","SAB"];

    // Top profissionais
    const byProf = {};
    dados.forEach(d => {
      const p = (d.profissional || "(Sem nome)").trim();
      byProf[p] = (byProf[p] || 0) + (Number(d.vagas) || 0);
    });
    const topN = 12;
    const topProfs = Object.entries(byProf).sort((a,b)=>b[1]-a[1]).slice(0, topN).map(x=>x[0]);
    const setTop = new Set(topProfs);

    // Nós / Links
    const nodeMap = new Map();
    const nodes = [];
    const linksMap = new Map(); // key -> value

    const getNode = (name) => {
      if (!nodeMap.has(name)) {
        nodeMap.set(name, nodes.length);
        nodes.push({ name });
      }
      return nodeMap.get(name);
    };

    const addLink = (s, t, v) => {
      const key = `${s}=>${t}`;
      linksMap.set(key, (linksMap.get(key) || 0) + v);
    };

    dados.forEach(d => {
      const diasSel = SisregUtils.extrairDias(d.dias_semana);
      const dia = diasSel[0] || "SEG";
      const profRaw = (d.profissional || "(Sem nome)").trim();
      const prof = setTop.has(profRaw) ? profRaw : "Outros";
      const v = Number(d.vagas) || 0;

      const campoProc = String(d.procedimento || "").toUpperCase().trim();
      const campoExame = String(d.exames || "").toUpperCase().trim();
      const tipo = (campoProc.includes("RETORNO") || campoExame.includes("RETORNO")) ? "Retorno" : "1ª Vez";

      addLink(dia, prof, v);
      addLink(prof, tipo, v);
    });

    const links = Array.from(linksMap.entries()).map(([k, value]) => {
      const [s, t] = k.split("=>");
      return { source: getNode(s), target: getNode(t), value };
    });

    // Layout Sankey
    const sankey = d3.sankey()
      .nodeWidth(16)
      .nodePadding(10)
      .extent([[10, 10], [w - 10, h - 10]]);

    const graph = sankey({
      nodes: nodes.map(d => Object.assign({}, d)),
      links: links.map(d => Object.assign({}, d))
    });

    // Links
    svg.append("g")
      .attr("fill", "none")
      .selectAll("path")
      .data(graph.links)
      .enter()
      .append("path")
      .attr("d", d3.sankeyLinkHorizontal())
      .attr("stroke", "rgba(253,187,45,0.55)")
      .attr("stroke-width", d => Math.max(1, d.width))
      .attr("opacity", 0.85)
      .on("mousemove", (event, d) => {
        const s = graph.nodes[d.source.index]?.name || "";
        const t = graph.nodes[d.target.index]?.name || "";
        showTip(`<strong>${s}</strong> → <strong>${t}</strong><br/>Vagas: <strong>${d.value}</strong>`, event.clientX, event.clientY);
      })
      .on("mouseleave", hideTip);

    // Nodes
    const node = svg.append("g")
      .selectAll("g")
      .data(graph.nodes)
      .enter()
      .append("g");

    node.append("rect")
      .attr("x", d => d.x0)
      .attr("y", d => d.y0)
      .attr("height", d => d.y1 - d.y0)
      .attr("width", d => d.x1 - d.x0)
      .attr("fill", "rgba(26,42,108,0.75)")
      .attr("stroke", "rgba(0,0,0,0.10)");

    node.append("text")
      .attr("x", d => (d.x0 < w/2 ? d.x1 + 6 : d.x0 - 6))
      .attr("y", d => (d.y0 + d.y1)/2)
      .attr("dy", "0.35em")
      .attr("text-anchor", d => (d.x0 < w/2 ? "start" : "end"))
      .attr("font-size", 10)
      .attr("fill", "rgba(0,0,0,0.72)")
      .text(d => d.name);
  }

  /**
   * Insights Automáticos — mantido (melhorado)
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

    // Concentração por dia e por hora
    const dias = SISREG_CONFIG.DIAS_SEMANA || ["DOM","SEG","TER","QUA","QUI","SEX","SAB"];
    const byDay = Object.fromEntries(dias.map(d=>[d,0]));
    const byHour = {};
    for (let h = 7; h <= 18; h++) byHour[h] = 0;

    // Profissionais
    const byProf = {};
    // Retorno
    let retornoV = 0;

    dados.forEach(d => {
      const v = Number(d.vagas) || 0;

      // dias
      const diasSel = SisregUtils.extrairDias(d.dias_semana);
      if (diasSel.length === 0) byDay["SEG"] += v;
      else diasSel.forEach(di => { if (byDay[di] != null) byDay[di] += v; });

      // hora
      const h0 = parseInt(String(SisregUtils.formatarHora(d.hora_inicio) || "0").split(":")[0] || "0", 10);
      if (byHour[h0] != null) byHour[h0] += v;

      // prof
      const p = d.profissional || "(Sem nome)";
      byProf[p] = (byProf[p] || 0) + v;

      // retorno
      const campoProc = String(d.procedimento || "").toUpperCase().trim();
      const campoExame = String(d.exames || "").toUpperCase().trim();
      const isRet = campoProc.includes("RETORNO") || campoExame.includes("RETORNO");
      if (isRet) retornoV += v;
    });

    // Top day
    let topDay = dias[0];
    dias.forEach(di => { if (byDay[di] > byDay[topDay]) topDay = di; });
    const percTopDay = totalVagas > 0 ? Math.round((byDay[topDay] / totalVagas) * 100) : 0;

    // Top hour
    let topHour = 7;
    for (let h = 7; h <= 18; h++) if (byHour[h] > byHour[topHour]) topHour = h;

    // Concentração em profissionais (HHI simplificado)
    const profVals = Object.values(byProf);
    const hhi = totalVagas > 0
      ? Math.round(profVals.reduce((s, v)=> s + Math.pow(v/totalVagas, 2), 0) * 1000)
      : 0; // 0–1000 aprox (quanto maior, mais concentrado)

    const profOrdenado = Object.entries(byProf).sort((a,b)=>b[1]-a[1]);
    const top3 = profOrdenado.slice(0,3);
    const top3Sum = top3.reduce((s, x)=>s + x[1], 0);
    const percTop3 = totalVagas > 0 ? Math.round((top3Sum / totalVagas) * 100) : 0;

    const percRet = totalVagas > 0 ? Math.round((retornoV / totalVagas) * 100) : 0;

    // Procedimento campeão
    const byProc = {};
    dados.forEach(d => {
      const k = (d.procedimento || "OUTROS").trim();
      byProc[k] = (byProc[k] || 0) + (Number(d.vagas) || 0);
    });
    const procTop = Object.entries(byProc).sort((a,b)=>b[1]-a[1])[0];
    const procNome = procTop ? procTop[0] : "-";

    // Recomendação simples
    let recomendacao = "Distribuição saudável.";
    if (percTop3 >= 60 || hhi >= 180) recomendacao = "⚠️ Alta concentração: redistribua oferta entre profissionais/dias.";
    if (percRet >= 55) recomendacao = "⚠️ Retorno alto: avalie reservar janelas específicas para 1ª vez.";

    ul.innerHTML = `
      <li>📌 <strong>${topDay}</strong> concentra <strong>${percTopDay}%</strong> das vagas ofertadas.</li>
      <li>🕒 Pico de oferta em <strong>${String(topHour).padStart(2,"0")}:00</strong>.</li>
      <li>👥 <strong>Top 3 profissionais</strong> respondem por <strong>${percTop3}%</strong> das vagas (HHI≈<strong>${hhi}</strong>).</li>
      <li>🔁 <strong>Retornos</strong> representam <strong>${percRet}%</strong> das vagas.</li>
      <li>🏆 Procedimento líder: <strong>${procNome}</strong>.</li>
      <li>🧭 Recomendações: <strong>${recomendacao}</strong></li>
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
