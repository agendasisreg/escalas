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
  
  // ==================== GRÁFICOS (SUBSTITUÍDOS) ====================
  
  /**
   * Atualiza TODOS os gráficos (NOVOS)
   * (mantive o nome e o pipeline exatamente como estava, só troquei as chamadas)
   */
  function atualizarGraficos(dados) {
    gerarRadial(dados);
    gerarScatterProfissionais(dados);
    gerarRadarSemana(dados);
    gerarSankeyFluxo(dados);
    gerarMapaRisco(dados);
    gerarInsights(dados); // mantido + melhorado
  }

  /**
   * Gráfico A: Mapa Radial (Dia × Hora) em SVG (D3)
   * - Visual "IA-like" e bem diferente do tradicional
   */
  function gerarRadial(dados) {
    const el = document.getElementById("chartRadial");
    if (!el || typeof d3 === "undefined") return;

    const svg = d3.select(el);
    svg.selectAll("*").remove();

    const width = el.clientWidth || 900;
    const height = el.clientHeight || 360;
    svg.attr("viewBox", `0 0 ${width} ${height}`);

    const cx = width / 2;
    const cy = height / 2;
    const g = svg.append("g").attr("transform", `translate(${cx},${cy})`);

    const dias = SISREG_CONFIG.DIAS_SEMANA; // ["DOM","SEG",...]
    const idxDia = Object.fromEntries(dias.map((d,i)=>[d,i]));

    // horas de interesse (pega do seu padrão 7..18, mas ajusta se necessário)
    const H0 = 7, H1 = 18;
    const horas = [];
    for (let h = H0; h <= H1; h++) horas.push(h);

    // Agrega (dia, hora) -> vagas
    const mapa = new Map();
    dados.forEach(d => {
      const diasSel = SisregUtils.extrairDias(d.dias_semana);
      const h0 = parseInt(String(SisregUtils.formatarHora(d.hora_inicio) || "0").split(":")[0] || "0", 10);

      // força no range do radial
      const hh = Math.max(H0, Math.min(H1, isFinite(h0) ? h0 : H0));
      const v = Number(d.vagas) || 0;

      (diasSel.length ? diasSel : ["SEG"]).forEach(di => {
        const key = `${di}|${hh}`;
        mapa.set(key, (mapa.get(key) || 0) + v);
      });
    });

    let maxV = 1;
    mapa.forEach(v => { if (v > maxV) maxV = v; });

    const innerR = Math.min(width, height) * 0.12;
    const outerR = Math.min(width, height) * 0.46;

    const angle = d3.scaleLinear()
      .domain([0, dias.length])
      .range([0, Math.PI * 2]);

    const ring = d3.scaleBand()
      .domain(horas.map(String))
      .range([innerR, outerR])
      .paddingInner(0.07);

    const color = d3.scaleSequential()
      .domain([0, maxV])
      .interpolator(d3.interpolateTurbo);

    // Anéis por hora; setores por dia
    const arc = d3.arc();

    const cells = [];
    dias.forEach(di => {
      horas.forEach(h => {
        const key = `${di}|${h}`;
        cells.push({ di, h, v: mapa.get(key) || 0 });
      });
    });

    g.selectAll("path.cell")
      .data(cells)
      .enter()
      .append("path")
      .attr("class", "cell")
      .attr("d", d => {
        const i = idxDia[d.di];
        const a0 = angle(i);
        const a1 = angle(i + 1);
        const r0 = ring(String(d.h));
        const r1 = r0 + ring.bandwidth();
        return arc({
          innerRadius: r0,
          outerRadius: r1,
          startAngle: a0,
          endAngle: a1
        });
      })
      .attr("fill", d => color(d.v))
      .attr("opacity", d => (d.v > 0 ? 0.95 : 0.18))
      .append("title")
      .text(d => `${d.di} ${String(d.h).padStart(2,"0")}:00 • ${d.v} vagas`);

    // Labels dos dias
    const labelR = outerR + 14;
    g.selectAll("text.day")
      .data(dias)
      .enter()
      .append("text")
      .attr("class", "day")
      .attr("text-anchor", "middle")
      .attr("font-size", 11)
      .attr("fill", "rgba(0,0,0,0.75)")
      .attr("transform", (d, i) => {
        const a = angle(i + 0.5) - Math.PI / 2;
        const x = Math.cos(a) * labelR;
        const y = Math.sin(a) * labelR;
        return `translate(${x},${y})`;
      })
      .text(d => d);

    // Labels de horas (apenas algumas para não poluir)
    const hourTicks = horas.filter(h => (h === H0 || h === H1 || h % 2 === 0));
    g.selectAll("text.hour")
      .data(hourTicks)
      .enter()
      .append("text")
      .attr("class", "hour")
      .attr("text-anchor", "middle")
      .attr("font-size", 10)
      .attr("fill", "rgba(0,0,0,0.60)")
      .attr("y", d => -(ring(String(d)) + ring.bandwidth()/2))
      .text(d => `${String(d).padStart(2,"0")}:00`);
  }

  /**
   * Gráfico B: Eficiência dos Profissionais (Bubble/Scatter) - Chart.js
   * X = vagas total
   * Y = % retorno
   * Bolha = presença (nº de registros/dias)
   */
  function gerarScatterProfissionais(dados) {
    const canvas = document.getElementById("chartScatter");
    if (!canvas) return;
    if (charts.scatter) charts.scatter.destroy();

    const byProf = {};
    dados.forEach(d => {
      const prof = (d.profissional || "Sem nome").trim();
      if (!byProf[prof]) byProf[prof] = { total: 0, ret: 0, n: 0 };
      const v = Number(d.vagas) || 0;

      byProf[prof].total += v;
      byProf[prof].n += 1;

      const campoProc = String(d.procedimento || "").toUpperCase().trim();
      const campoExame = String(d.exames || "").toUpperCase().trim();
      if (campoProc.includes("RETORNO") || campoExame.includes("RETORNO")) byProf[prof].ret += v;
    });

    const pontos = Object.entries(byProf).map(([prof, o]) => {
      const perc = o.total > 0 ? Math.round((o.ret / o.total) * 100) : 0;
      const r = Math.max(5, Math.min(18, Math.round(Math.sqrt(o.n) * 4)));
      return { x: o.total, y: perc, r, _prof: prof, _n: o.n, _ret: o.ret };
    }).sort((a,b)=>b.x-a.x);

    charts.scatter = new Chart(canvas, {
      type: "bubble",
      data: {
        datasets: [{
          label: "Profissionais",
          data: pontos,
          backgroundColor: "rgba(33, 150, 243, 0.35)",
          borderColor: "rgba(33, 150, 243, 0.85)",
          borderWidth: 1.5
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
                return `${r._prof} • ${ctx.parsed.x} vagas • ${ctx.parsed.y}% retorno • ${r._n} registros`;
              }
            }
          }
        },
        scales: {
          x: { title: { display: true, text: "Vagas ofertadas (total)" }, beginAtZero: true },
          y: { title: { display: true, text: "% Retorno" }, min: 0, max: 100 }
        }
      }
    });
  }

  /**
   * Gráfico C: Radar da semana (distribuição por dia) - Chart.js
   */
  function gerarRadarSemana(dados) {
    const canvas = document.getElementById("chartRadar");
    if (!canvas) return;
    if (charts.radar) charts.radar.destroy();

    const dias = SISREG_CONFIG.DIAS_SEMANA;
    const byDay = Object.fromEntries(dias.map(d => [d, 0]));

    dados.forEach(d => {
      const v = Number(d.vagas) || 0;
      const diasSel = SisregUtils.extrairDias(d.dias_semana);
      if (!diasSel || diasSel.length === 0) byDay["SEG"] += v;
      else diasSel.forEach(di => { if (byDay[di] != null) byDay[di] += v; });
    });

    const labels = dias;
    const valores = labels.map(d => byDay[d] || 0);

    charts.radar = new Chart(canvas, {
      type: "radar",
      data: {
        labels,
        datasets: [{
          label: "Distribuição",
          data: valores,
          backgroundColor: "rgba(76, 175, 80, 0.18)",
          borderColor: "rgba(76, 175, 80, 0.85)",
          borderWidth: 2,
          pointRadius: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          r: {
            beginAtZero: true,
            ticks: { display: false }
          }
        }
      }
    });
  }

  /**
   * Gráfico D: Sankey (Dia → Tipo → Procedimento Top) - D3 Sankey
   */
  function gerarSankeyFluxo(dados) {
    const el = document.getElementById("chartSankey");
    if (!el || typeof d3 === "undefined" || typeof d3.sankey === "undefined") return;

    const svg = d3.select(el);
    svg.selectAll("*").remove();

    const width = el.clientWidth || 900;
    const height = el.clientHeight || 360;
    svg.attr("viewBox", `0 0 ${width} ${height}`);

    // Top procedimentos para não virar uma sopa de nós
    const byProc = {};
    dados.forEach(d => {
      const k = (d.procedimento || "OUTROS").trim();
      byProc[k] = (byProc[k] || 0) + (Number(d.vagas) || 0);
    });
    const topProc = new Set(
      Object.entries(byProc).sort((a,b)=>b[1]-a[1]).slice(0, 8).map(x=>x[0])
    );

    const nodes = [];
    const nodeIndex = new Map();
    const linksAgg = new Map();

    function addNode(name) {
      if (!nodeIndex.has(name)) {
        nodeIndex.set(name, nodes.length);
        nodes.push({ name });
      }
      return nodeIndex.get(name);
    }

    function addLink(src, tgt, value) {
      const key = `${src}→${tgt}`;
      linksAgg.set(key, (linksAgg.get(key) || 0) + value);
    }

    dados.forEach(d => {
      const diasSel = SisregUtils.extrairDias(d.dias_semana);
      const dia = (diasSel && diasSel.length ? diasSel[0] : "SEG"); // simplifica 1º dia (mantém leitura)
      const v = Number(d.vagas) || 0;

      const campoProc = String(d.procedimento || "").toUpperCase().trim();
      const campoExame = String(d.exames || "").toUpperCase().trim();
      const tipo = (campoProc.includes("RETORNO") || campoExame.includes("RETORNO")) ? "RETORNO" : "1ª VEZ";

      const proc = (d.procedimento || "OUTROS").trim();
      const procNome = topProc.has(proc) ? proc : "OUTROS";

      const nDia = addNode(dia);
      const nTipo = addNode(tipo);
      const nProc = addNode(procNome);

      addLink(nDia, nTipo, v);
      addLink(nTipo, nProc, v);
    });

    const links = Array.from(linksAgg.entries()).map(([k, value]) => {
      const [s, t] = k.split("→");
      return { source: Number(s), target: Number(t), value };
    });

    const sankey = d3.sankey()
      .nodeWidth(18)
      .nodePadding(10)
      .extent([[10, 10], [width - 10, height - 10]]);

    const graph = sankey({
      nodes: nodes.map(d => ({ ...d })),
      links: links.map(d => ({ ...d }))
    });

    // Links
    svg.append("g")
      .attr("fill", "none")
      .attr("stroke-opacity", 0.35)
      .selectAll("path")
      .data(graph.links)
      .enter()
      .append("path")
      .attr("d", d3.sankeyLinkHorizontal())
      .attr("stroke", "rgba(33, 150, 243, 0.9)")
      .attr("stroke-width", d => Math.max(1, d.width))
      .append("title")
      .text(d => `${graph.nodes[d.source.index].name} → ${graph.nodes[d.target.index].name}: ${d.value} vagas`);

    // Nodes
    const nodeG = svg.append("g")
      .selectAll("g")
      .data(graph.nodes)
      .enter()
      .append("g");

    nodeG.append("rect")
      .attr("x", d => d.x0)
      .attr("y", d => d.y0)
      .attr("height", d => d.y1 - d.y0)
      .attr("width", d => d.x1 - d.x0)
      .attr("rx", 6)
      .attr("fill", "rgba(76, 175, 80, 0.75)")
      .append("title")
      .text(d => `${d.name}: ${Math.round(d.value || 0)} vagas`);

    nodeG.append("text")
      .attr("x", d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
      .attr("y", d => (d.y0 + d.y1) / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
      .attr("font-size", 11)
      .attr("fill", "rgba(0,0,0,0.75)")
      .text(d => d.name);
  }

  /**
   * Gráfico E: Mapa de risco (bolhas) - Chart.js
   * Ideia: dia×hora com "risco" baseado em:
   * - baixa oferta (quanto menor, maior risco)
   * - maior proporção de retorno naquele slot
   */
  function gerarMapaRisco(dados) {
    const canvas = document.getElementById("chartRisco");
    if (!canvas) return;
    if (charts.risco) charts.risco.destroy();

    const dias = SISREG_CONFIG.DIAS_SEMANA;
    const idxDia = Object.fromEntries(dias.map((d,i)=>[d,i]));

    const H0 = 7, H1 = 18;
    const slots = new Map();
    dados.forEach(d => {
      const diasSel = SisregUtils.extrairDias(d.dias_semana);
      const h0 = parseInt(String(SisregUtils.formatarHora(d.hora_inicio) || "0").split(":")[0] || "0", 10);
      const hh = Math.max(H0, Math.min(H1, isFinite(h0) ? h0 : H0));
      const v = Number(d.vagas) || 0;

      const campoProc = String(d.procedimento || "").toUpperCase().trim();
      const campoExame = String(d.exames || "").toUpperCase().trim();
      const isRet = (campoProc.includes("RETORNO") || campoExame.includes("RETORNO"));

      (diasSel.length ? diasSel : ["SEG"]).forEach(di => {
        const key = `${di}|${hh}`;
        if (!slots.has(key)) slots.set(key, { dia: di, h: hh, total: 0, ret: 0 });
        const s = slots.get(key);
        s.total += v;
        if (isRet) s.ret += v;
      });
    });

    let maxTotal = 1;
    slots.forEach(s => { if (s.total > maxTotal) maxTotal = s.total; });

    const pontos = [];
    slots.forEach(s => {
      const retPerc = s.total > 0 ? (s.ret / s.total) : 0;
      // risco: baixa oferta + alto retorno
      const baixaOferta = 1 - (s.total / maxTotal);
      const risco = Math.min(1, (baixaOferta * 0.65) + (retPerc * 0.35));

      pontos.push({
        x: idxDia[s.dia],
        y: s.h,
        r: Math.max(5, Math.round(6 + risco * 14)),
        _risco: risco,
        _total: s.total,
        _ret: Math.round(retPerc * 100),
        _dia: s.dia
      });
    });

    charts.risco = new Chart(canvas, {
      type: "bubble",
      data: {
        datasets: [{
          label: "Risco",
          data: pontos,
          backgroundColor: (ctx) => {
            const raw = ctx.raw || {};
            const r = raw._risco || 0;
            // verde -> amarelo -> vermelho
            const R = Math.round(80 + r * 160);
            const G = Math.round(200 - r * 140);
            const B = 90;
            return `rgba(${R},${G},${B},0.65)`;
          },
          borderColor: "rgba(0,0,0,0.08)",
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
                const dia = r._dia || "";
                const hh = String(ctx.parsed.y).padStart(2,"0");
                const riscoPct = Math.round((r._risco || 0) * 100);
                return `${dia} ${hh}:00 • risco ${riscoPct}% • ${r._total} vagas • ${r._ret}% retorno`;
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
            title: { display: true, text: "Hora (início)" },
            ticks: { callback: (v) => `${String(v).padStart(2,"0")}:00` }
          }
        }
      }
    });
  }

  /**
   * Insights Automáticos (mantido, mas MELHORADO)
   * - mais acionável e mais “gerencial”
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

    // Dia campeão
    const byDay = Object.fromEntries(SISREG_CONFIG.DIAS_SEMANA.map(d => [d, 0]));
    dados.forEach(d => {
      const v = Number(d.vagas) || 0;
      const diasSel = SisregUtils.extrairDias(d.dias_semana);
      if (!diasSel || diasSel.length === 0) byDay["SEG"] += v;
      else diasSel.forEach(di => { if (byDay[di] != null) byDay[di] += v; });
    });

    let topDay = SISREG_CONFIG.DIAS_SEMANA[0];
    SISREG_CONFIG.DIAS_SEMANA.forEach(di => { if (byDay[di] > byDay[topDay]) topDay = di; });
    const percTopDay = totalVagas > 0 ? Math.round((byDay[topDay] / totalVagas) * 100) : 0;

    // Hora campeã
    const byHour = {};
    for (let h = 7; h <= 18; h++) byHour[h] = 0;
    dados.forEach(d => {
      const h0 = parseInt(String(SisregUtils.formatarHora(d.hora_inicio) || "0").split(":")[0] || "0", 10);
      const hh = Math.max(7, Math.min(18, isFinite(h0) ? h0 : 7));
      byHour[hh] += Number(d.vagas) || 0;
    });
    let topHour = 7;
    Object.keys(byHour).forEach(h => { if (byHour[h] > byHour[topHour]) topHour = Number(h); });
    const percTopHour = totalVagas > 0 ? Math.round((byHour[topHour] / totalVagas) * 100) : 0;

    // Concentração por profissionais (Top 4)
    const byProf = {};
    dados.forEach(d => {
      const p = (d.profissional || "(Sem nome)").trim();
      byProf[p] = (byProf[p] || 0) + (Number(d.vagas) || 0);
    });
    const profOrdenado = Object.entries(byProf).sort((a,b)=>b[1]-a[1]);
    const top4 = profOrdenado.slice(0,4);
    const top4Soma = top4.reduce((s, x)=>s + x[1], 0);
    const percTop4 = totalVagas > 0 ? Math.round((top4Soma / totalVagas) * 100) : 0;

    // Retorno %
    let retornoV = 0;
    dados.forEach(d => {
      const campoProc = String(d.procedimento || "").toUpperCase().trim();
      const campoExame = String(d.exames || "").toUpperCase().trim();
      const isRet = campoProc.includes("RETORNO") || campoExame.includes("RETORNO");
      if (isRet) retornoV += (Number(d.vagas) || 0);
    });
    const percRet = totalVagas > 0 ? Math.round((retornoV / totalVagas) * 100) : 0;

    // Procedimento líder
    const byProc = {};
    dados.forEach(d => {
      const k = (d.procedimento || "OUTROS").trim();
      byProc[k] = (byProc[k] || 0) + (Number(d.vagas) || 0);
    });
    const procTop = Object.entries(byProc).sort((a,b)=>b[1]-a[1])[0];
    const procNome = procTop ? procTop[0] : "-";
    const procV = procTop ? procTop[1] : 0;
    const procPerc = totalVagas > 0 ? Math.round((procV / totalVagas) * 100) : 0;

    // Recomendações (heurísticas simples, mas úteis)
    const alertaConcentracao = percTop4 >= 60 ? "🔴 Alta concentração: considerar redistribuir oferta entre mais profissionais." :
                              percTop4 >= 45 ? "🟠 Concentração moderada: monitorar dependência de poucos profissionais." :
                              "🟢 Concentração saudável.";

    const alertaRetorno = percRet >= 50 ? "🟠 Retorno muito alto: pode estar comprimindo 1ª vez (entrada)." :
                         percRet >= 30 ? "🟢 Retorno em patamar esperado." :
                         "🟡 Retorno baixo: avaliar se há suboferta de retornos.";

    ul.innerHTML = `
      <li>📌 <strong>${topDay}</strong> concentra <strong>${percTopDay}%</strong> das vagas.</li>
      <li>⏱️ Pico em <strong>${String(topHour).padStart(2,"0")}:00</strong> com <strong>${percTopHour}%</strong> das vagas.</li>
      <li>👥 Top 4 profissionais somam <strong>${percTop4}%</strong> da oferta. <em>${alertaConcentracao}</em></li>
      <li>🔁 Retornos representam <strong>${percRet}%</strong> das vagas. <em>${alertaRetorno}</em></li>
      <li>🏆 Procedimento líder: <strong>${procNome}</strong> (<strong>${procPerc}%</strong>).</li>
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
