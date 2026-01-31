// ============================================================
// CONFIGURAÇÃO CENTRALIZADA - SISREG ESCALAS
// ============================================================
// Este arquivo centraliza TODAS as configurações do sistema
// Mantenha este arquivo como única fonte de verdade
// ============================================================

const SISREG_CONFIG = {
  // ==================== API ====================
  API_URL: "https://script.google.com/macros/s/AKfycbx-aj2CuhiUf9eCiLJjfMCchIK8zyIiupNj6_qWhYJyThFqahRfP5ruT0JBzjpgiAAL/exec",
  
  // ==================== SISTEMA ====================
  SISTEMA: {
    NOME: "Agenda SISREG",
    SUBTITULO: "Sistema de Gestão de Escalas",
    VERSAO: "2.0",
    ANO: "2026"
  },
  
  // ==================== CORES (sincronizadas com theme.css) ====================
  CORES: {
    PRIMARY: "#1a2a6c",      // Azul escuro principal
    SECONDARY: "#4CAF50",    // Verde
    ACCENT: "#fdbb2d",       // Amarelo/alaranjado
    DANGER: "#b21f1f",       // Vermelho
    WARNING: "#ff9800",      // Laranja
    INFO: "#2196F3",         // Azul claro
    GRAY: "#9aa0a6",         // Cinza
    LIGHT: "#f4f7f6",        // Fundo claro
    DARK: "#1f2937",         // Texto escuro
    WHITE: "#ffffff",
    BG_PRIMARY: "#ffffff",
    BG_SECONDARY: "#f9fafb",
    BG_TERTIARY: "#f3f4f6"
  },
  
  // ==================== MENSAGENS PADRÃO ====================
  MENSAGENS: {
    CARREGANDO: "⏳ Carregando...",
    SUCESSO: "✅ Sucesso!",
    ERRO: "❌ Erro!",
    ATENCAO: "⚠️ Atenção!",
    CONFIRMAR_EXPORTACAO: "Isso irá baixar o arquivo CSV e enviar os dados para o Sheets. Confirmar?",
    CONFIRMAR_LIMPEZA: "Deseja realmente limpar todos os dados locais?",
    NENHUM_DADO: "Nenhum dado encontrado.",
    SINCRONIZADO: "✅ Sincronizado com sucesso!",
    ERRO_CONEXAO: "❌ Erro de conexão com o servidor.",
    ERRO_SHEETS: "⚠️ Sheets respondeu, mas sem dados para esta unidade.",
    EXPORTADO_SUCESSO: "✅ CSV baixado e todos os dados enviados ao Sheets!",
    EXPORTADO_ERRO: "⚠️ CSV baixado, mas houve erro no envio de {erros} itens para o Sheets. Verifique sua conexão.",
    TABELA_VAZIA: "Nenhuma escala lançada localmente.",
    LOGIN_SUCESSO: "✅ Login realizado com sucesso!",
    LOGIN_ERRO: "❌ Senha incorreta para esta unidade.",
    SELECIONE_UNIDADE: "❌ Selecione uma unidade válida.",
    DADOS_SALVOS: "✅ Dados salvos com sucesso!",
    ITEM_EXCLUIDO: "✅ Item excluído com sucesso!"
  },
  
  // ==================== CABEÇALHOS CSV ====================
  CSV_HEADERS: [
    "CPF", "Profissional", "Cod_Procedimento", "Procedimento", 
    "Exames", "Dias", "Inicio", "Fim", "Vagas", 
    "Vig_Inicio", "Vig_Fim", "Unidade"
  ],
  
  // ==================== DIAS DA SEMANA ====================
  DIAS_SEMANA: ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SAB"],
  DIAS_SEMANA_COMPLETO: ["DOMINGO", "SEGUNDA", "TERÇA", "QUARTA", "QUINTA", "SEXTA", "SÁBADO"],
  
  // ==================== TIPOS DE PROCEDIMENTO ====================
  TIPOS_PROCEDIMENTO: {
    RETORNO: "RETORNO",
    GRUPO: "GRUPO",
    EXAME: "EXAME",
    CONSULTA: "CONSULTA",
    OUTROS: "OUTROS"
  },
  
  // ==================== ARQUIVOS DE DADOS ====================
  ARQUIVOS: {
    CONFIG: "data/config.json",
    UNIDADES: "data/unidades.json",
    PROFISSIONAIS: "data/profissionais.json",
    PROCEDIMENTOS: "data/procedimentos_exames.json",
    UNIDADES_CSV: "data/unidades.csv",
    PROFISSIONAIS_CSV: "data/profissionais.csv",
    PROCEDIMENTOS_CSV: "data/procedimentos_exames.csv"
  },
  
  // ==================== LOCAL STORAGE ====================
  CACHE_PREFIX: "cache_",
  ESCALAS_SALVAS_KEY: "escalas_salvas",
  UNIDADE_SELECIONADA_KEY: "unidade_selecionada",
  CNES_SELECIONADO_KEY: "cnes_selecionado",
  
  // ==================== PÁGINAS ====================
  PAGINAS: {
    INDEX: "index.html",
    DASHBOARD: "dashboard.html",
    ESCALAS: "escalas.html"
  },
  
  // ==================== BOTÕES ====================
  BOTOES: {
    CLASSES: {
      PRIMARY: "btn-main btn-sync",
      SUCCESS: "btn-main btn-new",
      DANGER: "btn-main btn-logout",
      WARNING: "btn-main btn-warning",
      INFO: "btn-main btn-info",
      BACK: "btn-main btn-back"
    },
    TEXTOS: {
      SINCRONIZAR: "🔄 Sincronizar Sheets",
      SINCRONIZANDO: "⌛ Sincronizando...",
      EXPORTAR_PDF: "📄 Exportar PDF",
      NOVA_ESCALA: "➕ Nova Escala",
      SAIR: "Sair",
      VOLTAR: "⬅ Voltar",
      EXPORTAR_CSV: "Exportar CSV e Finalizar Escalas",
      ENVIANDO: "Enviando para Nuvem...",
      LIMPAR: "🗑️ Limpar Tudo",
      CONFIRMAR: "✓ Confirmar"
    }
  }
};

