// ==============================
// utils.js
// ==============================

function getUnidadeFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("unidade");
}

function fetchJSON(path) {
  return fetch(path).then(r => r.json());
}

// ==============================
// SESSÃO (Login) — NOVO
// ==============================
const SISREG_SESSION_KEY = "SISREG_SESSION";

/**
 * Salva sessão do usuário (unidade/master) no localStorage
 * @param {Object} sessao
 */
function setSessao(sessao) {
  try {
    localStorage.setItem(SISREG_SESSION_KEY, JSON.stringify(sessao || {}));
  } catch (e) {
    console.warn("Falha ao salvar sessão:", e);
  }
}

/**
 * Lê sessão do localStorage
 * @returns {Object}
 */
function getSessao() {
  try {
    return JSON.parse(localStorage.getItem(SISREG_SESSION_KEY) || "{}");
  } catch (e) {
    return {};
  }
}

/**
 * Remove sessão
 */
function clearSessao() {
  try {
    localStorage.removeItem(SISREG_SESSION_KEY);
  } catch (e) {}
}

/**
 * Verifica se a sessão é válida (token + expiração)
 * @returns {boolean}
 */
function isLogado() {
  const s = getSessao();
  const agora = Date.now();
  return !!(s && s.token && s.expiresAt && agora <= s.expiresAt);
}

/**
 * Verifica se é MASTER
 * @returns {boolean}
 */
function isMaster() {
  const s = getSessao();
  return isLogado() && s.perfil === "MASTER";
}

/**
 * Protege página: se não estiver logado, redireciona
 * @param {string} redirectUrl
 */
function protegerPagina(redirectUrl) {
  if (!isLogado()) {
    clearSessao();
    window.location.href = redirectUrl;
  }
}

/**
 * Protege página MASTER: se não for master, redireciona
 * @param {string} redirectUrl
 */
function protegerPaginaMaster(redirectUrl) {
  if (!isMaster()) {
    clearSessao();
    window.location.href = redirectUrl;
  }
}
