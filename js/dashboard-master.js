// js/dashboard-master.js
// Dashboard Master (Gestor) — consolida todas as unidades (unidade=ALL)
// ============================================================

document.addEventListener("DOMContentLoaded", async () => {

  if (!SisregUtils.isMaster()) {
    SisregUtils.clearSessao();
    window.location.href = SISREG_CONFIG.PAGINAS.INDEX;
    return;
  }

  // ==================== INICIALIZAÇÃO ====================

  // Carregar créditos
  await SisregUtils.preencherCreditos("footerCreditos");

  // Para MASTER, sempre usamos a "unidade" ALL no fetch
  const UNIDADE_MASTER = "ALL";

  // Cache local do master (se quiser separar do dashboard normal)
  const CACHE_KEY = "SISREG_CACHE_MASTER_ALL";

  // ==================== VARIÁVEIS ====================

  let charts = {};                 // instâncias Chart.js
  let dadosAll = [];               // dataset completo vindo da API (ALL)
  let unidadesDisponiveis = [];    // lista de unidades encontradas no dataset

  // ==================== HELPERS ====================

  function isLightColor(hex) {
    if (!hex) return false;
    const c = hex.replace('#', '');
    if (c.length !== 6) return false;
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) > 160;
  }

  function normalizeText(str) {
    return String(str || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .trim();
  }

  /**
   * Extrai uma "especialidade" centralizada a partir do texto do procedimento
   * Exemplo:
   *  - "CONSULTA EM CARDIOLOGIA GERAL" -> "CARDIOLOGIA"
   *  - "CONSULTA EM CARDIOLOGIA CIRURGICA" -> "CARDIOLOGIA"
   *  - "CONSULTA EM CARDIOLOGIA RETORNO" -> "CARDIOLOGIA"
   */
  function extrairEspecialidade(procedimento) {
    const txt = normalizeText(procedimento);

    if (!txt) return "OUTROS";

    // tenta pegar trecho após " EM "
    // ex: "CONSULTA EM CARDIOLOGIA CIRURGICA" -> "CARDIOLOGIA CIRURGICA"
    let base = txt;
    const idxEm = txt.indexOf(" EM ");
    if (idxEm >= 0) base = txt.substring(idxEm + 4);

    base = base
      .replace(/^DE\s+/, "")
      .replace(/^DA\s+/, "")
      .replace(/^DO\s+/, "")
      .trim();

    // palavras que costumam ser "sufixos" e não parte da especialidade
    const stops = [
      "GERAL", "CIRURGICA", "CIRURGICO", "RETORNO",
      "1A", "1ª", "PRIMEIRA", "AVALIACAO", "REAVALIACAO",
      "INFANTIL", "PEDIATRICA", "PEDIATRICO",
      "URGENTE", "URGENCIA", "ELETIVA",
      "CONSULTA", "EXAME", "PROCEDIMENTO"
    ];

    // corta no primeiro stop encontrado
    for (const s of stops) {
      const p = base.indexOf(" " + s);
      if (p > 0) {
        base = base.substring(0, p).trim();
      }
    }

    // corta também se tiver separadores comuns
    base = base.split("-")[0].split(",")[0].split("/")[0].trim();

    if (!base) return "OUTROS";

    // como regra final: pega a primeira palavra relevante (ou duas se ficar muito genérico)
    const parts = base.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "OUTROS";

    // se a primeira palavra for muito curta/genérica, pega duas
    let esp = parts[0];
    if (esp.length <= 3 && parts[1]) esp = esp + " " + parts[1];

    return esp;
  }

  function getFiltroMes() {
    return document.getElementById("filtroMes")?.value || "todos";
  }

  function getFiltroUnidade() {
    return document.getElementById("filtroUnidade")?.value || "ALL";
  }

  function preencherSelectUnidades(unidades) {
    const sel = document.getElementById("filtroUnidade");
    if (!sel) return;

    // mantém "ALL" sempre como primeiro
    sel.innerHTML = `<option value="ALL">Todas as unidades</option>`;

    unidades.forEach(u => {
      const opt = document.createElement("option");
      opt.value = u;
      opt.textContent = u;
      sel.appendChild(opt);
    });
  }

  function aplicarFiltros() {
    const mesSelecionado = getFiltroMes();
    const unidadeSelecionada = getFiltroUnidade();

    let filtrado = [...dadosAll];

    // filtro unidade
    if (unidadeSelecionada !== "ALL") {
      filtrado = filtrado.filter(x => String(x.unidade || "").trim() === unidadeSelecionada);
    }

    // filtro mês (vigencia_inicio em yyyy-mm-dd)
    if (mesSelecionado !== "todos") {
      filtrado = filtrado.filter(x => {
        const vi = String(x.vigencia_inicio || "");
        const mes = vi.split("-")[1] || "";
        return mes === mesSelecionado;
      });
    }

    atualizarCards(filtrado);
    atualizarGraficos(filtrado);
  }

  // ==================== KPIs ====================

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

      const vagasCalculadas = SisregUtils.calcularTotalVagas(
        d.vagas,
        d.dias_semana,
        d.vigencia_inicio,
        d.vigencia_fim
      );

      totalVagas += vagasCalculadas;

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

    if (kpiVagas) kpiVagas.textContent = SisregUtils.formatarNumero(totalVagas);
    if (kpiProfs) kpiProfs.textContent = nProfs;
    if (kpiProcedimentos) kpiProcedimentos.textContent = nProcs;
    if (kpiRetorno) kpiRetorno.textContent = `${percRetorno}%`;
  }

  // ==================== GRÁFICOS ====================

  function atualizarGraficos(dados) {
    gerarGaugeChart(dados);        // 1
    gerarDonutChart(dados);        // 2
    gerarEvolucaoMensal(dados);    // 3
    gerarProcedimentos(dados);     // 4 (por especialidade)
    gerarRanking(dados);           // 5
    gerarInsights(dados);          // 6
  }

  // ---------- Gráfico 1: Gauge ----------
  function gerarGaugeChart(dados) {
    const canvas = document.getElementById("gaugeChart");
    if (!canvas) return;
    if (charts.gauge) charts.gauge.destroy();

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

    const percTextEl = document.getElementById("percText");
    if (percTextEl) {
      percTextEl.textContent = `${taxaRenovacao}%`;
      percTextEl.style.color = taxaRenovacao > 50 ? '#15803d' : '#b45309';
    }

    charts.gauge = new Chart(canvas, {
      type: 'doughnut',
      data: {
        datasets: [{
          data: [taxaRenovacao, 100 - taxaRenovacao],
          backgroundColor: [taxaRenovacao > 50 ? '#22c55e' : '#f59e0b', '#ecf0f1'],
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

  // ---------- Gráfico 2: Donut ----------
  function gerarDonutChart(dados) {
    const canvas = document.getElementById("donutChart");
    if (!canvas) return;
    if (charts.donut) charts.donut.destroy();

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
          backgroundColor: ['#22c55e', '#3b82f6'],
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
            labels: { padding: 18, font: { size: 13, weight: 'bold' } }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.parsed || 0;
                const sum = context.dataset.data.reduce((a, b) => a + b, 0);
                const percent = sum > 0 ? Math.round((value / sum) * 100) : 0;
                return `${context.label}: ${SisregUtils.formatarNumero(value)} (${percent}%)`;
              }
            }
          }
        }
      }
    });
  }

  // ---------- Gráfico 3: Evolução Mensal ----------
  function gerarEvolucaoMensal(dados) {
    const canvas = document.getElementById("evolutionChart");
    if (!canvas) return;
    if (charts.evolucaoMensal) charts.evolucaoMensal.destroy();

    const mesesMap = {};
    const mesNome = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

    dados.forEach(d => {
      const dataInicio = SisregUtils.parseData(d.vigencia_inicio);
      if (!dataInicio || isNaN(dataInicio)) return;

      const mesIdx = dataInicio.getUTCMonth();
      const ano = dataInicio.getUTCFullYear();
      const mesAno = `${mesNome[mesIdx]}/${ano}`;

      if (!mesesMap[mesAno]) mesesMap[mesAno] = { v1: 0, vr: 0 };

      const vagasCalculadas = SisregUtils.calcularTotalVagas(
        d.vagas,
        d.dias_semana,
        d.vigencia_inicio,
        d.vigencia_fim
      );

      const campoProc = String(d.procedimento || "").toUpperCase().trim();
      const campoExame = String(d.exames || "").toUpperCase().trim();

      if (campoProc.includes("RETORNO") || campoExame.includes("RETORNO")) {
        mesesMap[mesAno].vr += vagasCalculadas;
      } else {
        mesesMap[mesAno].v1 += vagasCalculadas;
      }
    });

    const mesesOrdenados = Object.keys(mesesMap).sort((a, b) => {
      const [ma, aa] = a.split("/");
      const [mb, ab] = b.split("/");
      const idxA = mesNome.indexOf(ma);
      const idxB = mesNome.indexOf(mb);
      return (parseInt(aa) - parseInt(ab)) || (idxA - idxB);
    });

    const dados1aVez = mesesOrdenados.map(m => mesesMap[m].v1);
    const dadosRetorno = mesesOrdenados.map(m => mesesMap[m].vr);

    charts.evolucaoMensal = new Chart(canvas, {
      type: 'line',
      data: {
        labels: mesesOrdenados,
        datasets: [
          {
            label: 'Vagas de Retorno',
            data: dadosRetorno,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59,130,246,0.25)',
            fill: true,
            tension: 0.35,
            borderWidth: 3,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: '#fff',
            pointBorderColor: '#3b82f6',
            pointBorderWidth: 2
          },
          {
            label: 'Vagas 1ª Vez',
            data: dados1aVez,
            borderColor: '#22c55e',
            backgroundColor: 'rgba(34,197,94,0.22)',
            fill: true,
            tension: 0.35,
            borderWidth: 3,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: '#fff',
            pointBorderColor: '#22c55e',
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
            title: { display: true, text: 'Total de Vagas', font: { size: 13, weight: 'bold' } },
            ticks: { font: { size: 12 } }
          },
          x: { grid: { display: false }, ticks: { font: { size: 12, weight: 'bold' } } }
        },
        plugins: {
          legend: {
            position: 'top',
            labels: { padding: 18, font: { size: 13, weight: 'bold' }, usePointStyle: true }
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(0,0,0,0.85)',
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
        interaction: { mode: 'index', intersect: false }
      }
    });
  }

  // ---------- Gráfico 4: Oferta por Especialidade (Circle Packing D3) ----------
  function gerarProcedimentos(dados) {
    if (typeof d3 === 'undefined') return;

    const container = document.getElementById('chartProcedimentos');
    if (!container) return;

    container.innerHTML = '';

    // agrega por especialidade (centralizada)
    const especialidadeMap = {};

    dados.forEach(d => {
      const esp = extrairEspecialidade(d.procedimento || "OUTROS");

      const vagasCalculadas = SisregUtils.calcularTotalVagas(
        d.vagas,
        d.dias_semana,
        d.vigencia_inicio,
        d.vigencia_fim
      );

      especialidadeMap[esp] = (especialidadeMap[esp] || 0) + vagasCalculadas;
    });

    let dataRows = Object.entries(especialidadeMap)
      .map(([name, value]) => ({
        name: name.length > 20 ? name.substring(0, 17) + "..." : name,
        value
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 14);

    if (dataRows.length === 0) {
      container.innerHTML = '<p class="no-data-message">Nenhum dado disponível para este período</p>';
      return;
    }

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 360;
    const padding = 16;

    const svg = d3.select(container)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${padding},${padding})`);

    const root = d3.hierarchy({ children: dataRows })
      .sum(d => d.value)
      .sort((a, b) => b.value - a.value);

    d3.pack()
      .size([width - padding * 2, height - padding * 2])
      .padding(12)(root);

    const cores = [
      "#1d4ed8", "#22c55e", "#f59e0b", "#ef4444",
      "#06b6d4", "#a855f7", "#10b981", "#fb7185",
      "#0ea5e9", "#84cc16", "#eab308", "#f97316",
      "#14b8a6", "#6366f1"
    ];

    const color = d3.scaleOrdinal().range(cores);

    const nodes = svg.selectAll(".node")
      .data(root.leaves())
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", d => `translate(${d.x},${d.y})`);

    nodes.append("circle")
      .attr("r", d => d.r)
      .style("fill", (d, i) => {
        d._color = color(i);
        return d._color;
      })
      .style("cursor", "pointer")
      .on("mouseover", function (event, d) {
        d3.select(this).transition().duration(150).attr("r", d.r * 1.05).style("opacity", 0.95);

        const tooltip = d3.select("#d3-tooltip");
        if (tooltip.empty()) {
          d3.select("body").append("div")
            .attr("id", "d3-tooltip")
            .style("position", "absolute")
            .style("background", "rgba(0,0,0,0.85)")
            .style("color", "white")
            .style("padding", "10px 14px")
            .style("border-radius", "8px")
            .style("font-family", "'Inter', sans-serif")
            .style("font-size", "14px")
            .style("pointer-events", "none")
            .style("z-index", "9999");
        }

        d3.select("#d3-tooltip")
          .style("left", (event.pageX + 14) + "px")
          .style("top", (event.pageY - 28) + "px")
          .html(`<strong>${d.data.name}</strong><br/>${SisregUtils.formatarNumero(d.data.value)} vagas`);
      })
      .on("mousemove", function (event) {
        d3.select("#d3-tooltip")
          .style("left", (event.pageX + 14) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", function (event, d) {
        d3.select(this).transition().duration(150).attr("r", d.r).style("opacity", 1);
        d3.select("#d3-tooltip").remove();
      });

    nodes.append("text")
      .attr("dy", ".15em")
      .style("font-size", d => {
        const base = Math.min(d.r / 3.2, 16);
        return base > 9 ? base + "px" : "0px";
      })
      .style("fill", d => isLightColor(d._color) ? "#0f172a" : "#ffffff")
      .style("font-weight", "900")
      .style("paint-order", "stroke")
      .style("stroke", d => isLightColor(d._color) ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.55)")
      .style("stroke-width", "4px")
      .text(d => d.data.name);

    nodes.append("text")
      .attr("dy", "1.65em")
      .style("font-size", d => {
        const base = Math.min(d.r / 4.0, 14);
        return base > 8 ? base + "px" : "0px";
      })
      .style("fill", "rgba(255,255,255,0.92)")
      .style("font-weight", "800")
      .style("paint-order", "stroke")
      .style("stroke", "rgba(0,0,0,0.55)")
      .style("stroke-width", "4px")
      .text(d => SisregUtils.formatarNumero(d.data.value));
  }

  // ---------- Gráfico 5: Oferta por Profissional (jaleco) ----------
  function gerarRanking(dados) {
    if (typeof d3 === 'undefined') return;

    const container = document.getElementById('chartProfissionais');
    if (!container) return;

    container.innerHTML = '';

    const profissionalMap = {};
    dados.forEach(d => {
      const prof = (d.profissional || "Sem nome").trim();
      if (!prof) return;

      const vagasCalculadas = SisregUtils.calcularTotalVagas(
        d.vagas,
        d.dias_semana,
        d.vigencia_inicio,
        d.vigencia_fim
      );

      profissionalMap[prof] = (profissionalMap[prof] || 0) + vagasCalculadas;
    });

    let dataRows = Object.entries(profissionalMap)
      .map(([name, value]) => ({
        name: name.length > 20 ? name.substring(0, 17) + "..." : name,
        value
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    if (dataRows.length === 0) {
      container.innerHTML = '<p class="no-data-message">Nenhum dado disponível para este período</p>';
      return;
    }

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 360;
    const padding = 28;

    const svg = d3.select(container)
      .append("svg")
      .attr("width", width)
      .attr("height", height);

    svg.selectAll("*").remove();

    const defs = svg.append("defs");

    const shadow = defs.append("filter")
      .attr("id", "shadow-master")
      .attr("x", "-50%").attr("y", "-50%")
      .attr("width", "200%").attr("height", "200%");

    shadow.append("feDropShadow")
      .attr("dx", 0).attr("dy", 8)
      .attr("stdDeviation", 10)
      .attr("flood-color", "#000")
      .attr("flood-opacity", 0.16);

    const root = d3.hierarchy({ children: dataRows })
      .sum(d => d.value)
      .sort((a, b) => b.value - a.value);

    d3.pack()
      .size([width - padding * 2, height - padding * 2])
      .padding(32)(root);

    function colorByValue(v) {
      if (v >= 180) return "#b91c1c";
      if (v >= 140) return "#ea580c";
      if (v >= 100) return "#ca8a04";
      if (v >= 70)  return "#15803d";
      return "#4338ca";
    }

    const coatW = 140;
    const coatH = 160;
    const iconHref = "assets/jaleco.png";

    defs.append("mask")
      .attr("id", "coatMaskMaster")
      .attr("maskUnits", "userSpaceOnUse")
      .attr("x", 0).attr("y", 0)
      .attr("width", coatW).attr("height", coatH)
      .append("image")
      .attr("href", iconHref)
      .attr("x", 0).attr("y", 0)
      .attr("width", coatW).attr("height", coatH)
      .attr("preserveAspectRatio", "xMidYMid meet");

    const nodes = svg.selectAll("g.node")
      .data(root.leaves())
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", d => `translate(${d.x + padding},${d.y + padding})`);

    const coatGroup = nodes.append("g")
      .attr("filter", "url(#shadow-master)")
      .attr("transform", d => {
        const s = (d.r * 2) / coatW;
        return `scale(${s}) translate(${-coatW / 2},${-coatH / 2})`;
      });

    coatGroup.append("rect")
      .attr("x", 0).attr("y", 0)
      .attr("width", coatW).attr("height", coatH)
      .attr("fill", d => colorByValue(d.data.value))
      .attr("mask", "url(#coatMaskMaster)");

    coatGroup.append("rect")
      .attr("x", 0).attr("y", 0)
      .attr("width", coatW).attr("height", coatH)
      .attr("fill", "rgba(255,255,255,0.12)")
      .attr("mask", "url(#coatMaskMaster)");

    nodes.append("text")
      .attr("class", "value")
      .attr("y", 6)
      .style("font-size", d => `${Math.max(14, d.r / 2.2)}px`)
      .style("fill", d => isLightColor(colorByValue(d.data.value)) ? "#0f172a" : "#ffffff")
      .style("paint-order", "stroke")
      .style("stroke", d => isLightColor(colorByValue(d.data.value)) ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.55)")
      .style("stroke-width", "5px")
      .style("font-weight", "900")
      .text(d => SisregUtils.formatarNumero(d.data.value));

    nodes.append("text")
      .attr("class", "name")
      .attr("y", d => d.r + 20)
      .style("font-weight", "800")
      .text(d => d.data.name);
  }

  // ---------- Insights ----------
  function gerarInsights(dados) {
    const ul = document.getElementById("listaInsights");
    if (!ul) return;

    ul.innerHTML = "";

    if (!dados || dados.length === 0) {
      ul.innerHTML = "<li>Nenhum dado disponível para análise.</li>";
      return;
    }

    const totalVagas = dados.reduce((s, d) => s + (Number(d.vagas) || 0), 0);

    const dias = SISREG_CONFIG.DIAS_SEMANA || ["DOM","SEG","TER","QUA","QUI","SEX","SAB"];
    const byDay = Object.fromEntries(dias.map(d => [d, 0]));
    const byHour = {};
    for (let h = 7; h <= 18; h++) byHour[h] = 0;

    const byProf = {};
    let retornoV = 0;

    dados.forEach(d => {
      const v = Number(d.vagas) || 0;

      const diasSel = SisregUtils.extrairDias(d.dias_semana);
      if (diasSel.length === 0) byDay["SEG"] += v;
      else diasSel.forEach(di => { if (byDay[di] != null) byDay[di] += v; });

      const h0 = parseInt(String(SisregUtils.formatarHora(d.hora_inicio) || "0").split(":")[0] || "0", 10);
      if (byHour[h0] != null) byHour[h0] += v;

      const p = d.profissional || "(Sem nome)";
      byProf[p] = (byProf[p] || 0) + v;

      const campoProc = String(d.procedimento || "").toUpperCase().trim();
      const campoExame = String(d.exames || "").toUpperCase().trim();
      const isRet = campoProc.includes("RETORNO") || campoExame.includes("RETORNO");
      if (isRet) retornoV += v;
    });

    let topDay = dias[0];
    dias.forEach(di => { if (byDay[di] > byDay[topDay]) topDay = di; });
    const percTopDay = totalVagas > 0 ? Math.round((byDay[topDay] / totalVagas) * 100) : 0;

    let topHour = 7;
    for (let h = 7; h <= 18; h++) if (byHour[h] > byHour[topHour]) topHour = h;

    const profVals = Object.values(byProf);
    const hhi = totalVagas > 0
      ? Math.round(profVals.reduce((s, v) => s + Math.pow(v / totalVagas, 2), 0) * 1000)
      : 0;

    const profOrdenado = Object.entries(byProf).sort((a, b) => b[1] - a[1]);
    const top3 = profOrdenado.slice(0, 3);
    const top3Sum = top3.reduce((s, x) => s + x[1], 0);
    const percTop3 = totalVagas > 0 ? Math.round((top3Sum / totalVagas) * 100) : 0;

    const percRet = totalVagas > 0 ? Math.round((retornoV / totalVagas) * 100) : 0;

    const byProc = {};
    dados.forEach(d => {
      const k = (d.procedimento || "OUTROS").trim();
      byProc[k] = (byProc[k] || 0) + (Number(d.vagas) || 0);
    });
    const procTop = Object.entries(byProc).sort((a, b) => b[1] - a[1])[0];
    const procNome = procTop ? procTop[0] : "-";

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

  document.getElementById("filtroMes")?.addEventListener("change", aplicarFiltros);
  document.getElementById("filtroUnidade")?.addEventListener("change", aplicarFiltros);

  document.getElementById("btnLogout").onclick = () => {
    SisregUtils.clearSessao();
    window.location.href = SISREG_CONFIG.PAGINAS.INDEX;    
  };

  document.getElementById("btnExportarPDF").onclick = async () => {
    const area = document.getElementById("dashboardArea");
    if (!area) return;

    SisregUtils.showToast("📝 Gerando PDF...", "info");
    await new Promise(r => requestAnimationFrame(r));

    try {
      const canvas = await html2canvas(area, { scale: 2, useCORS: true, logging: false });
      const img = canvas.toDataURL("image/png");
      const { jsPDF } = window.jspdf;

      const pdf = new jsPDF("p", "mm", "a4");
      const pageW = 210;
      const imgW = pageW;
      const imgH = (canvas.height * imgW) / canvas.width;

      pdf.addImage(img, "PNG", 0, 10, imgW, imgH);
      pdf.save(`Dashboard_MASTER.pdf`);

      SisregUtils.showToast("✅ PDF exportado com sucesso!", "success");
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      SisregUtils.showToast("❌ Erro ao gerar PDF", "error");
    }
  };

  // ==================== SINCRONIZAÇÃO (ALL) ====================

  async function sincronizarALL() {
    const btn = document.getElementById("btnSincronizar");
    if (btn) SisregUtils.showLoading(btn, "Sincronizando...");

    try {
      const resp = await fetch(`${SISREG_CONFIG.API_URL}?unidade=${encodeURIComponent(UNIDADE_MASTER)}&t=${Date.now()}`);
      const res = await resp.json();

      if (res.status === "OK") {
        const dadosNorm = SisregUtils.normalizarLista(res.dados || []);
        dadosAll = dadosNorm;

        // monta lista de unidades encontradas
        const setU = new Set(
          dadosAll
            .map(x => String(x.unidade || "").trim())
            .filter(Boolean)
        );

        unidadesDisponiveis = Array.from(setU).sort((a, b) => a.localeCompare(b));
        preencherSelectUnidades(unidadesDisponiveis);

        SisregUtils.salvarLocalStorage(CACHE_KEY, dadosAll);

        // aplica filtros atuais e desenha tudo
        aplicarFiltros();

        SisregUtils.showToast("✅ Sincronizado com sucesso (todas as unidades)!", "success");
      } else {
        SisregUtils.showToast(SISREG_CONFIG.MENSAGENS.ERRO_SHEETS, "warning");
      }

    } catch (e) {
      console.error(e);
      SisregUtils.showToast(SISREG_CONFIG.MENSAGENS.ERRO_CONEXAO, "error");
    } finally {
      if (btn) SisregUtils.hideLoading(btn);
    }
  }

  document.getElementById("btnSincronizar").onclick = sincronizarALL;

  // ==================== INICIALIZAÇÃO (CACHE) ====================

  const cache = SisregUtils.carregarLocalStorage(CACHE_KEY, []);
  if (cache && Array.isArray(cache) && cache.length > 0) {
    dadosAll = SisregUtils.normalizarLista(cache);

    const setU = new Set(
      dadosAll
        .map(x => String(x.unidade || "").trim())
        .filter(Boolean)
    );

    unidadesDisponiveis = Array.from(setU).sort((a, b) => a.localeCompare(b));
    preencherSelectUnidades(unidadesDisponiveis);

    aplicarFiltros();
  } else {
    SisregUtils.showToast("ℹ️ Nenhum dado em cache. Clique em 'Sincronizar' para carregar.", "info");
  }

});