// ============================================================
// CLASSE DE UTILITÁRIOS - Funções compartilhadas em todo o sistema
// ============================================================

class SisregUtils {
  
  // ==================== CONFIGURAÇÃO ====================
  
  /**
   * Obtém a unidade atual do localStorage
   * @returns {string} Nome da unidade selecionada
   */
  static getUnidade() {
    return localStorage.getItem(SISREG_CONFIG.UNIDADE_SELECIONADA_KEY) || "AGENDA TESTE";
  }
  
  /**
   * Obtém o CNES atual do localStorage
   * @returns {string} Código CNES selecionado
   */
  static getCnes() {
    return localStorage.getItem(SISREG_CONFIG.CNES_SELECIONADO_KEY) || "";
  }
  
  /**
   * Define a unidade selecionada
   * @param {string} unidade - Nome da unidade
   * @param {string} cnes - Código CNES (opcional)
   */
  static setUnidade(unidade, cnes = "") {
    localStorage.setItem(SISREG_CONFIG.UNIDADE_SELECIONADA_KEY, unidade);
    if (cnes) {
      localStorage.setItem(SISREG_CONFIG.CNES_SELECIONADO_KEY, cnes);
    }
  }
  
  /**
   * Obtém a chave de cache para a unidade atual
   * @param {string|null} unidade - Unidade específica (opcional)
   * @returns {string} Chave de cache
   */
  static getCacheKey(unidade = null) {
    const uni = unidade || this.getUnidade();
    return `${SISREG_CONFIG.CACHE_PREFIX}${uni}`;
  }
  
  // ==================== CARREGAMENTO DE DADOS ====================
  
  /**
   * Carrega configurações do arquivo JSON
   * @returns {Promise<Object|null>} Configurações ou null em caso de erro
   */
  static async carregarConfigJson() {
    try {
      const response = await fetch(SISREG_CONFIG.ARQUIVOS.CONFIG);
      if (!response.ok) throw new Error('Erro ao carregar config.json');
      return await response.json();
    } catch (error) {
      console.error("Erro ao carregar config.json:", error);
      return null;
    }
  }
  
