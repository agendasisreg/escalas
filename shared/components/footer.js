/**
 * Componente Footer - Rodapé do sistema
 * Responsável pelo rodapé com créditos e informações
 */

import { CONFIG } from '../../config/config.js';

/**
 * Renderiza o rodapé do sistema
 * @returns {HTMLElement} Elemento footer
 */
export function renderFooter() {
  const footer = document.createElement('footer');
  footer.className = 'app-footer';
  footer.innerHTML = `
    <div class="footer-container">
      <!-- Créditos de desenvolvimento -->
      <div class="footer-credits">
        <p>${CONFIG.credits}</p>
      </div>

      <!-- Links úteis -->
      <div class="footer-links">
        <a href="#" class="footer-link">Termos de Uso</a>
        <a href="#" class="footer-link">Política de Privacidade</a>
        <a href="#" class="footer-link">Suporte</a>
      </div>

      <!-- Informações técnicas -->
      <div class="footer-info">
        <span class="footer-item">
          <svg class="icon-sm" viewBox="0 0 24 24">
            <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95c-.32-1.25-.78-2.45-1.38-3.56 1.84.63 3.37 1.91 4.33 3.56zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2 0 .68.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56-1.84-.63-3.37-1.9-4.33-3.56zm2.95-8H5.08c.96-1.66 2.49-2.93 4.33-3.56C8.81 5.55 8.35 6.75 8.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2 0-.68.07-1.35.16-2h4.68c.09.65.16 1.32.16 2 0 .68-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95c-.96 1.65-2.49 2.93-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2 0-.68-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z"/>
          </svg>
          ${new Date().getFullYear()}
        </span>
        <span class="footer-item">
          <svg class="icon-sm" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.48 2.1-1.48 1.38 0 1.92.66 1.97 1.64h1.79c-.05-1.34-.87-2.57-2.49-2.97V5h-1.4v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.3c.1 1.71 1.36 2.66 2.86 2.97V20h1.4v-1.67c1.52-.29 2.72-1.16 2.73-2.77-.01-2.2-1.9-2.96-3.69-3.42z"/>
          </svg>
          SISREG
        </span>
      </div>
    </div>
  `;

  return footer;
}