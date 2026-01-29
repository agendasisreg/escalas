/**
 * Funções Utilitárias Gerais
 * Funções de apoio usadas em todo o sistema
 */

/**
 * Formata data para o padrão brasileiro (DD/MM/YYYY)
 * @param {string|Date} date - Data para formatar
 * @returns {string} Data formatada
 */
export function formatDate(date) {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  return `${day}/${month}/${year}`;
}

/**
 * Formata data e hora para o padrão brasileiro (DD/MM/YYYY HH:mm)
 * @param {string|Date} date - Data para formatar
 * @returns {string} Data e hora formatadas
 */
export function formatDateTime(date) {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * Formata número como moeda brasileira (R$)
 * @param {number} value - Valor para formatar
 * @returns {string} Valor formatado
 */
export function formatCurrency(value) {
  if (value === null || value === undefined) return 'R$ 0,00';
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

/**
 * Formata número com separador de milhar
 * @param {number} value - Valor para formatar
 * @returns {string} Valor formatado
 */
export function formatNumber(value) {
  if (value === null || value === undefined) return '0';
  
  return new Intl.NumberFormat('pt-BR').format(value);
}

/**
 * Formata CPF (XXX.XXX.XXX-XX)
 * @param {string} cpf - CPF para formatar
 * @returns {string} CPF formatado
 */
export function formatCPF(cpf) {
  if (!cpf) return '';
  
  const cleaned = String(cpf).replace(/\D/g, '');
  
  if (cleaned.length !== 11) return cpf;
  
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Formata CNPJ (XX.XXX.XXX/XXXX-XX)
 * @param {string} cnpj - CNPJ para formatar
 * @returns {string} CNPJ formatado
 */
export function formatCNPJ(cnpj) {
  if (!cnpj) return '';
  
  const cleaned = String(cnpj).replace(/\D/g, '');
  
  if (cleaned.length !== 14) return cnpj;
  
  return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

/**
 * Formata CEP (XXXXX-XXX)
 * @param {string} cep - CEP para formatar
 * @returns {string} CEP formatado
 */
export function formatCEP(cep) {
  if (!cep) return '';
  
  const cleaned = String(cep).replace(/\D/g, '');
  
  if (cleaned.length !== 8) return cep;
  
  return cleaned.replace(/(\d{5})(\d{3})/, '$1-$2');
}

/**
 * Formata telefone (XX) XXXXX-XXXX
 * @param {string} phone - Telefone para formatar
 * @returns {string} Telefone formatado
 */
export function formatPhone(phone) {
  if (!phone) return '';
  
  const cleaned = String(phone).replace(/\D/g, '');
  
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  } else if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  
  return phone;
}

/**
 * Verifica se é um CPF válido
 * @param {string} cpf - CPF para validar
 * @returns {boolean} CPF válido ou não
 */
export function isValidCPF(cpf) {
  cpf = String(cpf).replace(/\D/g, '');
  
  if (cpf.length !== 11) return false;
  if (/^(\d)\1+$/.test(cpf)) return false;
  
  let sum = 0;
  let remainder;
  
  // Validação do primeiro dígito
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.substring(9, 10))) return false;
  
  // Validação do segundo dígito
  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cpf.substring(i - 1, i)) * (12 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.substring(10, 11))) return false;
  
  return true;
}

/**
 * Verifica se é um CNPJ válido
 * @param {string} cnpj - CNPJ para validar
 * @returns {boolean} CNPJ válido ou não
 */
export function isValidCNPJ(cnpj) {
  cnpj = String(cnpj).replace(/\D/g, '');
  
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1+$/.test(cnpj)) return false;
  
  const length = cnpj.length - 2;
  const numbers = cnpj.substring(0, length);
  const digits = cnpj.substring(length);
  const calcDigit = (numbers, digitsLength) => {
    let index = 2;
    const sum = numbers.split('').reduceRight((buffer, number) => {
      buffer += parseInt(number, 10) * index;
      index = (index === 9 && digitsLength === 14) ? 2 : index + 1;
      return buffer;
    }, 0);
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };
  
  const digit0 = calcDigit(numbers, length + 1);
  if (digit0 !== parseInt(digits.substring(0, 1), 10)) return false;
  
  const digit1 = calcDigit(numbers + digit0, length + 2);
  if (digit1 !== parseInt(digits.substring(1, 2), 10)) return false;
  
  return true;
}

/**
 * Verifica se é um CEP válido
 * @param {string} cep - CEP para validar
 * @returns {boolean} CEP válido ou não
 */
export function isValidCEP(cep) {
  cep = String(cep).replace(/\D/g, '');
  return cep.length === 8 && /^\d{8}$/.test(cep);
}

/**
 * Verifica se é um e-mail válido
 * @param {string} email - E-mail para validar
 * @returns {boolean} E-mail válido ou não
 */
export function isValidEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * Verifica se é um telefone válido
 * @param {string} phone - Telefone para validar
 * @returns {boolean} Telefone válido ou não
 */
export function isValidPhone(phone) {
  const cleaned = String(phone).replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 11;
}

/**
 * Gera um ID único
 * @returns {string} ID único
 */