  /**
   * Carrega dados JSON de um arquivo
   * @param {string} arquivo - Caminho do arquivo JSON
   * @returns {Promise<Array|null>} Dados ou null em caso de erro
   */
  static async carregarDadosJson(arquivo) {
    try {
      const response = await fetch(arquivo);
      if (!response.ok) throw new Error(`Erro ao carregar ${arquivo}`);
      return await response.json();
    } catch (error) {
      console.error(`Erro ao carregar ${arquivo}:`, error);
      return null;
    }
  }
  
  // ==================== CRÉDITOS ====================
  
  /**
   * Preenche os créditos no footer
   * @param {string} footerId - ID do elemento footer
   */
  static async preencherCreditos(footerId = "footerCreditos") {
    const footer = document.getElementById(footerId);
    if (!footer) return;
    
    try {
      const config = await this.carregarConfigJson();
      if (config) {
        footer.innerHTML = `© ${config.ano || SISREG_CONFIG.SISTEMA.ANO} - <strong>${config.sistema || SISREG_CONFIG.SISTEMA.NOME}</strong> | ${config.desenvolvedor || 'Desenvolvido por Euripedes Javeras'}`;
      } else {
        footer.innerHTML = `© ${SISREG_CONFIG.SISTEMA.ANO} - <strong>${SISREG_CONFIG.SISTEMA.NOME}</strong>`;
      }
    } catch (error) {
      console.error("Erro ao preencher créditos:", error);
      footer.innerHTML = `© ${SISREG_CONFIG.SISTEMA.ANO} - ${SISREG_CONFIG.SISTEMA.NOME}`;
    }
  }
  
  // ==================== NORMALIZAÇÃO DE DADOS ====================
  
  /**
   * Normaliza um item de dados (para consistência)
   * @param {Object} item - Item de dados
   * @returns {Object} Item normalizado
   */
  static normalizarItem(item) {
    if (!item || typeof item !== 'object') return {};
    
    // Cria cópia com chaves em minúsculo
    const d = {};
    for (let k in item) {
      d[String(k).toLowerCase().trim()] = item[k];
    }
    
    return {
      cpf: d.cpf ?? d["cpf do profissional"] ?? d["cpf_profissional"] ?? "",
      profissional: d.profissional ?? d["nome do profissional"] ?? d["nome_profissional"] ?? "",
      cod_procedimento: d.cod_procedimento ?? d["cod. procedimento"] ?? d["cod procedimento"] ?? "",
      procedimento: d.procedimento ?? d["descricao do procedimento"] ?? d["descrição do procedimento"] ?? "",
      exames: d.exames ?? "",
      dias_semana: d.dias_semana ?? d["dias"] ?? d["dias da semana"] ?? "",
      hora_inicio: d.hora_inicio ?? d["hora entrada"] ?? d["hora de entrada"] ?? "",
      hora_fim: d.hora_fim ?? d["hora saida"] ?? d["hora de saída"] ?? "",
      vagas: Number(d.vagas) || 0,
      vigencia_inicio: d.vigencia_inicio ?? d["vigência inicial"] ?? d["vigencia inicial"] ?? "",
      vigencia_fim: d.vigencia_fim ?? d["vigência final"] ?? d["vigencia final"] ?? "",
      unidade: d.unidade ?? this.getUnidade()
    };
  }
  
  /**
   * Normaliza uma lista de dados
   * @param {Array} lista - Lista de itens
   * @returns {Array} Lista normalizada
   */
  static normalizarLista(lista) {
    if (!Array.isArray(lista)) return [];
    return lista.map(item => this.normalizarItem(item));
  }
  
  // ==================== FORMATAÇÃO ====================
  
