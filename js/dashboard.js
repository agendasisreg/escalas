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
    gerarEvolucaoMensal(dados);    // NOVO: Evolução Mensal (full width)
    gerarProcedimentos(dados);     // NOVO: Vagas por procedimentos
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
     * Gráfico 3: Evolução de Oferta Mensal (1ª Vez vs Retorno)
     */
    function gerarEvolucaoMensal(dados) {
      const canvas = document.getElementById("evolutionChart");
      if (!canvas) return;
      if (charts.evolucaoMensal) charts.evolucaoMensal.destroy();
    
      // Agregar dados por mês
      const mesesMap = {};
      const mesNome = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    
      dados.forEach(d => {
        // CORREÇÃO: Use parseData e valide a data
        const dataInicio = SisregUtils.parseData(d.vigencia_inicio);
        if (!dataInicio || isNaN(dataInicio)) return;
        
        // CORREÇÃO CRÍTICA: Use métodos UTC para evitar fuso horário
        const mesIdx = dataInicio.getUTCMonth(); // 0-11
        const ano = dataInicio.getUTCFullYear();
        const mesAno = `${mesNome[mesIdx]}/${ano}`;
        
        if (!mesesMap[mesAno]) {
          mesesMap[mesAno] = { v1: 0, vr: 0 };
        }
        
        // Calcular vagas corretamente
        const vagasCalculadas = SisregUtils.calcularTotalVagas(
          d.vagas,
          d.dias_semana,
          d.vigencia_inicio,
          d.vigencia_fim
        );
        
        // Classificação de retorno
        const campoProc = String(d.procedimento || "").toUpperCase().trim();
        const campoExame = String(d.exames || "").toUpperCase().trim();
        
        if (campoProc.includes("RETORNO") || campoExame.includes("RETORNO")) {
          mesesMap[mesAno].vr += vagasCalculadas;
        } else {
          mesesMap[mesAno].v1 += vagasCalculadas;
        }
      });
      
      // Ordenar meses cronologicamente
      const mesesOrdenados = Object.keys(mesesMap).sort((a, b) => {
        const [ma, aa] = a.split("/");
        const [mb, ab] = b.split("/");
        const idxA = mesNome.indexOf(ma);
        const idxB = mesNome.indexOf(mb);
        return (parseInt(aa) - parseInt(ab)) || (idxA - idxB);
      });
      
      // Preparar dados para o gráfico
      const dados1aVez = mesesOrdenados.map(m => mesesMap[m].v1);
      const dadosRetorno = mesesOrdenados.map(m => mesesMap[m].vr);
      
      // Criar gráfico
      charts.evolucaoMensal = new Chart(canvas, {
        type: 'line',
        data: {
          labels: mesesOrdenados,
          datasets: [
            {
              label: 'Vagas de Retorno',
              data: dadosRetorno,
              borderColor: '#3498db',
              backgroundColor: 'rgba(52, 152, 219, 0.5)',
              fill: true,
              tension: 0.4,
              borderWidth: 3,
              pointRadius: 5,
              pointHoverRadius: 7,
              pointBackgroundColor: '#fff',
              pointBorderColor: '#3498db',
              pointBorderWidth: 2
            },
            {
              label: 'Vagas 1ª Vez',
              data: dados1aVez,
              borderColor: '#2ecc71',
              backgroundColor: 'rgba(46, 204, 113, 0.5)',
              fill: true,
              tension: 0.4,
              borderWidth: 3,
              pointRadius: 5,
              pointHoverRadius: 7,
              pointBackgroundColor: '#fff',
              pointBorderColor: '#2ecc71',
              pointBorderWidth: 2
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: { 
              beginAtZero: true,
              grid: { color: "rgba(0,0,0,0.06)" },
              title: { 
                display: true, 
                text: 'Total de Vagas',
                font: { size: 13, weight: 'bold' }
              },
              ticks: {
                font: { size: 12 }
              }
            },
            x: {
              grid: { display: false },
              ticks: {
                font: { size: 12, weight: 'bold' }
              }
            }
          },
          plugins: {
            legend: { 
              position: 'top',
              labels: {
                padding: 20,
                font: { size: 13, weight: 'bold' },
                usePointStyle: true,
                pointStyle: 'circle'
              }
            },
            tooltip: {
              mode: 'index',
              intersect: false,
              backgroundColor: 'rgba(0,0,0,0.8)',
              titleFont: { size: 14, weight: 'bold' },
              bodyFont: { size: 13 },
              padding: 12,
              callbacks: {
                label: (context) => {
                  const value = context.parsed.y || 0;
                  const totalMes = dados1aVez[context.dataIndex] + dadosRetorno[context.dataIndex];
                  const percentual = totalMes > 0 ? Math.round((value / totalMes) * 100) : 0;
                  return `${context.dataset.label}: ${SisregUtils.formatarNumero(value)} (${percentual}%)`;
                }
              }
            }
          },
          interaction: {
            mode: 'index',
            intersect: false
          },
          hover: {
            mode: 'index',
            intersect: false
          }
        }
      });
    }

      /**
     * Gráfico 4: Oferta por Procedimento (Circle Packing com D3.js)
     */
    function gerarProcedimentos(dados) {
      // Verifica se D3 está carregado
      if (typeof d3 === 'undefined') {
        console.error('D3.js não está carregado');
        return;
      }
    
      const container = document.getElementById('chartProcedimentos');
      if (!container) return;
    
      // Limpa o container antes de redesenhar
      container.innerHTML = '';
    
      // Agrega dados por procedimento com cálculo correto de vagas
      const procedimentoMap = {};
      
      dados.forEach(d => {
        const proc = (d.procedimento || "Outros").trim();
        if (!proc || proc === "") return;
        
        // Calcula vagas corretamente considerando dias e vigência
        const vagasCalculadas = SisregUtils.calcularTotalVagas(
          d.vagas,
          d.dias_semana,
          d.vigencia_inicio,
          d.vigencia_fim
        );
        
        procedimentoMap[proc] = (procedimentoMap[proc] || 0) + vagasCalculadas;
      });
    
      // Converte para array e ordena
      let dataRows = Object.entries(procedimentoMap)
        .map(([name, value]) => ({ 
          name: name.length > 25 ? name.substring(0, 22) + "..." : name,
          value: value 
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 12); // Limita aos top 12 para melhor visualização
    
      // Se não houver dados, mostra mensagem
      if (dataRows.length === 0) {
        container.innerHTML = '<p class="no-data-message">Nenhum dado disponível para este período</p>';
        return;
      }
    
      // Configurações do gráfico
      const width = container.clientWidth;
      const height = 320;
      const padding = 8;
    
      // Cria SVG
      const svg = d3.select(container)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${padding},${padding})`);
    
      // Cria hierarquia
      const root = d3.hierarchy({ children: dataRows })
        .sum(d => d.value)
        .sort((a, b) => b.value - a.value);
    
      // Layout de empacotamento
      const pack = d3.pack()
        .size([width - padding * 2, height - padding * 2])
        .padding(5);
    
      pack(root);
    
      // Paleta de cores profissionais
      const cores = [
        "#1a2a6c", "#4CAF50", "#fdbb2d", "#e24a3b", 
        "#2196F3", "#9c27b0", "#ff9800", "#3f51b5",
        "#009688", "#795548", "#607d8b", "#e91e63"
      ];
      
      const color = d3.scaleOrdinal().range(cores);
    
      // Cria nós
      const nodes = svg.selectAll(".node")
        .data(root.leaves())
        .enter()
        .append("g")
        .attr("class", "node")
        .attr("transform", d => `translate(${d.x},${d.y})`);
    
      // Círculos com efeito hover
      nodes.append("circle")
        .attr("r", d => d.r)
        .style("fill", (d, i) => color(i))
        .style("cursor", "pointer")
        .on("mouseover", function(event, d) {
          d3.select(this)
            .transition()
            .duration(200)
            .attr("r", d.r * 1.05)
            .style("opacity", 0.95);
          
          // Tooltip manual
          const tooltip = d3.select("#d3-tooltip");
          if (tooltip.empty()) {
            d3.select("body").append("div")
              .attr("id", "d3-tooltip")
              .style("position", "absolute")
              .style("background", "rgba(0,0,0,0.85)")
              .style("color", "white")
              .style("padding", "10px 15px")
              .style("border-radius", "8px")
              .style("font-family", "'Inter', sans-serif")
              .style("font-size", "14px")
              .style("pointer-events", "none")
              .style("z-index", "9999");
          }
          
          d3.select("#d3-tooltip")
            .style("left", (event.pageX + 15) + "px")
            .style("top", (event.pageY - 30) + "px")
            .html(`<strong>${d.data.name}</strong><br/>${SisregUtils.formatarNumero(d.data.value)} vagas`);
        })
        .on("mousemove", function(event) {
          d3.select("#d3-tooltip")
            .style("left", (event.pageX + 15) + "px")
            .style("top", (event.pageY - 30) + "px");
        })
        .on("mouseout", function() {
          d3.select(this)
            .transition()
            .duration(200)
            .attr("r", d => d.r)
            .style("opacity", 1);
          
          d3.select("#d3-tooltip").remove();
        });
    
      // Texto dentro dos círculos
      nodes.append("text")
        .attr("dy", ".2em")
        .style("font-size", d => {
          const baseSize = Math.min(d.r / 3.5, 16);
          return baseSize > 8 ? baseSize + "px" : "0px";
        })
        .style("fill", "white")
        .style("font-weight", "700")
        .text(d => d.data.name)
        .append("tspan")
        .attr("x", 0)
        .attr("dy", "1.4em")
        .style("font-size", d => {
          const baseSize = Math.min(d.r / 4, 14);
          return baseSize > 7 ? baseSize + "px" : "0px";
        })
        .style("fill", "rgba(255,255,255,0.9)")
        .text(d => SisregUtils.formatarNumero(d.data.value));
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
