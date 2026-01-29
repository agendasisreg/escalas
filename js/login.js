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
  
  // Adicione esta nova seção de autocomplete para unidades
  const unidadeInput = document.getElementById("unidadeInput");
  const listaUnidades = document.getElementById("listaUnidades");
  
  // Autocomplete para unidade
  unidadeInput.addEventListener("input", () => {
    listaUnidades.innerHTML = "";
    const termo = unidadeInput.value.toLowerCase();
    
    if (termo.length < 2) { 
      listaUnidades.style.display = "none"; 
      return; 
    }
    
    // Filtra unidades pelo nome
    unidadesData
      .filter(u => u.NOME_FANTASIA.toLowerCase().includes(termo))
      .slice(0, 10)
      .forEach(unidade => {
        const div = document.createElement("div");
        div.textContent = `${unidade.NOME_FANTASIA} (${unidade.CODIGO_CNES})`;
        div.onclick = () => {
          unidadeInput.value = unidade.NOME_FANTASIA;
          unidadeSelecionada = unidade;
          listaUnidades.style.display = "none";
        };
        listaUnidades.appendChild(div);
      });
    
    listaUnidades.style.display = "block";
  });
  
  // Adicione esta função para selecionar a unidade ao clicar na sugestão
  unidadeInput.addEventListener("blur", () => {
    setTimeout(() => {
      listaUnidades.style.display = "none";
    }, 200);
  });
  
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