  /**
   * Formata hora (remove parte da data se existir)
   * @param {string} valor - Valor da hora
   * @returns {string} Hora formatada HH:mm
   */
  static formatarHora(valor) {
    if (!valor) return '';
    if (typeof valor === "string" && valor.includes('T')) {
      return valor.split('T')[1].substring(0, 5);
    }
    return valor;
  }
  
  /**
   * Formata data para padrão brasileiro
   * @param {string} valor - Valor da data
   * @returns {string} Data formatada DD/MM/YYYY
   */
  static formatarDataBR(valor) {
    if (!valor || typeof valor !== "string") return valor;
    if (valor.includes('T')) {
      const dataPura = valor.split('T')[0];
      return dataPura.split('-').reverse().join('/');
    }
    return valor;
  }
  
  /**
   * Extrai dias da semana de uma string
   * @param {string} diasTxt - Texto com dias da semana
   * @returns {Array} Array de dias válidos
   */
  static extrairDias(diasTxt) {
    const s = String(diasTxt || "").toUpperCase();
    const tokens = s.split(/[\s,;\/]+/).filter(Boolean);
    const valid = SISREG_CONFIG.DIAS_SEMANA;
    return tokens.filter(t => valid.includes(t));
  }
  
  /**
   * Classifica tipo de procedimento
   * @param {string} txt - Texto do procedimento
   * @returns {string} Tipo de procedimento
   */
  static tipoProcedimento(txt) {
    const t = String(txt || "").toUpperCase();
    if (t.includes("RETORNO")) return SISREG_CONFIG.TIPOS_PROCEDIMENTO.RETORNO;
    if (t.startsWith("GRUPO") || t.includes("GRUPO")) return SISREG_CONFIG.TIPOS_PROCEDIMENTO.GRUPO;
    if (t.includes("EXAME")) return SISREG_CONFIG.TIPOS_PROCEDIMENTO.EXAME;
    if (t.includes("CONSULTA")) return SISREG_CONFIG.TIPOS_PROCEDIMENTO.CONSULTA;
    return SISREG_CONFIG.TIPOS_PROCEDIMENTO.OUTROS;
  }
  
  // ==================== VALIDAÇÃO ====================
  
  /**
   * Valida CPF (apenas formato, não dígito verificador)
   * @param {string} cpf - CPF a ser validado
   * @returns {boolean} CPF válido
   */
  static validarCPF(cpf) {
    if (!cpf) return false;
    const cleaned = cpf.replace(/\D/g, '');
    return cleaned.length === 11;
  }
  
  /**
   * Limpa texto (remove aspas e espaços extras)
   * @param {string} txt - Texto a ser limpo
   * @returns {string} Texto limpo
   */
  static limparTexto(txt) {
    return txt ? txt.replace(/"/g, "").trim() : "";
  }
  
  // ==================== ARMAZENAMENTO ====================
  
  /**
   * Salva dados no localStorage
   * @param {string} key - Chave de armazenamento
   * @param {any} data - Dados a serem salvos
   */
  static salvarLocalStorage(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error("Erro ao salvar no localStorage:", error);
      return false;
    }
  }
  
