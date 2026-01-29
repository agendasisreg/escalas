// ============================================================
// CONFIGURAÇÃO CENTRALIZADA - SISREG ESCALAS
// ============================================================
const SISREG_CONFIG = {
  // API
  API_URL: "https://script.google.com/macros/s/AKfycbx-aj2CuhiUf9eCiLJjfMCchIK8zyIiupNj6_qWhYJyThFqahRfP5ruT0JBzjpgiAAL/exec",
  
  // Cache
  CACHE_PREFIX: "cache_",
  
  // Cores (sincronizadas com theme.css)
  COLORS: {
    primary: "#1a2a6c",    // Azul escuro principal
    secondary: "#4CAF50",  // Verde
    accent: "#fdbb2d",     // Amarelo/alaranjado
    danger: "#b21f1f",     // Vermelho
    gray: "#9aa0a6",       // Cinza
    light: "#f4f7f6",      // Fundo claro
    dark: "#1f2937"        // Texto escuro
  },
  
  // Mensagens padrão
  MESSAGES: {
    loading: "Carregando...",
    success: "Sucesso!",
    error: "Erro!",
    confirmExport: "Isso irá baixar o arquivo CSV e enviar os dados para o Sheets. Confirmar?",
    noData: "Nenhum dado encontrado.",
    syncSuccess: "Sincronizado!",
    syncError: "Erro de conexão.",
    emptyTable: "Nenhuma escala lançada localmente."
  },
  
  // CSV Headers
  CSV_HEADERS: [
    "CPF", "Profissional", "Cod_Procedimento", "Procedimento", 
    "Exames", "Dias", "Inicio", "Fim", "Vagas", 
    "Vig_Inicio", "Vig_Fim", "Unidade"
  ],
  
  // Dias da semana
  DIAS_SEMANA: ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SAB"],
  
  // Tipos de procedimento
  TIPOS_PROCEDIMENTO: {
    RETORNO: "RETORNO",
    GRUPO: "GRUPO",
    EXAME: "EXAME",
    CONSULTA: "CONSULTA",
    OUTROS: "OUTROS"
  }
};

// ============================================================
// FUNÇÕES AUXILIARES DE CONFIGURAÇÃO
// ============================================================
class SisregUtils {
  // Obter unidade atual do localStorage
  static getUnidade() {
    return localStorage.getItem("unidade_selecionada") || "AGENDA TESTE";
  }
  
  // Obter chave de cache para unidade
  static getCacheKey(unidade = null) {
    const uni = unidade || this.getUnidade();
    return `${SISREG_CONFIG.CACHE_PREFIX}${uni}`;
  }
  
  // Carregar configurações do arquivo JSON
  static async carregarConfigJson() {
    try {
      const response = await fetch("data/config.json");
      return await response.json();
    } catch (error) {
      console.error("Erro ao carregar config.json:", error);
      return null;
    }
  }
  
  // Preencher créditos no footer
  static async preencherCreditos(footerId = "footerCreditos") {
    const footer = document.getElementById(footerId);
    if (!footer) return;
    
    try {
      const config = await this.carregarConfigJson();
      if (config) {
        footer.innerHTML = `© ${config.ano} - <strong>${config.sistema}</strong> | ${config.desenvolvedor}`;
      }
    } catch (error) {
      console.error("Erro ao preencher créditos:", error);
    }
  }
  
  // Normalizar item de dados (para consistência)
  static normalizarItem(item) {
    const d = {};
    for (let k in item) d[String(k).toLowerCase().trim()] = item[k];
    
    return {
      cpf: d.cpf ?? d["cpf do profissional"] ?? d["cpf_profissional"] ?? "",
      profissional: d.profissional ?? d["nome do profissional"] ?? d["nome_profissional"] ?? "",
      cod_procedimento: d.cod_procedimento ?? d["cod. procedimento"] ?? "",
      procedimento: d.procedimento ?? d["descricao do procedimento"] ?? "",
      exames: d.exames ?? "",
      dias_semana: d.dias_semana ?? d["dias"] ?? "",
      hora_inicio: d.hora_inicio ?? d["hora entrada"] ?? "",
      hora_fim: d.hora_fim ?? d["hora saida"] ?? "",
      vagas: Number(d.vagas) || 0,
      vigencia_inicio: d.vigencia_inicio ?? d["vigência inicial"] ?? "",
      vigencia_fim: d.vigencia_fim ?? d["vigência final"] ?? ""
    };
  }
  
  // Normalizar lista de dados
  static normalizarLista(lista) {
    if (!Array.isArray(lista)) return [];
    return lista.map(item => this.normalizarItem(item));
  }
  
  // Formatar hora
  static formatarHora(valor) {
    if (!valor) return '';
    if (typeof valor === "string" && valor.includes('T')) {
      return valor.split('T')[1].substring(0, 5);
    }
    return valor;
  }
  
  // Formatar data BR
  static formatarDataBR(valor) {
    if (!valor || typeof valor !== "string") return valor;
    if (valor.includes('T')) {
      const dataPura = valor.split('T')[0];
      return dataPura.split('-').reverse().join('/');
    }
    return valor;
  }
  
  // Extrair dias da semana
  static extrairDias(diasTxt) {
    const s = String(diasTxt || "").toUpperCase();
    const tokens = s.split(/[\s,;\/]+/).filter(Boolean);
    const valid = ["DOM","SEG","TER","QUA","QUI","SEX","SAB"];
    return tokens.filter(t => valid.includes(t));
  }
  
  // Tipo de procedimento
  static tipoProcedimento(txt) {
    const t = String(txt || "").toUpperCase();
    if (t.includes("RETORNO")) return SISREG_CONFIG.TIPOS_PROCEDIMENTO.RETORNO;
    if (t.startsWith("GRUPO") || t.includes("GRUPO")) return SISREG_CONFIG.TIPOS_PROCEDIMENTO.GRUPO;
    if (t.includes("EXAME")) return SISREG_CONFIG.TIPOS_PROCEDIMENTO.EXAME;
    if (t.includes("CONSULTA")) return SISREG_CONFIG.TIPOS_PROCEDIMENTO.CONSULTA;
    return SISREG_CONFIG.TIPOS_PROCEDIMENTO.OUTROS;
  }
}
