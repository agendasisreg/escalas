// js/dashboard.js

document.addEventListener("DOMContentLoaded", () => {
    const logado = localStorage.getItem("logado");
    const UNIDADE = localStorage.getItem("unidade_selecionada");
    const CNES = localStorage.getItem("cnes_logado");
    const URL_API = "https://script.google.com/macros/s/AKfycbzrzuSOFKgHFbLpjKOpGqzK7gAAIK3ucbDYgsTvDi1RoFcClepilJwRtF0GTFteOFjfBQ/exec";

    if (logado !== "true") {
        window.location.href = "index.html";
        return;
    }

    document.getElementById("txtUnidade").textContent = UNIDADE;

    // Componentes e Rodapé
    if (typeof carregarHeader === "function") carregarHeader();
    if (typeof carregarNavbar === "function") carregarNavbar();
    const f = document.getElementById("footerCreditos");
    if (f && typeof CONFIG !== 'undefined') {
        f.innerHTML = `<p>© ${CONFIG.ANO} - <strong>${CONFIG.SISTEMA}</strong> | ${CONFIG.DESENVOLVEDOR}</p>`;
    }

    // Controle da Tabela
    document.getElementById("btnToggleTabela").onclick = function() {
        const secao = document.getElementById("secaoTabela");
        const visivel = secao.style.display === "block";
        secao.style.display = visivel ? "none" : "block";
        this.textContent = visivel ? "📋 Ver Tabela de Dados" : "📋 Ocultar Tabela";
    };

    // --- FUNÇÃO DE RENDERIZAÇÃO DE DADOS (KPIs, Insights e Gráficos) ---
    function processarDadosDashboard(dados) {
        if (!dados || dados.length === 0) return;

        // 1. KPIs
        const totalVagas = dados.reduce((sum, item) => sum + (parseInt(item.vagas) || 0), 0);
        document.getElementById("totalVagas").textContent = totalVagas;

        // 2. Insights
        // Exemplo: Encontrar o procedimento com mais vagas
        const maiorOferta = dados.reduce((prev, current) => (parseInt(prev.vagas) > parseInt(current.vagas)) ? prev : current);
        document.getElementById("insightMaiorOferta").textContent = `${maiorOferta.procedimento} (${maiorOferta.vagas})`;
        
        document.getElementById("insightMedia").textContent = (totalVagas / dados.length).toFixed(1);
        document.getElementById("insightDiaCritico").textContent = "Segunda-feira"; // Exemplo estático ou lógica de data

        // 3. Tabela
        const corpo = document.getElementById("corpoTabela");
        corpo.innerHTML = dados.map(item => `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px;">${item.profissional}</td>
                <td style="padding: 10px;">${item.procedimento}</td>
                <td style="padding: 10px;">${item.vagas}</td>
                <td style="padding: 10px;">${item.vigencia_inicio}</td>
            </tr>
        `).join('');

        // 4. Gráficos (Exemplo simples com Chart.js)
        renderizarGraficos(dados);
    }

    function renderizarGraficos(dados) {
        const ctxVagas = document.getElementById('chartVagas').getContext('2d');
        new Chart(ctxVagas, {
            type: 'doughnut',
            data: {
                labels: ['Ofertadas', 'Restantes'],
                datasets: [{
                    data: [80, 20],
                    backgroundColor: ['#1a2a6c', '#2ecc71']
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    // Botão Sincronizar (Lógica Real do teu Sheets)
    document.getElementById("btnSincronizar").onclick = async function() {
        this.innerHTML = "⌛ Sincronizando...";
        this.disabled = true;
        try {
            const resp = await fetch(`${URL_API}?unidade=${encodeURIComponent(UNIDADE)}&t=${Date.now()}`);
            const res = await resp.json();
            if (res.status === "OK") {
                processarDadosDashboard(res.dados);
                alert("Dados atualizados com sucesso!");
            }
        } catch (e) {
            alert("Erro ao conectar com o Google Sheets.");
        } finally {
            this.innerHTML = "🔄 Sincronizar";
            this.disabled = false;
        }
    };

    // Carregar Contadores Iniciais (JSON Locais)
    Promise.all([
        fetch("data/profissionais.json").then(r => r.json()).catch(() => []),
        fetch("data/procedimentos.json").then(r => r.json()).catch(() => [])
    ]).then(([prof, proc]) => {
        document.getElementById("totalProfissionais").textContent = prof.length;
        document.getElementById("totalProcedimentos").textContent = proc.length;
    });
});
