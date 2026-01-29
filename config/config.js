/**
 * Configurações globais do sistema SISREG
 * Todas as configurações aqui afetam todas as páginas
 */

// Exporta as configurações como módulo
export const CONFIG = {
  // ── Cores do sistema ──────────────────────────────────────────────────
  colors: {
    primary: '#2196F3',      // Azul principal
    secondary: '#FFC107',    // Amarelo
    success: '#4CAF50',      // Verde
    danger: '#F44336',       // Vermelho
    warning: '#FF9800',      // Laranja
    info: '#9C27B0',         // Roxo
    light: '#F5F5F5',        // Cinza claro
    dark: '#212121',         // Preto
    gray: '#9E9E9E'          // Cinza
  },

  // ── Menu principal ─────────────────────────────────────────────────────
  menuItems: [
    { label: 'Dashboard', path: '/pages/dashboard/', icon: '📊' },
    { label: 'Escalas', path: '/pages/escalas/', icon: '📅' },
    { label: 'Relatórios', path: '/pages/relatorios/', icon: '📈' },
    { label: 'Configurações', path: '/pages/config/', icon: '⚙️' }
  ],

  // ── Créditos de desenvolvimento ───────────────────────────────────────
  credits: '© 2026 - Agenda SISREG Amazonas | Desenvolvido por VerasEurípedes/Empresa',

  // ── Informações do sistema ─────────────────────────────────────────────
  appName: 'Escala de Agendas - SISREG',
  appVersion: '1.0.0',
  logoUrl: '/assets/logo-sisreg.png',
  favicon: '/assets/favicon.ico',

  // ── Configurações de layout ────────────────────────────────────────────
  defaultTheme: 'light',
  sidebarCollapsed: false,
  showNotifications: true,

  // ── URLs e endpoints ───────────────────────────────────────────────────
  apiBaseUrl: '/api',
  dataPath: '/data',

  // ── Mensagens padrão ───────────────────────────────────────────────────
  messages: {
    loading: 'Carregando...',
    error: 'Ocorreu um erro. Tente novamente.',
    noData: 'Nenhum dado encontrado.',
    success: 'Operação realizada com sucesso!'
  },

  // ── Formatos de data ───────────────────────────────────────────────────
  dateFormat: 'DD/MM/YYYY',
  dateTimeFormat: 'DD/MM/YYYY HH:mm'
};