  /**
   * Carrega dados do localStorage
   * @param {string} key - Chave de armazenamento
   * @param {any} defaultValue - Valor padrão se não existir
   * @returns {any} Dados carregados
   */
  static carregarLocalStorage(key, defaultValue = []) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch (error) {
      console.error("Erro ao carregar do localStorage:", error);
      return defaultValue;
    }
  }
  
  /**
   * Limpa dados do localStorage
   * @param {string} key - Chave de armazenamento
   */
  static limparLocalStorage(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error("Erro ao limpar localStorage:", error);
      return false;
    }
  }
  
  // ==================== EXPORTAÇÃO ====================
  
  /**
   * Gera CSV a partir de dados
   * @param {Array} dados - Dados a serem exportados
   * @param {Array} headers - Cabeçalhos do CSV
   * @returns {string} Conteúdo CSV
   */
  static gerarCSV(dados, headers = SISREG_CONFIG.CSV_HEADERS) {
    if (!Array.isArray(dados) || dados.length === 0) return "";
    
    const rows = dados.map(item => [
      item.cpf || '',
      item.profissional || '',
      item.cod_procedimento || '',
      item.procedimento || '',
      item.exames || '',
      item.dias_semana || '',
      item.hora_inicio || '',
      item.hora_fim || '',
      item.vagas || 0,
      item.vigencia_inicio || '',
      item.vigencia_fim || '',
      item.unidade || this.getUnidade()
    ]);
    
    let csvContent = "data:text/csv;charset=utf-8," +
      headers.join(",") + "\n" +
      rows.map(row => row.join(",")).join("\n");
    
    return encodeURI(csvContent);
  }
  
  /**
   * Baixa arquivo CSV
   * @param {string} csvContent - Conteúdo CSV
   * @param {string} filename - Nome do arquivo
   */
  static baixarCSV(csvContent, filename = null) {
    if (!filename) {
      const unidade = this.getUnidade().replace(/\s+/g, '_');
      const data = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
      filename = `Escalas_${unidade}_${data}.csv`;
    }
    
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  
  // ==================== INTERFACE ====================
  
  /**
   * Mostra mensagem de toast (notificação temporária)
   * @param {string} mensagem - Mensagem a ser exibida
   * @param {string} tipo - Tipo da mensagem (success, error, warning, info)
   */
  static showToast(mensagem, tipo = "info") {
    // Remove toast anterior se existir
    const oldToast = document.getElementById("sisreg-toast");
    if (oldToast) oldToast.remove();
    
    // Cria novo toast
    const toast = document.createElement("div");
    toast.id = "sisreg-toast";
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${this.getCorToast(tipo)};
      color: white;
      padding: 16px 24px;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.2);
      z-index: 9999;
      animation: slideIn 0.3s ease, fadeOut 0.5s ease 2.5s forwards;
      font-weight: 600;
      font-family: 'Inter', sans-serif;
    `;
    
    toast.innerHTML = `
      <style>
        @keyframes slideIn {
          from { transform: translateX(400px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; transform: translateX(400px); }
        }
      </style>
      ${mensagem}
    `;
    
    document.body.appendChild(toast);
    
    // Remove após 3 segundos
    setTimeout(() => {
      toast.style.animation = "fadeOut 0.5s ease forwards";
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 500);
    }, 3000);
  }
  
  /**
   * Obtém cor do toast baseado no tipo
   * @param {string} tipo - Tipo da mensagem
   * @returns {string} Cor em hexadecimal
   */
  static getCorToast(tipo) {
    const cores = {
      success: SISREG_CONFIG.CORES.SECONDARY,
      error: SISREG_CONFIG.CORES.DANGER,
      warning: SISREG_CONFIG.CORES.WARNING,
      info: SISREG_CONFIG.CORES.PRIMARY
    };
    return cores[tipo] || SISREG_CONFIG.CORES.PRIMARY;
  }
  
  /**
   * Mostra loading em botão
   * @param {HTMLElement} btn - Botão a ser alterado
   * @param {string} texto - Texto durante loading
   */
  static showLoading(btn, texto = "Processando...") {
    if (!btn) return;
    
    btn._originalHTML = btn.innerHTML;
    btn._originalDisabled = btn.disabled;
    
    btn.innerHTML = `
      <span style="display:inline-flex;align-items:center;gap:8px;">
        <svg width="16" height="16" viewBox="0 0 24 24" style="animation: spin 1s linear infinite;">
          <circle cx="12" cy="12" r="10" stroke="white" stroke-width="2" fill="none" stroke-dasharray="15,85">
            <animate attributeName="stroke-dashoffset" values="0;100" dur="1.5s" repeatCount="indefinite"/>
          </circle>
        </svg>
        ${texto}
      </span>
      <style>
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      </style>
    `;
    btn.disabled = true;
  }
  
  /**
   * Esconde loading em botão
   * @param {HTMLElement} btn - Botão a ser restaurado
   */
  static hideLoading(btn) {
    if (!btn) return;
    
    if (btn._originalHTML) {
      btn.innerHTML = btn._originalHTML;
      delete btn._originalHTML;
    }
    
    if (typeof btn._originalDisabled !== 'undefined') {
      btn.disabled = btn._originalDisabled;
      delete btn._originalDisabled;
    }
  }
  
  // ==================== UTILITÁRIOS ====================
  
  /**
   * Obtém variável CSS
   * @param {string} name - Nome da variável
   * @param {string} fallback - Valor padrão
   * @returns {string} Valor da variável CSS
   */
  static cssVar(name, fallback = "") {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }
  
  /**
   * Formata número como moeda brasileira
   * @param {number} valor - Valor a ser formatado
   * @returns {string} Valor formatado
   */
  static formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  }
  
  /**
   * Formata número com separador de milhar
   * @param {number} valor - Valor a ser formatado
   * @returns {string} Valor formatado
   */
  static formatarNumero(valor) {
    return new Intl.NumberFormat('pt-BR').format(valor);
  }

  
  /**
   * Calcula o total de vagas considerando dias da semana e período de vigência
   * @param {number} vagasPorDia - Número de vagas por dia
   * @param {string} diasSemana - Dias da semana (ex: "SEG SEX")
   * @param {string} vigenciaInicio - Data de início da vigência (DD/MM/YYYY ou YYYY-MM-DD)
   * @param {string} vigenciaFim - Data de fim da vigência (DD/MM/YYYY ou YYYY-MM-DD)
   * @returns {number} Total de vagas no período
   */
  static calcularTotalVagas(vagasPorDia, diasSemana, vigenciaInicio, vigenciaFim) {
    // Se não tiver dias ou datas, retorna 0
    if (!diasSemana || !vigenciaInicio || !vigenciaFim) {
      return 0;
    }
    
    // Converte datas para objeto Date
    const dataInicio = this.parseData(vigenciaInicio);
    const dataFim = this.parseData(vigenciaFim);
    
    if (!dataInicio || !dataFim || dataInicio > dataFim) {
      return 0;
    }
    
    // Extrai dias da semana
    const diasSelecionados = this.extrairDias(diasSemana);
    
    if (diasSelecionados.length === 0) {
      return 0;
    }
    
    // Mapeia dias para números (0 = DOM, 1 = SEG, ..., 6 = SAB)
    const mapaDias = {
      "DOM": 0,
      "SEG": 1,
      "TER": 2,
      "QUA": 3,
      "QUI": 4,
      "SEX": 5,
      "SAB": 6
    };
    
    // Converte dias selecionados para números
    const diasNumericos = diasSelecionados.map(dia => mapaDias[dia]);
    
    // Conta ocorrências de cada dia no período
    let totalOcorrencias = 0;
    let dataAtual = new Date(dataInicio);
    
    while (dataAtual <= dataFim) {
      const diaSemana = dataAtual.getDay();
      if (diasNumericos.includes(diaSemana)) {
        totalOcorrencias++;
      }
      // Avança um dia
      dataAtual.setDate(dataAtual.getDate() + 1);
    }
    
    // Calcula total de vagas
    return vagasPorDia * totalOcorrencias;
  }
  
  /**
   * Converte string de data para objeto Date
   * @param {string} dataStr - Data em formato DD/MM/YYYY ou YYYY-MM-DD
   * @returns {Date|null} Objeto Date ou null se inválido
   */
  static parseData(dataStr) {
    if (!dataStr) return null;
    
    // Se já for Date, retorna
    if (dataStr instanceof Date) return dataStr;
    
    // Tenta formatos diferentes
    if (typeof dataStr === 'string') {
      // Formato DD/MM/YYYY
      if (dataStr.includes('/')) {
        const partes = dataStr.split('/');
        if (partes.length === 3) {
          const dia = parseInt(partes[0]);
          const mes = parseInt(partes[1]) - 1; // JS months are 0-based
          const ano = parseInt(partes[2]);
          return new Date(ano, mes, dia);
        }
      }
      // Formato YYYY-MM-DD ou ISO
      else {
        return new Date(dataStr);
      }
    }
    
    return null;
  }
  
  // ==================== FIM DA CLASSE ====================
}

}
