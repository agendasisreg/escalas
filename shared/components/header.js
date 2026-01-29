// shared/components/header.js
function carregarHeader() {
    const unidade = localStorage.getItem("unidade_selecionada") || "SELECIONE UMA UNIDADE";
    
    const headerHTML = `
        <header class="app-header">
            <div class="unit-info">
                <h1 id="txtUnidade">${unidade}</h1>
                <p style="margin:0; font-size:0.8rem; opacity:0.8;">
                    ${CONFIG.SISTEMA} - <span style="color:var(--am-green)">AMAZONAS</span>
                </p>
            </div>
            <div class="user-profile">
                <span style="font-size: 0.8rem;">Versão ${CONFIG.VERSAO}</span>
            </div>
        </header>
    `;

    const placeholder = document.getElementById('header-placeholder');
    if (placeholder) placeholder.innerHTML = headerHTML;
}
