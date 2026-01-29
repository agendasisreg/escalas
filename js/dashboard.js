// js/dashboard.js

document.addEventListener("DOMContentLoaded", () => {
    // 1. Verificação de Segurança e Cache
    const logado = localStorage.getItem("logado");
    const UNIDADE = localStorage.getItem("unidade_selecionada") || "Não identificada";
    const CNES = localStorage.getItem("cnes_logado");
    const URL_API = "https://script.google.com/macros/s/AKfycbzrzuSOFKgHFbLpjKOpGqzK7gAAIK3ucbDYgsTvDi1RoFcClepilJwRtF0GTFteOFjfBQ/exec";

    if (logado !== "true") {
        window.location.href = "index.html";
        return;
    }

    // Atualiza o nome da unidade no cabeçalho
    document.getElementById("txtUnidade").textContent = UNIDADE;

    // 2. Renderizar Componentes Compartilhados
    if (typeof carregarHeader === "function") carregarHeader();
    if (typeof carregarNavbar === "function") carregarNavbar();
    
    // 3. Preencher Rodapé via CONFIG
    const footer = document.getElementById("footerCreditos");
    if (footer && typeof CONFIG !== 'undefined') {
        footer.innerHTML = `© ${CONFIG.ANO} - <strong>${CONFIG.SISTEMA}</strong> | ${CONFIG.DESENVOLVEDOR}`;
    }

    // 4. Inicialização de Gráficos (Lógica Restaurada)
    const ctxVagas = document.getElementById('chartVagas').getContext('2d');
    const ctxProf = document.getElementById('chartProfissionais').getContext('2d');

    // Estilos de Cores baseados nas variáveis CSS
    const cores = {
        azul: '#1a2a6c',
        verde: '#2ecc71',
        amarelo: '#f1c40f',
        vermelho: '#b21f1f'
    };

    // Gráfico de Pizza: Distribuição de Vagas
    const chartVagas = new Chart(ctxVagas, {
        type: 'doughnut',
        data: {
            labels: ['Ocupadas', 'Disponíveis', 'Bloqueadas'],
            datasets: [{
                data: [65, 25, 10],
                backgroundColor: [cores.azul, cores.verde, cores.amarelo],
                borderWidth: 0
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    // Gráfico de Barras: Produtividade
    const chartProf = new Chart(ctxProf, {
        type: 'bar',
        data: {
            labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'],
            datasets: [{
                label: 'Vagas Ofertadas',
                data: [120, 150, 180, 90, 210],
                backgroundColor: cores.azul,
                borderRadius: 5
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    // 5. Lógica de Sincronização Real
    document.getElementById("btnSincronizar").onclick = async function() {
        this.innerHTML = "⌛ Sincronizando...";
        this.disabled = true;

        try {
            const resp = await fetch(`${URL_API}?unidade=${encodeURIComponent(UNIDADE)}&t=${Date.now()}`);
            const res = await resp.json();

            if (res.status === "OK") {
                // Aqui você pode atualizar os gráficos com dados reais do Sheets
                document.getElementById("totalVagas").textContent = res.dados.length;
                alert("Sincronização realizada com sucesso!");
            }
        } catch (e) {
            console.error("Erro na sincronização:", e);
            alert("Erro de conexão com o Google Sheets.");
        } finally {
            this.innerHTML = "🔄 Sincronizar Sheets";
            this.disabled = false;
        }
    };

    // 6. Carregar Contadores Iniciais dos JSONs Locais
    Promise.all([
        fetch("data/profissionais.json").then(r => r.json()).catch(() => []),
        fetch("data/procedimentos.json").then(r => r.json()).catch(() => [])
    ]).then(([profissionais, procedimentos]) => {
        document.getElementById("totalProfissionais").textContent = profissionais.length;
        document.getElementById("totalProcedimentos").textContent = procedimentos.length;
    });
});
