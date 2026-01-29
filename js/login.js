// js/login.js
// Versão refatorada com configuração centralizada
// ============================================================

document.addEventListener("DOMContentLoaded", async () => {
  
  // ==================== INICIALIZAÇÃO ====================
  
  // Carregar créditos
  await SisregUtils.preencherCreditos("footerCreditos");
  
  // Preencher título do sistema
  const tituloSistema = document.getElementById("tituloSistema");
  if (tituloSistema) {
    tituloSistema.textContent = SISREG_CONFIG.SISTEMA.NOME;
  }
  
  const subtituloSistema = document.getElementById("subtituloSistema");
  if (subtituloSistema) {
    subtituloSistema.textContent = SISREG_CONFIG.SISTEMA.SUBTITULO;
  }
  
  // ==================== VARIÁVEIS ====================
  
  const unidadeSelect = document.getElementById("unidadeSelect");
  const formLogin = document.getElementById("formLogin");
  const loginError = document.getElementById("loginError");
  let unidadesData = [];
  
  // ==================== CARREGAMENTO DE UNIDADES ====================
  
  try {
    unidadesData = await SisregUtils.carregarDadosJson(SISREG_CONFIG.ARQUIVOS.UNIDADES);
    
    if (!Array.isArray(unidadesData)) {
      unidadesData = unidadesData.unidades || [];
    }
    
    if (unidadeSelect) {
      unidadeSelect.innerHTML = '<option value="" disabled selected>🏥 Selecione a unidade...</option>';
      
      // Ordenar unidades por nome
      unidadesData
        .sort((a, b) => (a.NOME_FANTASIA || '').localeCompare(b.NOME_FANTASIA || ''))
        .forEach(unidade => {
          const option = document.createElement("option");
          option.value = unidade.NOME_FANTASIA;
          option.textContent = unidade.NOME_FANTASIA;
          option.setAttribute("data-cnes", unidade.CODIGO_CNES || "");
          unidadeSelect.appendChild(option);
        });
    }
  } catch (err) {
    console.error("Erro ao carregar unidades:", err);
    if (unidadeSelect) {
      unidadeSelect.innerHTML = '<option value="">❌ Erro ao carregar lista</option>';
    }
    SisregUtils.showToast(SISREG_CONFIG.MENSAGENS.ERRO_CONEXAO, "error");
  }
  
  // ==================== PROCESSAMENTO DE LOGIN ====================
  
  formLogin.addEventListener("submit", (e) => {
    e.preventDefault();
    
    const nomeUnidade = unidadeSelect.value;
    const senhaDigitada = document.getElementById("password")?.value || "";
    
    // Encontra o objeto da unidade selecionada
    const unidadeEncontrada = unidadesData.find(u => u.NOME_FANTASIA === nomeUnidade);
    
    if (unidadeEncontrada) {
      // A senha é o CODIGO_CNES da unidade encontrada
      if (senhaDigitada === unidadeEncontrada.CODIGO_CNES) {
        // Salvar unidade no localStorage
        SisregUtils.setUnidade(nomeUnidade, unidadeEncontrada.CODIGO_CNES);
        
        // Feedback visual
        const submitBtn = formLogin.querySelector('button[type="submit"]');
        if (submitBtn) {
          SisregUtils.showLoading(submitBtn, "Entrando...");
        }
        
        // Redireciona para o Dashboard após pequeno delay
        setTimeout(() => {
          SisregUtils.showToast(SISREG_CONFIG.MENSAGENS.LOGIN_SUCESSO, "success");
          window.location.href = SISREG_CONFIG.PAGINAS.DASHBOARD;
        }, 800);
      } else {
        // Senha incorreta
        if (loginError) {
          loginError.textContent = SISREG_CONFIG.MENSAGENS.LOGIN_ERRO;
          loginError.style.display = "block";
        }
        SisregUtils.showToast(SISREG_CONFIG.MENSAGENS.LOGIN_ERRO, "error");
      }
    } else {
      // Unidade não selecionada
      if (loginError) {
        loginError.textContent = SISREG_CONFIG.MENSAGENS.SELECIONE_UNIDADE;
        loginError.style.display = "block";
      }
      SisregUtils.showToast(SISREG_CONFIG.MENSAGENS.SELECIONE_UNIDADE, "warning");
    }
  });
  
  // Limpar erro ao mudar seleção
  unidadeSelect?.addEventListener("change", () => {
    if (loginError) loginError.style.display = "none";
  });
  
});
