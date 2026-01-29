/**
 * Sistema de Carregamento de Dados
 * Responsável por carregar e processar os arquivos CSV
 * unidades.csv, profissionais.csv e procedimentos.csv
 */

/**
 * Carrega todos os dados CSV de forma assíncrona
 * @returns {Promise<Object>} Objeto com dados de unidades, profissionais e procedimentos
 */
export async function loadData() {
  try {
    // Carrega todos os arquivos CSV simultaneamente
    const [unidades, profissionais, procedimentos] = await Promise.all([
      loadCSV('/data/unidades.csv'),
      loadCSV('/data/profissionais.csv'),
      loadCSV('/data/procedimentos.csv')
    ]);

    // Processa os dados
    const unidadesProcessadas = processarUnidades(unidades);
    const profissionaisProcessados = processarProfissionais(profissionais);
    const procedimentosProcessados = processarProcedimentos(procedimentos);

    return {
      unidades: unidadesProcessadas,
      profissionais: profissionaisProcessados,
      procedimentos: procedimentosProcessados
    };
  } catch (error) {
    console.error('Erro ao carregar dados:', error);
    return {
      unidades: [],
      profissionais: [],
      procedimentos: []
    };
  }
}

/**
 * Carrega um arquivo CSV e retorna os dados processados
 * @param {string} url - URL do arquivo CSV
 * @returns {Promise<Array<Object>>} Array de objetos com os dados
 */
