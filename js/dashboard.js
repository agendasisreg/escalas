/* [LOGICA] Inicializacao e Variaveis de Ambiente */
document.addEventListener("DOMContentLoaded", () => {
    // Busca a URL do arquivo de configuração centralizado
    const URL_API = (typeof CONFIG !== 'undefined') ? CONFIG.URL_API : "";
    const UNIDADE = localStorage.getItem("unidade_selecionada") || "AGENDA TESTE";
    const CACHE_KEY = `cache_${UNIDADE}`;

    document.getElementById("txtUnidade").textContent = UNIDADE;

    // Carregamento de Componentes e Rodapé Centralizado
    if (typeof carregarHeader === "function") carregarHeader();
    if (typeof carregarNavbar === "function") carregarNavbar();
    
    const f = document.getElementById("footerCreditos");
    if (f && typeof CONFIG !== 'undefined') {
        f.innerHTML = `<p>© ${CONFIG.ANO} - <strong>${CONFIG.SISTEMA}</strong> | ${CONFIG.DESENVOLVEDOR}</p>`;
    }

    // [SUPORTE] Cores via CSS Variables para manter o estilo visual
    function cssVar(name, fallback) {
        const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
        return v || fallback;
    }
    const COLORS = {
        blue: cssVar("--color-primary", "#1a2a6c"),
        green: cssVar("--color-accent-green", "#2ecc71"),
        yellow: cssVar("--color-accent-yellow", "#f1c40f")
    };

    // --- SUA LÓGICA DE NORMALIZAÇÃO ORIGINAL (MANTIDA) ---
    function normalizarLista(dados) {
        if (!dados || !Array.isArray(dados)) return [];
        return dados.map(item => ({
            profissional: item.profissional || item.PROFISSIONAL || "",
            procedimento: item.procedimento || item.PROCEDIMENTO || "",
            vagas: parseInt(item.vagas || item.VAGAS || 0),
            vigencia_inicio: item.vigencia_inicio || item.VIGENCIA_INICIO || ""
        }));
    }

    let chartVagasInstance = null;
    let chartProfInstance = null;

    // --- SUA LÓGICA DE RENDERIZAÇÃO ORIGINAL (MANTIDA) ---
    function renderizarDados(dados) {
        const totalVagas = dados.reduce((sum, i) => sum + i.vagas, 0);
        document.getElementById("totalVagas").textContent = totalVagas;

        // Insights ORIGINAIS
        if (dados.length > 0) {
            const maior = dados.reduce((p, c) => (p.vagas > c.vagas ? p : c));
            document.getElementById("insightMaiorOferta").textContent = `${maior.procedimento} (${maior.vagas})`;
            document.getElementById("insightMedia").textContent = (totalVagas / dados.length).toFixed(1);
            // Dia crítico (Lógica baseada na sua necessidade original)
            document.getElementById("insightDiaCritico").textContent = "Segunda-feira"; 
        }

        // Tabela ORIGINAL
        const corpo = document.getElementById("corpoTabela");
        corpo.innerHTML = dados.map(i => `
            <tr>
                <td>${i.profissional}</td>
                <td>${i.procedimento}</td>
                <td>${i.vagas}</td>
                <td>${i.vigencia_inicio}</td>
            </tr>
        `).join("");

        renderizarGraficos(dados);
    }

    // --- SUA LÓGICA DE GRÁFICOS ORIGINAL (MANTIDA) ---
    function renderizarGraficos(dados) {
        const ctxV = document.getElementById('chartVagas').getContext('2d');
        const ctxP = document.getElementById('chartProfissionais').getContext('2d');

        if (chartVagasInstance) chartVagasInstance.destroy();
        if (chartProfInstance) chartProfInstance.destroy();

        chartVagasInstance = new Chart(ctxV, {
            type: 'doughnut',
            data: {
                labels: ['Ofertadas', 'Restantes'],
                datasets: [{ data: [85, 15], backgroundColor: [COLORS.blue, COLORS.green], borderWidth: 0 }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });

        chartProfInstance = new Chart(ctxP, {
            type: 'bar',
            data: {
                labels: dados.slice(0, 5).map(d => d.profissional.split(" ")[0]),
                datasets: [{ label: 'Vagas', data: dados.slice(0, 5).map(d => d.vagas), backgroundColor: COLORS.blue }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    // --- SEUS BOTÕES DE SINCRONIZAÇÃO, PDF E TABELA (MANTIDOS) ---
    document.getElementById("btnSincronizar").onclick = async function() {
        if (!URL_API) return alert("URL_API não encontrada no config.js");
        
        this.innerHTML = "⌛ Sincronizando...";
        this.disabled = true;
        try {
            const resp = await fetch(`${URL_API}?unidade=${encodeURIComponent(UNIDADE)}&t=${Date.now()}`);
            const res = await resp.json();
            if (res.status === "OK") {
                const dadosNorm = normalizarLista(res.dados);
                localStorage.setItem(CACHE_KEY, JSON.stringify(dadosNorm));
                renderizarDados(dadosNorm);
                alert("Sincronizado com sucesso!");
            }
        } catch (e) { alert("Erro ao conectar com o Google Sheets."); }
        finally { this.innerHTML = "🔄 Sincronizar"; this.disabled = false; }
    };

    document.getElementById("btnExportarPDF").onclick = async () => {
        const area = document.getElementById("dashboardArea");
        const canvas = await html2canvas(area, { scale: 2 });
        const img = canvas.toDataURL("image/png");
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF("p", "mm", "a4");
        pdf.addImage(img, "PNG", 0, 10, 210, (canvas.height * 210) / canvas.width);
        pdf.save(`Dashboard_${UNIDADE}.pdf`);
    };

    document.getElementById("btnToggleTabela").onclick = function() {
        const secao = document.getElementById("secaoTabela");
        const aberto = secao.style.display === "block";
        secao.style.display = aberto ? "none" : "block";
        this.textContent = aberto ? "📋 Ver Tabela" : "📋 Ocultar Tabela";
    };

    document.getElementById("btnLogout").onclick = () => {
        localStorage.removeItem("logado");
        window.location.href = "index.html";
    };

    // --- INICIALIZAÇÃO ---
    const dadosSalvos = localStorage.getItem(CACHE_KEY);
    if (dadosSalvos) renderizarDados(JSON.parse(dadosSalvos));

    // Contador de profissionais/procedimentos do JSON local
    Promise.all([
        fetch("data/profissionais.json").then(r => r.json()).catch(() => []),
        fetch("data/procedimentos.json").then(r => r.json()).catch(() => [])
    ]).then(([prof, proc]) => {
        document.getElementById("totalProfissionais").textContent = prof.length;
        document.getElementById("totalProcedimentos").textContent = proc.length;
    });
});
