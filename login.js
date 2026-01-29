/**
 * Script de Login - Agenda SISREG
 * Gerencia autenticação de usuários baseada em unidades e CNES
 */

import { CONFIG } from './config/config.js';
import { loadCSV } from './scripts/data-loader.js';

// Variáveis globais
let unidades = [];
let selectedUnidade = null;

/**
 * Inicializa a página de login
 */
async function initLogin() {
    console.log('Inicializando página de login...');
    
    // Carrega unidades do CSV
    await carregarUnidades();
    
    // Configura autocomplete
    setupAutocomplete();
    
    // Configura validação de senha
    setupPasswordValidation();
    
    // Configura formulário
    setupLoginForm();
    
    // Configura créditos do rodapé
    setupFooterCredits();
}

/**
 * Carrega unidades do arquivo CSV
 */
async function carregarUnidades() {
    try {
        unidades = await loadCSV('/data/unidades.csv');
        
        console.log(`✓ Carregadas ${unidades.length} unidades`);
        
        // Ordena unidades alfabeticamente
        unidades.sort((a, b) => 
            (a.NOME_FANTASIA || '').localeCompare(b.NOME_FANTASIA || '')
        );
        
    } catch (error) {
        console.error('Erro ao carregar unidades:', error);
        showError('Erro ao carregar lista de unidades. Tente novamente.');
    }
}

/**
 * Configura autocomplete para o campo de unidade
 */
function setupAutocomplete() {
    const input = document.getElementById('unidade');
    const resultsContainer = document.getElementById('autocompleteResults');
    
    // Mostra resultados ao digitar
    input.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        filterUnidades(searchTerm);
    });
    
    // Fecha resultados ao clicar fora
    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !resultsContainer.contains(e.target)) {
            resultsContainer.style.display = 'none';
        }
    });
    
    // Navegação por teclado
    input.addEventListener('keydown', (e) => {
        const items = resultsContainer.querySelectorAll('.autocomplete-item');
        const activeItem = resultsContainer.querySelector('.selected');
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (activeItem) {
                activeItem.classList.remove('selected');
                const next = activeItem.nextElementSibling;
                if (next) {
                    next.classList.add('selected');
                    next.scrollIntoView({ block: 'nearest' });
                } else {
                    items[0].classList.add('selected');
                }
            } else if (items.length > 0) {
                items[0].classList.add('selected');
            }
        }
        
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (activeItem) {
                activeItem.classList.remove('selected');
                const prev = activeItem.previousElementSibling;
                if (prev) {
                    prev.classList.add('selected');
                    prev.scrollIntoView({ block: 'nearest' });
                } else {
                    items[items.length - 1].classList.add('selected');
                }
            }
        }
        
        if (e.key === 'Enter' && activeItem) {
            e.preventDefault();
            selectUnidade(activeItem.dataset.codigo);
        }
    });
}

/**
 * Filtra unidades com base no termo de busca
 */
function filterUnidades(searchTerm) {
    const resultsContainer = document.getElementById('autocompleteResults');
    
    if (!searchTerm.trim()) {
        resultsContainer.style.display = 'none';
        resultsContainer.innerHTML = '';
        return;
    }
    
    // Filtra unidades
    const filtered = unidades.filter(unidade => 
        unidade.NOME_FANTASIA.toLowerCase().includes(searchTerm) ||
        unidade.CODIGO_CNES.includes(searchTerm)
    ).slice(0, 10); // Limita a 10 resultados
    
    // Renderiza resultados
    if (filtered.length > 0) {
        resultsContainer.innerHTML = filtered.map(unidade => `
            <div class="autocomplete-item" data-codigo="${unidade.CODIGO_CNES}">
                <strong>${unidade.NOME_FANTASIA}</strong>
                <div style="font-size: 12px; color: var(--text-tertiary);">
                    CNES: ${unidade.CODIGO_CNES} • ${unidade.TIPO || ''}
                </div>
            </div>
        `).join('');
        
        resultsContainer.style.display = 'block';
        
        // Adiciona evento de clique nos itens
        resultsContainer.querySelectorAll('.autocomplete-item').forEach(item => {
            item.addEventListener('click', () => {
                selectUnidade(item.dataset.codigo);
            });
        });
        
    } else {
        resultsContainer.innerHTML = `
            <div class="autocomplete-item" style="text-align: center; color: var(--text-tertiary);">
                Nenhuma unidade encontrada
            </div>
        `;
        resultsContainer.style.display = 'block';
    }
}

