/**
 * Paleta de cores e estilos CSS customizados
 * Cores específicas para diferentes elementos do sistema
 */

// Exporta o tema como módulo
export const THEME = {
  // ── Cores dos gráficos ─────────────────────────────────────────────────
  chartColors: {
    // Cores para tipos de procedimento
    tipos: {
      CONSULTA: '#FFC107',   // Amarelo
      GRUPO: '#2196F3',      // Azul
      RETORNO: '#F44336',    // Vermelho
      EXAME: '#FF9800',      // Laranja
      OUTROS: '#9E9E9E'      // Cinza
    },

    // Cores para dias da semana (tons de azul)
    dias: [
      'rgba(26, 42, 108, 0.12)', // DOM
      'rgba(26, 42, 108, 0.18)', // SEG
      'rgba(26, 42, 108, 0.24)', // TER
      'rgba(26, 42, 108, 0.30)', // QUA
      'rgba(26, 42, 108, 0.36)', // QUI
      'rgba(26, 42, 108, 0.42)', // SEX
      'rgba(26, 42, 108, 0.48)'  // SAB
    ],

    // Cores para status
    status: {
      AGENDADO: '#2196F3',
      CONFIRMADO: '#4CAF50',
      CANCELADO: '#F44336',
      AGUARDANDO: '#FF9800',
      CONCLUIDO: '#9C27B0'
    }
  },

  // ── Cores dos cards ─────────────────────────────────────────────────────
  cardColors: {
    primary: {
      bg: '#2196F3',
      text: '#FFFFFF',
      border: '#1976D2'
    },
    success: {
      bg: '#4CAF50',
      text: '#FFFFFF',
      border: '#388E3C'
    },
    warning: {
      bg: '#FF9800',
      text: '#FFFFFF',
      border: '#F57C00'
    },
    danger: {
      bg: '#F44336',
      text: '#FFFFFF',
      border: '#D32F2F'
    },
    info: {
      bg: '#9C27B0',
      text: '#FFFFFF',
      border: '#7B1FA2'
    }
  },

  // ── Cores do dashboard ──────────────────────────────────────────────────
  dashboard: {
    // Cores para os cards de estatísticas
    statsCards: [
      { bg: '#2196F3', icon: '#FFFFFF', text: '#FFFFFF' },  // Total de Vagas
      { bg: '#4CAF50', icon: '#FFFFFF', text: '#FFFFFF' },  // Agendados
      { bg: '#FF9800', icon: '#FFFFFF', text: '#FFFFFF' },  // Disponíveis
      { bg: '#9C27B0', icon: '#FFFFFF', text: '#FFFFFF' }   // Cancelados
    ],

    // Cores para os gráficos
    charts: {
      donut: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderColor: 'rgba(255, 255, 255, 0.2)'
      },
      line: {
        gradientStart: 'rgba(33, 150, 243, 0.2)',
        gradientEnd: 'rgba(33, 150, 243, 0)'
      }
    }
  },

  // ── Cores da tabela ─────────────────────────────────────────────────────
  table: {
    headerBg: '#2196F3',
    headerText: '#FFFFFF',
    rowEvenBg: '#FFFFFF',
    rowOddBg: '#F5F5F5',
    rowHoverBg: '#E3F2FD',
    border: '#E0E0E0'
  },

  // ── Cores do formulário ─────────────────────────────────────────────────
  form: {
    inputBg: '#FFFFFF',
    inputBorder: '#E0E0E0',
    inputBorderFocus: '#2196F3',
    inputText: '#212121',
    label: '#757575',
    placeholder: '#9E9E9E',
    buttonPrimary: {
      bg: '#2196F3',
      text: '#FFFFFF',
      hover: '#1976D2'
    },
    buttonSecondary: {
      bg: '#FFFFFF',
      text: '#2196F3',
      border: '#2196F3',
      hover: '#E3F2FD'
    }
  },

  // ── Cores da sidebar ────────────────────────────────────────────────────
  sidebar: {
    bg: '#212121',
    text: '#FFFFFF',
    activeBg: '#2196F3',
    activeText: '#FFFFFF',
    hoverBg: '#424242',
    border: '#424242'
  },

  // ── Cores do header ─────────────────────────────────────────────────────
  header: {
    bg: '#FFFFFF',
    text: '#212121',
    border: '#E0E0E0',
    shadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
  },

  // ── Cores do footer ─────────────────────────────────────────────────────
  footer: {
    bg: '#212121',
    text: '#FFFFFF',
    border: '#424242'
  },

  // ── Cores das notificações ──────────────────────────────────────────────
  notifications: {
    success: {
      bg: '#4CAF50',
      text: '#FFFFFF',
      border: '#388E3C'
    },
    error: {
      bg: '#F44336',
      text: '#FFFFFF',
      border: '#D32F2F'
    },
    warning: {
      bg: '#FF9800',
      text: '#FFFFFF',
      border: '#F57C00'
    },
    info: {
      bg: '#2196F3',
      text: '#FFFFFF',
      border: '#1976D2'
    }
  }
};