export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Gera um código numérico sequencial
 * @param {number} length - Tamanho do código
 * @returns {string} Código gerado
 */
export function generateCode(length = 6) {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return String(Math.floor(Math.random() * (max - min + 1)) + min);
}

/**
 * Remove acentos de uma string
 * @param {string} text - Texto para remover acentos
 * @returns {string} Texto sem acentos
 */
export function removeAccents(text) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Converte string para slug (URL amigável)
 * @param {string} text - Texto para converter
 * @returns {string} Slug gerado
 */
export function slugify(text) {
  return removeAccents(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Limita o tamanho de um texto
 * @param {string} text - Texto para limitar
 * @param {number} limit - Limite de caracteres
 * @param {string} suffix - Sufixo para adicionar
 * @returns {string} Texto limitado
 */
export function truncate(text, limit = 100, suffix = '...') {
  if (!text) return '';
  return text.length > limit ? text.substring(0, limit) + suffix : text;
}

/**
 * Capitaliza a primeira letra de cada palavra
 * @param {string} text - Texto para capitalizar
 * @returns {string} Texto capitalizado
 */
export function capitalize(text) {
  if (!text) return '';
  return text.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Converte bytes para tamanho legível (KB, MB, GB)
 * @param {number} bytes - Bytes para converter
 * @returns {string} Tamanho legível
 */
export function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Debounce - Limita a frequência de execução de uma função
 * @param {Function} func - Função para debounced
 * @param {number} wait - Tempo de espera em ms
 * @returns {Function} Função debounced
 */
export function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle - Limita a execução de uma função a um intervalo
 * @param {Function} func - Função para throttled
 * @param {number} limit - Limite de tempo em ms
 * @returns {Function} Função throttled
 */
export function throttle(func, limit = 300) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Verifica se é um navegador mobile
 * @returns {boolean} É mobile ou não
 */
export function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * Verifica se é um navegador tablet
 * @returns {boolean} É tablet ou não
 */
export function isTablet() {
  return /iPad|Android(?!.*Mobile)/i.test(navigator.userAgent);
}

/**
 * Verifica se é um navegador desktop
 * @returns {boolean} É desktop ou não
 */
export function isDesktop() {
  return !isMobile() && !isTablet();
}

/**
 * Obtém a largura da tela
 * @returns {number} Largura da tela
 */
export function getScreenWidth() {
  return window.innerWidth || document.documentElement.clientWidth;
}

/**
 * Obtém a altura da tela
 * @returns {number} Altura da tela
 */
export function getScreenHeight() {
  return window.innerHeight || document.documentElement.clientHeight;
}

/**
 * Obtém o tamanho do dispositivo
 * @returns {string} 'mobile', 'tablet' ou 'desktop'
 */
export function getDeviceSize() {
  const width = getScreenWidth();
  
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

/**
 * Copia texto para a área de transferência
 * @param {string} text - Texto para copiar
 * @returns {Promise<boolean>} Sucesso ou falha
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Erro ao copiar:', error);
    return false;
  }
}

/**
 * Baixa arquivo
 * @param {string} url - URL do arquivo
 * @param {string} filename - Nome do arquivo
 */
export function downloadFile(url, filename) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || 'download';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Gera um número aleatório entre min e max
 * @param {number} min - Valor mínimo
 * @param {number} max - Valor máximo
 * @returns {number} Número aleatório
 */
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Embaralha um array
 * @param {Array} array - Array para embaralhar
 * @returns {Array} Array embaralhado
 */
export function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Remove duplicatas de um array
 * @param {Array} array - Array para remover duplicatas
 * @returns {Array} Array sem duplicatas
 */
export function removeDuplicates(array) {
  return [...new Set(array)];
}

/**
 * Verifica se um valor está vazio
 * @param {*} value - Valor para verificar
 * @returns {boolean} Está vazio ou não
 */
export function isEmpty(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (typeof value === 'object' && Object.keys(value).length === 0) return true;
  return false;
}

/**
 * Aguarda um tempo específico
 * @param {number} ms - Milissegundos para aguardar
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Obtém parâmetros da URL
 * @param {string} name - Nome do parâmetro
 * @returns {string|null} Valor do parâmetro ou null
 */
export function getUrlParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

/**
 * Define parâmetro na URL
 * @param {string} name - Nome do parâmetro
 * @param {string} value - Valor do parâmetro
 */
export function setUrlParam(name, value) {
  const params = new URLSearchParams(window.location.search);
  params.set(name, value);
  window.history.replaceState({}, '', `${window.location.pathname}?${params}`);
}

/**
 * Remove parâmetro da URL
 * @param {string} name - Nome do parâmetro
 */
export function removeUrlParam(name) {
  const params = new URLSearchParams(window.location.search);
  params.delete(name);
  window.history.replaceState({}, '', `${window.location.pathname}?${params}`);
}

/**
 * Obtém todos os parâmetros da URL como objeto
 * @returns {Object} Objeto com parâmetros
 */
export function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const result = {};
  
  for (const [key, value] of params) {
    result[key] = value;
  }
  
  return result;
}