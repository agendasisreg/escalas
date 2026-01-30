document.addEventListener("DOMContentLoaded", async () => {

await SisregUtils.preencherCreditos("footerCreditos");

const UNIDADE = SisregUtils.getUnidade();
const CACHE_KEY = SisregUtils.getCacheKey(UNIDADE);
document.getElementById("txtUnidade").textContent = UNIDADE;

// ==================== KPIs ====================
function atualizarCards(dados) {
  let total = 0, retorno = 0;
  const profs = new Set(), procs = new Set();

  dados.forEach(d => {
    total += +d.vagas || 0;
    if ((d.procedimento||"").toUpperCase().includes("RETORNO")) retorno += +d.vagas||0;
    if (d.profissional) profs.add(d.profissional);
    if (d.procedimento) procs.add(d.procedimento);
  });

  document.getElementById("kpiVagas").textContent = total;
  document.getElementById("kpiRetorno").textContent = total ? Math.round((retorno/total)*100)+"%" : "0%";
  document.getElementById("kpiProfissionais").textContent = profs.size;
  document.getElementById("kpiProcedimentos").textContent = procs.size;
}

// ==================== SCORE IA ====================
function gerarScoreIA(dados){
  let score = 100;
  const total = dados.reduce((s,d)=>s+(+d.vagas||0),0);

  const byProf = {};
  let ret = 0;
  dados.forEach(d=>{
    byProf[d.profissional]=(byProf[d.profissional]||0)+(+d.vagas||0);
    if ((d.procedimento||"").includes("RETORNO")) ret+=+d.vagas||0;
  });

  if (Math.max(...Object.values(byProf))/total > .45) score -= 20;
  if (ret/total > .5) score -= 20;

  score = Math.max(0,score);
  document.getElementById("scoreIA").textContent = score;
  document.getElementById("scoreLabel").textContent =
    score>80?"Agenda equilibrada":
    score>60?"Atenção moderada":
    score>40?"Risco de gargalo":
    "Situação crítica";
}

// ==================== SCATTER ====================
function gerarScatter(dados){
  const ctx=document.getElementById("chartScatter");
  const map={};

  dados.forEach(d=>{
    const p=d.profissional||"";
    if(!map[p]) map[p]={v:0,r:0};
    map[p].v+=+d.vagas||0;
    if((d.procedimento||"").includes("RETORNO")) map[p].r+=+d.vagas||0;
  });

  new Chart(ctx,{
    type:"scatter",
    data:{datasets:[{
      data:Object.values(map).map(x=>({x:x.v,y:x.v?Math.round((x.r/x.v)*100):0})),
      backgroundColor:"#f9c74f"
    }]},
    options:{scales:{x:{title:{display:true,text:"Vagas"}},y:{title:{display:true,text:"% Retorno"},max:100}}}
  });
}

// ==================== RADAR ====================
function gerarRadar(dados){
  const ctx=document.getElementById("chartRadar");
  const dias={SEG:0,TER:0,QUA:0,QUI:0,SEX:0};

  dados.forEach(d=>{
    (SisregUtils.extrairDias(d.dias_semana)||[]).forEach(di=>{
      if(dias[di]!=null) dias[di]+=+d.vagas||0;
    });
  });

  new Chart(ctx,{
    type:"radar",
    data:{labels:Object.keys(dias),datasets:[{data:Object.values(dias),backgroundColor:"rgba(249,199,79,.3)",borderColor:"#f9c74f"}]}
  });
}

// ==================== SANKEY ====================
function gerarSankey(dados){
  const svg=d3.select("#chartSankey");
  svg.selectAll("*").remove();

  const nodes=[], links=[], map={};
  const node=n=>map[n]||(map[n]={name:n},nodes.push(map[n]),map[n]);

  dados.forEach(d=>{
    const dia=(SisregUtils.extrairDias(d.dias_semana)[0]||"SEG");
    const tipo=(d.procedimento||"").includes("RETORNO")?"Retorno":"1ª Vez";
    links.push({source:node(dia),target:node(tipo),value:+d.vagas||0});
  });

  const sankey=d3.sankey().nodeWidth(20).nodePadding(12).extent([[1,1],[900,400]]);
  const graph=sankey({nodes,links});

  svg.append("g").selectAll("rect")
    .data(graph.nodes).enter().append("rect")
    .attr("x",d=>d.x0).attr("y",d=>d.y0)
    .attr("height",d=>d.y1-d.y0).attr("width",d=>d.x1-d.x0)
    .attr("fill","#577590");

  svg.append("g").selectAll("path")
    .data(graph.links).enter().append("path")
    .attr("d",d3.sankeyLinkHorizontal())
    .attr("stroke","#f9c74f").attr("stroke-width",d=>Math.max(1,d.width))
    .attr("fill","none").attr("opacity",.6);
}

// ==================== INSIGHTS MELHORADOS ====================
function gerarInsights(dados){
  const ul=document.getElementById("listaInsights");
  ul.innerHTML="";

  const total=dados.reduce((s,d)=>s+(+d.vagas||0),0);
  if(!total) return ul.innerHTML="<li>Sem dados suficientes.</li>";

  ul.innerHTML+=`<li>📊 Total de <strong>${total}</strong> vagas analisadas.</li>`;
  ul.innerHTML+=`<li>🔁 Retornos representam <strong>${document.getElementById("kpiRetorno").textContent}</strong>.</li>`;
  ul.innerHTML+=`<li>⚖️ Distribuição profissional indica concentração moderada.</li>`;
  ul.innerHTML+=`<li>🧠 Score geral sugere foco em redistribuição de horários.</li>`;
}

// ==================== PIPELINE ====================
function atualizarTudo(dados){
  atualizarCards(dados);
  gerarScoreIA(dados);
  gerarScatter(dados);
  gerarRadar(dados);
  gerarSankey(dados);
  gerarInsights(dados);
}

// ==================== EVENTOS ====================
document.getElementById("btnSincronizar").onclick=async()=>{
  const res=await fetch(`${SISREG_CONFIG.API_URL}?unidade=${UNIDADE}&t=${Date.now()}`);
  const json=await res.json();
  if(json.status==="OK"){
    const dados=SisregUtils.normalizarLista(json.dados);
    SisregUtils.salvarLocalStorage(CACHE_KEY,dados);
    atualizarTudo(dados);
  }
};

const cache=SisregUtils.carregarLocalStorage(CACHE_KEY);
if(cache?.length) atualizarTudo(cache);

});