/**
 * Seleciona uma unidade do autocomplete
 */
function selectUnidade(codigoCNES) {
    const unidade = unidades.find(u => u.CODIGO_CNES === codigoCNES);
    
    if (unidade) {
        selectedUnidade = unidade;
        document.getElementById('unidade').value = unidade.NOME_FANTASIA;
        document.getElementById('autocompleteResults').style.display = 'none';
        
        // Foca no campo de senha
        document.getElementById('senha').focus();
    }
}

/**
 * Configura validação do campo de senha
 */
function setupPasswordValidation() {
    const senhaInput = document.getElementById('senha');
    
    // Formata CNES com zeros à esquerda
    senhaInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        
        // Limita a 7 dígitos
        if (value.length > 7) {
            value = value.slice(0, 7);
        }
        
        // Adiciona zeros à esquerda se necessário
        e.target.value = value.padStart(7, '0');
    });
}

/**
 * Configura o formulário de login
 */
function setupLoginForm() {
    const form = document.getElementById('loginForm');
    const loginBtn = document.getElementById('btnLogin');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Valida formulário
        if (!validateForm()) {
            return;
        }
        
        // Desabilita botão durante o processamento
        loginBtn.disabled = true;
        loginBtn.classList.add('loading');
        loginBtn.textContent = 'Verificando...';
        
        try {
            // Verifica login
            const success = await verifyLogin();
            
            if (success) {
                // Salva dados da sessão
                sessionStorage.setItem('sisreg_unidade', JSON.stringify(selectedUnidade));
                
                // Redireciona para dashboard
                window.location.href = 'dashboard.html';
            } else {
                showError('Unidade ou CNES inválido. Verifique os dados e tente novamente.');
                loginBtn.disabled = false;
                loginBtn.classList.remove('loading');
                loginBtn.textContent = 'ENTRAR';
            }
        } catch (error) {
            console.error('Erro ao verificar login:', error);
            showError('Erro ao processar login. Tente novamente.');
            loginBtn.disabled = false;
            loginBtn.classList.remove('loading');
            loginBtn.textContent = 'ENTRAR';
        }
    });
}

/**
 * Valida o formulário de login
 */
function validateForm() {
    const unidadeInput = document.getElementById('unidade');
    const senhaInput = document.getElementById('senha');
    const errorMessage = document.getElementById('errorMessage');
    
    // Limpa mensagem de erro
    errorMessage.style.display = 'none';
    
    // Verifica se unidade foi selecionada
    if (!selectedUnidade) {
        showError('Por favor, selecione uma unidade da lista.');
        unidadeInput.focus();
        return false;
    }
    
    // Verifica se senha foi preenchida
    if (!senhaInput.value.trim()) {
        showError('Por favor, digite o CNES da unidade.');
        senhaInput.focus();
        return false;
    }
    
    // Verifica se senha tem 7 dígitos
    if (senhaInput.value.length !== 7 || !/^\d{7}$/.test(senhaInput.value)) {
        showError('O CNES deve ter exatamente 7 dígitos numéricos.');
        senhaInput.focus();
        return false;
    }
    
    return true;
}

/**
 * Verifica as credenciais de login
 */
async function verifyLogin() {
    const senhaInput = document.getElementById('senha');
    const senha = senhaInput.value.trim();
    
    // Verifica se CNES corresponde à unidade selecionada
    if (selectedUnidade && selectedUnidade.CODIGO_CNES === senha) {
        return true;
    }
    
    return false;
}

/**
 * Exibe mensagem de erro
 */
function showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    
    // Remove mensagem após 5 segundos
    setTimeout(() => {
        errorMessage.style.display = 'none';
    }, 5000);
}

/**
 * Configura créditos do rodapé
 */
function setupFooterCredits() {
    const footer = document.getElementById('footer-credits');
    if (footer) {
        // Divide os créditos em duas linhas
        footer.innerHTML = `
            <p>${CONFIG.credits.replace(' | ', '<br>')}</p>
        `;
    }
}

// Inicializa a página quando carregada
document.addEventListener('DOMContentLoaded', initLogin);