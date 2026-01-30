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
  // [ALTERADO APENAS AQUI: removi os antigos e coloquei novos]
  
  /**
   * Atualiza TODOS os gráficos (novos)
   */
  function atualizarGraficos(dados) {
    gerarRadial(dados);
    gerarEficienciaBubble(dados);
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
   * Gráfico A: Radial (dia x hora) — visual “IA-like”
   */
  function gerarRadial(dados) {
    const svgEl = document.getElementById("chartRadial");
    if (!svgEl || typeof d3 === "undefined") return;
  
    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();
  
    const w = svgEl.clientWidth || 420;
    const h = svgEl.clientHeight || 320;
    const cx = w / 2;
    const cy = h / 2;
    const R = Math.min(w, h) * 0.42;
  
    svg.attr("viewBox", `0 0 ${w} ${h}`);
  
    const dias = ["DOM","SEG","TER","QUA","QUI","SEX","SAB"];
  
    // ===== AGREGAÇÃO: total de vagas por dia =====
    const byDay = Object.fromEntries(dias.map(d => [d, 0]));
  
    dados.forEach(d => {
      const v = Number(d.vagas) || 0;
  
      const diasSel = String(d.dias_semana || "")
        .toUpperCase()
        .split(",")
        .map(x => x.trim())
        .filter(x => dias.includes(x));
  
      if (diasSel.length === 0) {
        byDay["SEG"] += v; // fallback
      } else {
        diasSel.forEach(di => byDay[di] += v);
      }
    });
  
    const maxV = Math.max(1, ...Object.values(byDay));
  
    const g = svg.append("g")
      .attr("transform", `translate(${cx},${cy})`);
  
    const angle = d3.scaleBand()
      .domain(dias)
      .range([0, Math.PI * 2])
      .align(0);
  
    const radius = d3.scaleLinear()
      .domain([0, maxV])
      .range([0, R]);
  
    const color = d3.scaleSequential(d3.interpolateYlOrBr)
      .domain([0, maxV]);
  
    const arc = d3.arc()
      .innerRadius(0)
      .outerRadius(d => radius(d.value))
      .startAngle(d => angle(d.day))
      .endAngle(d => angle(d.day) + angle.bandwidth())
      .padAngle(0.02)
      .padRadius(0);
  
    const data = dias.map(day => ({
      day,
      value: byDay[day]
    }));
  
    g.selectAll("path")
      .data(data)
      .enter()
      .append("path")
      .attr("d", arc)
      .attr("fill", d => color(d.value))
      .attr("opacity", 0.9)
      .attr("stroke", "rgba(0,0,0,0.12)")
      .on("mousemove", (event, d) => {
        const tip = `${d.day}<br/><strong>${d.value}</strong> vagas`;
        const el = document.getElementById("vizTooltip");
        if (el) {
          el.innerHTML = tip;
          el.style.left = event.clientX + 12 + "px";
          el.style.top = event.clientY + 12 + "px";
          el.style.display = "block";
        }
      })
      .on("mouseleave", () => {
        const el = document.getElementById("vizTooltip");
        if (el) el.style.display = "none";
      });
  
    // ===== RÓTULOS =====
    g.selectAll("text")
      .data(data)
      .enter()
      .append("text")
      .attr("text-anchor", "middle")
      .attr("font-size", 11)
      .attr("fill", "rgba(0,0,0,0.75)")
      .attr("transform", d => {
        const a = angle(d.day) + angle.bandwidth() / 2 - Math.PI / 2;
        const r = R + 18;
        return `translate(${Math.cos(a) * r},${Math.sin(a) * r})`;
      })
      .text(d => d.day);
  }

  /**
   * Gráfico B: Eficiência por Profissional (Bubble)
   *  x = vagas totais
   *  y = % retorno
   *  r = quantidade de dias ofertados
   */
  function gerarEficienciaBubble(dados) {
    const canvas = document.getElementById("chartEficiência");
    if (!canvas) return;
    if (charts.eficiencia) charts.eficiencia.destroy();

    const profMap = {};
    dados.forEach(d => {
      const prof = (d.profissional || "(Sem nome)").trim();
      if (!profMap[prof]) profMap[prof] = { total: 0, ret: 0, dias: new Set() };

      const v = Number(d.vagas) || 0;
      profMap[prof].total += v;

      const campoProc = String(d.procedimento || "").toUpperCase().trim();
      const campoExame = String(d.exames || "").toUpperCase().trim();
      const isRet = campoProc.includes("RETORNO") || campoExame.includes("RETORNO");
      if (isRet) profMap[prof].ret += v;

      const diasSel = SisregUtils.extrairDias(d.dias_semana);
      diasSel.forEach(di => profMap[prof].dias.add(di));
    });

    const pontos = Object.entries(profMap).map(([prof, x]) => {
      const perc = x.total > 0 ? Math.round((x.ret / x.total) * 100) : 0;
      const r = Math.max(5, Math.min(18, x.dias.size * 4));
      return { x: x.total, y: perc, r, _prof: prof, _total: x.total, _ret: x.ret, _dias: x.dias.size };
    });

    charts.eficiencia = new Chart(canvas, {
      type: "bubble",
      data: {
        datasets: [{
          label: "Profissionais",
          data: pontos,
          backgroundColor: "rgba(253,187,45,0.55)",
          borderColor: "rgba(0,0,0,0.10)",
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
                return `${r._prof} • total ${r._total} • retorno ${r._ret} (${r.y}%) • dias ${r._dias}`;
              }
            }
          }
        },
        scales: {
          x: { title: { display: true, text: "Vagas totais" }, grid: { color: "rgba(0,0,0,0.06)" } },
          y: { title: { display: true, text: "% Retorno" }, max: 100, beginAtZero: true, grid: { color: "rgba(0,0,0,0.06)" } }
        }
      }
    });
  }

  /**
   * Gráfico C: Stream por horário (1ª vez vs retorno)
   */
  function gerarStreamHorario(dados) {
    const svgEl = document.getElementById("chartStream");
    if (!svgEl || typeof d3 === "undefined") return;

    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();

    const w = svgEl.clientWidth || 520;
    const h = svgEl.clientHeight || 320;
    svg.attr("viewBox", `0 0 ${w} ${h}`);

    const hMin = 7;
    const hMax = 18;
    const hours = d3.range(hMin, hMax + 1);

    const byH = {};
    hours.forEach(hr => byH[hr] = { hr, primeira: 0, retorno: 0 });

    dados.forEach(d => {
      const hr = parseInt(String(SisregUtils.formatarHora(d.hora_inicio) || "0").split(":")[0] || "0", 10);
      if (byH[hr] == null) return;

      const v = Number(d.vagas) || 0;
      const campoProc = String(d.procedimento || "").toUpperCase().trim();
      const campoExame = String(d.exames || "").toUpperCase().trim();
      const isRet = campoProc.includes("RETORNO") || campoExame.includes("RETORNO");

      if (isRet) byH[hr].retorno += v;
      else byH[hr].primeira += v;
    });

    const data = hours.map(hr => byH[hr]);

    const keys = ["primeira", "retorno"];
    const stack = d3.stack()
      .keys(keys)
      .offset(d3.stackOffsetWiggle)
      .order(d3.stackOrderNone);

    const series = stack(data);

    const x = d3.scaleLinear()
      .domain([hMin, hMax])
      .range([40, w - 20]);

    const y = d3.scaleLinear()
      .domain([
        d3.min(series, s => d3.min(s, d => d[0])),
        d3.max(series, s => d3.max(s, d => d[1]))
      ])
      .nice()
      .range([h - 30, 20]);

    const area = d3.area()
      .x((d,i) => x(data[i].hr))
      .y0(d => y(d[0]))
      .y1(d => y(d[1]))
      .curve(d3.curveCatmullRom.alpha(0.4));

    const colors = {
      primeira: "rgba(46, 204, 113, 0.55)",
      retorno: "rgba(231, 76, 60, 0.55)"
    };

    svg.append("g")
      .selectAll("path")
      .data(series)
      .enter()
      .append("path")
      .attr("d", area)
      .attr("fill", s => colors[s.key] || "rgba(0,0,0,0.12)")
      .attr("stroke", "rgba(0,0,0,0.08)")
      .attr("stroke-width", 1)
      .on("mousemove", (event, s) => {
        showTip(`<strong>${s.key === "primeira" ? "1ª Vez" : "Retorno"}</strong><br/>Distribuição por horário`, event.clientX, event.clientY);
      })
      .on("mouseleave", hideTip);

    // Eixo X (horas)
    const axisX = d3.axisBottom(x).ticks(hMax - hMin).tickFormat(d => String(d).padStart(2,"0")+":00");
    svg.append("g")
      .attr("transform", `translate(0,${h-30})`)
      .call(axisX)
      .call(g => g.selectAll("text").attr("font-size", 10).attr("opacity", 0.8))
      .call(g => g.selectAll("path,line").attr("stroke", "rgba(0,0,0,0.15)"));

    // Label
    svg.append("text")
      .attr("x", 40)
      .attr("y", 16)
      .attr("font-size", 11)
      .attr("fill", "rgba(0,0,0,0.7)")
      .text("Horários (início) — forma indica concentração");
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
