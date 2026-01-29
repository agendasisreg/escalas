// shared/components/navbar.js
function carregarNavbar() {
    const navbarHTML = `
        <nav class="main-nav">
            <ul>
                <li><a href="dashboard.html">📊 Dashboard</a></li>
                <li><a href="escalas.html">📅 Escalas</a></li>
                <li><a href="index.html" style="color:var(--am-red)">🚪 Sair</a></li>
            </ul>
        </nav>
    `;

    const placeholder = document.getElementById('navbar-placeholder');
    if (placeholder) placeholder.innerHTML = navbarHTML;
}