async function loadCSV(url) {
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Erro ao carregar ${url}: ${response.status}`);
    }

    const csvText = await response.text();
    return parseCSV(csvText);
  } catch (error) {
    console.error(`Erro ao carregar ${url}:`, error);
    return [];
  }
}

/**
 * Processa texto CSV e converte para array de objetos
 * @param {string} csvText - Texto do arquivo CSV
 * @returns {Array<Object>} Array de objetos com dados
 */
function parseCSV(csvText) {
  const lines = csvText.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) return [];

  // Primeira linha são os cabeçalhos
  const headers = lines[0]
    .split(';')
    .map(header => header.trim().replace(/['"]/g, ''));

  // Processa as linhas de dados
  return lines.slice(1).map(line => {
    const values = parseCSVRow(line, ';');
    
    // Cria objeto com chave-valor
    const obj = {};
    headers.forEach((header, index) => {
      let value = values[index] || '';
      
      // Limpa formatação específica dos CSVs
      value = value.replace(/^"""/, '').replace(/"""$/, ''); // Remove """ do início e fim
      value = value.replace(/^\[/, '').replace(/\]$/, '').trim(); // Remove [ ] do tipo
      
      obj[header] = value;
    });
    
    return obj;
  });
}

/**
 * Processa uma linha CSV (trata valores entre aspas)
 * @param {string} row - Linha CSV
 * @param {string} delimiter - Delimitador (padrão ';')
 * @returns {Array<string>} Array de valores
 */
function parseCSVRow(row, delimiter = ';') {
  const values = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < row.length) {
    const char = row[i];

    if (char === '"' && (i === 0 || row[i - 1] !== '\\')) {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      values.push(current.trim().replace(/^"|"$/g, ''));
      current = '';
    } else {
      current += char;
    }
    
    i++;
  }

  // Adiciona o último valor
  values.push(current.trim().replace(/^"|"$/g, ''));

  return values;
}

/**
 * Processa dados de unidades
 * @param {Array<Object>} unidades - Array de unidades
 * @returns {Array<Object>} Unidades processadas
 */
export function processarUnidades(unidades) {
  return unidades.map(u => ({
    id: u.CODIGO_CNES || u.codigo || '',
    codigo: u.CODIGO_CNES || u.codigo || '',
    nome: u.NOME_FANTASIA || u.nome || '',
    tipo: u.TIPO || 'EXECUTANTE',
    status: 'ATIVO'
  }));
}

/**
 * Processa dados de profissionais
 * @param {Array<Object>} profissionais - Array de profissionais
 * @returns {Array<Object>} Profissionais processados
 */
export function processarProfissionais(profissionais) {
  const mapaProfissionais = new Map();
  
  profissionais.forEach(p => {
    const cpf = p.CPF || p.cpf || '';
    const nome = p.NOME || p.nome || '';
    const unidade = p.UNIDADE || p.unidade || '';
    const status = p.STATUS || p.status || 'ATIVO';
    
    if (!mapaProfissionais.has(cpf)) {
      mapaProfissionais.set(cpf, {
        cpf: cpf,
        nome: nome,
        unidades: [],
        status: status
      });
    }
    
    // Adiciona unidade ao array (mesmo profissional pode ter múltiplas unidades)
    if (unidade && !mapaProfissionais.get(cpf).unidades.includes(unidade)) {
      mapaProfissionais.get(cpf).unidades.push(unidade);
    }
  });
  
  return Array.from(mapaProfissionais.values());
}

/**
 * Processa dados de procedimentos
 * @param {Array<Object>} procedimentos - Array de procedimentos
 * @returns {Array<Object>} Procedimentos processados
 */
export function processarProcedimentos(procedimentos) {
  return procedimentos.map(p => ({
    id: p.CODIGO || p.codigo || '',
    codigo: p.CODIGO || p.codigo || '',
    nome: p.PROCEDIMENTO || p.procedimento || '',
    tipo: (p.TIPO || p.tipo || '').trim(),
    regulado: (p.REGULADO || p.regulado || 'Nao').toLowerCase() === 'sim',
    categoria: extrairCategoria(p.PROCEDIMENTO || p.procedimento || '')
  }));
}

/**
 * Extrai categoria do nome do procedimento
 */
function extrairCategoria(nome) {
  // Remove aspas e espaços extras
  nome = nome.replace(/^"""/, '').replace(/"""$/, '').trim();
  
  // Extrai categoria antes do primeiro "-"
  const match = nome.match(/GRUPO\s*-\s*([^(-]+)/i);
  if (match) {
    return match[1].trim();
  }
  
  // Se não encontrar "GRUPO -", tenta extrair antes do primeiro "-"
  const parts = nome.split('-');
  if (parts.length > 1) {
    return parts[0].replace('GRUPO', '').trim();
  }
  
  return 'OUTROS';
}

/**
 * Filtra unidades por critérios específicos
 * @param {Array<Object>} unidades - Array de unidades
 * @param {Object} filters - Filtros { nome, tipo, status }
 * @returns {Array<Object>} Unidades filtradas
 */
export function filterUnidades(unidades, filters = {}) {
  return unidades.filter(unidade => {
    let match = true;

    // Filtro por nome
    if (filters.nome && filters.nome.trim()) {
      match = match && unidade.nome?.toLowerCase().includes(filters.nome.toLowerCase());
    }

    // Filtro por tipo
    if (filters.tipo && filters.tipo !== 'todos') {
      match = match && unidade.tipo === filters.tipo;
    }

    // Filtro por status
    if (filters.status && filters.status !== 'todos') {
      match = match && unidade.status === filters.status;
    }

    return match;
  });
}

/**
 * Filtra profissionais por critérios específicos
 * @param {Array<Object>} profissionais - Array de profissionais
 * @param {Object} filters - Filtros { nome, unidade, status }
 * @returns {Array<Object>} Profissionais filtrados
 */
export function filterProfissionais(profissionais, filters = {}) {
  return profissionais.filter(prof => {
    let match = true;

    // Filtro por nome
    if (filters.nome && filters.nome.trim()) {
      match = match && (
        prof.nome?.toLowerCase().includes(filters.nome.toLowerCase()) ||
        prof.cpf?.includes(filters.nome)
      );
    }

    // Filtro por unidade
    if (filters.unidade && filters.unidade !== 'todos') {
      match = match && prof.unidades.includes(filters.unidade);
    }

    // Filtro por status
    if (filters.status && filters.status !== 'todos') {
      match = match && prof.status === filters.status;
    }

    return match;
  });
}

/**
 * Filtra procedimentos por critérios específicos
 * @param {Array<Object>} procedimentos - Array de procedimentos
 * @param {Object} filters - Filtros { nome, tipo, regulado }
 * @returns {Array<Object>} Procedimentos filtrados
 */
export function filterProcedimentos(procedimentos, filters = {}) {
  return procedimentos.filter(proc => {
    let match = true;

    // Filtro por nome
    if (filters.nome && filters.nome.trim()) {
      match = match && proc.nome?.toLowerCase().includes(filters.nome.toLowerCase());
    }

    // Filtro por tipo
    if (filters.tipo && filters.tipo !== 'todos') {
      match = match && proc.tipo === filters.tipo;
    }

    // Filtro por regulado
    if (filters.regulado !== undefined) {
      match = match && proc.regulado === filters.regulado;
    }

    return match;
  });
}

/**
 * Agrupa dados por um campo específico
 * @param {Array<Object>} data - Array de dados
 * @param {string} field - Campo para agrupar
 * @returns {Object} Objeto com grupos
 */
export function groupBy(data, field) {
  return data.reduce((groups, item) => {
    const key = item[field] || 'Sem ' + field;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {});
}

/**
 * Calcula total de unidades
 * @param {Array<Object>} unidades - Array de unidades
 * @returns {number} Total de unidades
 */
export function calcularTotalUnidades(unidades) {
  return unidades.length;
}

/**
 * Calcula total de profissionais
 * @param {Array<Object>} profissionais - Array de profissionais
 * @returns {number} Total de profissionais
 */
export function calcularTotalProfissionais(profissionais) {
  return profissionais.length;
}

/**
 * Calcula total de procedimentos
 * @param {Array<Object>} procedimentos - Array de procedimentos
 * @returns {number} Total de procedimentos
 */
export function calcularTotalProcedimentos(procedimentos) {
  return procedimentos.length;
}

/**
 * Calcula estatísticas gerais
 * @param {Object} data - Dados carregados { unidades, profissionais, procedimentos }
 * @returns {Object} Estatísticas
 */
export function calcularEstatisticas(data) {
  return {
    totalUnidades: calcularTotalUnidades(data.unidades),
    totalProfissionais: calcularTotalProfissionais(data.profissionais),
    totalProcedimentos: calcularTotalProcedimentos(data.procedimentos),
    unidadesPorTipo: groupBy(data.unidades, 'tipo'),
    procedimentosPorTipo: groupBy(data.procedimentos, 'tipo'),
    procedimentosRegulados: data.procedimentos.filter(p => p.regulado).length,
    procedimentosNaoRegulados: data.procedimentos.filter(p => !p.regulado).length
  };
}

/**
 * Busca unidade por ID ou código
 * @param {Array<Object>} unidades - Array de unidades
 * @param {string|number} id - ID ou código da unidade
 * @returns {Object|null} Unidade encontrada ou null
 */
export function findUnidadeById(unidades, id) {
  return unidades.find(u => u.id == id || u.codigo == id) || null;
}

/**
 * Busca profissional por CPF
 * @param {Array<Object>} profissionais - Array de profissionais
 * @param {string} cpf - CPF do profissional
 * @returns {Object|null} Profissional encontrado ou null
 */
export function findProfissionalByCPF(profissionais, cpf) {
  return profissionais.find(p => p.cpf === cpf) || null;
}

/**
 * Busca procedimento por código
 * @param {Array<Object>} procedimentos - Array de procedimentos
 * @param {string|number} codigo - Código do procedimento
 * @returns {Object|null} Procedimento encontrado ou null
 */
export function findProcedimentoByCodigo(procedimentos, codigo) {
  return procedimentos.find(p => p.codigo == codigo) || null;
}

/**
 * Ordena dados por um campo específico
 * @param {Array<Object>} data - Array de dados
 * @param {string} field - Campo para ordenar
 * @param {string} order - 'asc' ou 'desc'
 * @returns {Array<Object>} Dados ordenados
 */
export function sortBy(data, field, order = 'asc') {
  return [...data].sort((a, b) => {
    const valA = a[field] || '';
    const valB = b[field] || '';
    
    if (typeof valA === 'number' && typeof valB === 'number') {
      return order === 'asc' ? valA - valB : valB - valA;
    }
    
    return order === 'asc' 
      ? String(valA).localeCompare(String(valB), 'pt-BR')
      : String(valB).localeCompare(String(valA), 'pt-BR');
  });
}

/**
 * Formata dados para exportação CSV
 * @param {Array<Object>} data - Array de dados
 * @returns {string} Texto CSV formatado
 */
export function formatToCSV(data) {
  if (!data || data.length === 0) return '';

  // Cabeçalhos
  const headers = Object.keys(data[0]);
  let csv = headers.join(';') + '\n';

  // Dados
  data.forEach(row => {
    const values = headers.map(header => {
      const value = row[header];
      // Se contém ponto e vírgula ou aspas, envolve em aspas
      return String(value).includes(';') || String(value).includes('"')
        ? `"${String(value).replace(/"/g, '""')}"`
        : String(value);
    });
    csv += values.join(';') + '\n';
  });

  return csv;
}

/**
 * Exporta dados para arquivo CSV
 * @param {Array<Object>} data - Array de dados
 * @param {string} filename - Nome do arquivo
 */
export function exportToCSV(data, filename = 'export.csv') {
  const csv = formatToCSV(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}