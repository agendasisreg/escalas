/**
 * Componente Header - Cabeçalho do sistema
 * Responsável pelo topo da página com logo, título e ações do usuário
 */

import { CONFIG } from '../../config/config.js';

/**
 * Renderiza o cabeçalho do sistema
 * @returns {HTMLElement} Elemento header
 */
export function renderHeader() {
  const header = document.createElement('header');
  header.className = 'app-header';
  header.innerHTML = `
    <div class="header-container">
      <!-- Logo e título -->
      <div class="header-brand">
        <img src="${CONFIG.logoUrl}" alt="${CONFIG.appName}" class="logo">
        <h1 class="app-title">${CONFIG.appName}</h1>
        <span class="app-version">v${CONFIG.appVersion}</span>
      </div>

      <!-- Ações do usuário -->
      <div class="header-actions">
        <!-- Botão de busca -->
        <button class="btn-icon" id="btn-search" title="Buscar">
          <svg class="icon" viewBox="0 0 24 24">
            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
        </button>

        <!-- Botão de notificações -->
        <button class="btn-icon" id="btn-notifications" title="Notificações">
          <svg class="icon" viewBox="0 0 24 24">
            <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4h-2v.68C8.63 5.36 7 7.92 7 11v5l-2 2v1h16v-1l-2-2z"/>
          </svg>
          <span class="badge">3</span>
        </button>

        <!-- Perfil do usuário -->
        <div class="user-profile">
          <div class="user-avatar">
            <span class="avatar-initials">MS</span>
          </div>
          <div class="user-info">
            <span class="user-name">Massolutions</span>
            <span class="user-role">Administrador</span>
          </div>
          <button class="btn-icon" id="btn-user-menu">
            <svg class="icon" viewBox="0 0 24 24">
              <path d="M7 10l5 5 5-5z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `;

  // Event listeners
  header.querySelector('#btn-search')?.addEventListener('click', () => {
    console.log('Buscar...');
  });

  header.querySelector('#btn-notifications')?.addEventListener('click', () => {
    console.log('Notificações...');
  });

  return header;
}