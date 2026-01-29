/**
 * Componente Navbar - Barra de navegação lateral
 * Responsável pelo menu de navegação entre páginas
 */

import { CONFIG } from '../../config/config.js';

/**
 * Renderiza a barra de navegação lateral
 * @returns {HTMLElement} Elemento nav
 */
export function renderNavbar() {
  const navbar = document.createElement('nav');
  navbar.className = 'app-navbar';
  navbar.id = 'app-navbar';
  
  const menuItemsHTML = CONFIG.menuItems.map(item => `
    <a href="${item.path}" class="nav-item" data-path="${item.path}">
      <span class="nav-icon">${item.icon}</span>
      <span class="nav-label">${item.label}</span>
    </a>
  `).join('');

  navbar.innerHTML = `
    <div class="navbar-header">
      <button class="btn-toggle-sidebar" id="btn-toggle-sidebar">
        <svg class="icon" viewBox="0 0 24 24">
          <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
        </svg>
      </button>
    </div>

    <div class="navbar-menu">
      ${menuItemsHTML}
    </div>

    <div class="navbar-footer">
      <button class="nav-item" id="btn-logout">
        <span class="nav-icon">🚪</span>
        <span class="nav-label">Sair</span>
      </button>
    </div>
  `;

  // Event listener para toggle sidebar
  navbar.querySelector('#btn-toggle-sidebar')?.addEventListener('click', () => {
    document.body.classList.toggle('sidebar-collapsed');
    console.log('Sidebar toggle');
  });

  // Event listener para logout
  navbar.querySelector('#btn-logout')?.addEventListener('click', () => {
    if (confirm('Deseja realmente sair?')) {
      window.location.href = '/pages/login/';
    }
  });

  // Event listener para itens de menu
  navbar.querySelectorAll('.nav-item[data-path]').forEach(item => {
    item.addEventListener('click', (e) => {
      const path = item.dataset.path;
      console.log('Navegar para:', path);
      // Aqui você pode adicionar lógica de navegação SPA ou deixar o comportamento padrão
    });
  });

  return navbar;
}