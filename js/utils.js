function getUnidadeFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("unidade");
}

function fetchJSON(path) {
  return fetch(path).then(r => r.json());
}

/**
 * Calcula o total de vagas considerando dias da semana e período de vigência
 * @param {number} vagasPorDia - Número de vagas por dia
 * @param {string} diasSemana - Dias da semana (ex: "SEG SEX")
 * @param {string} vigenciaInicio - Data de início da vigência (DD/MM/YYYY ou YYYY-MM-DD)
 * @param {string} vigenciaFim - Data de fim da vigência (DD/MM/YYYY ou YYYY-MM-DD)
 * @returns {number} Total de vagas no período
 */
SisregUtils.calcularTotalVagas = function(vagasPorDia, diasSemana, vigenciaInicio, vigenciaFim) {
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
};

/**
 * Converte string de data para objeto Date
 * @param {string} dataStr - Data em formato DD/MM/YYYY ou YYYY-MM-DD
 * @returns {Date|null} Objeto Date ou null se inválido
 */
SisregUtils.parseData = function(dataStr) {
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
};
