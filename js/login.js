// js/login.js
// Versão refatorada com configuração centralizada e autocomplete
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

  const unidadeInput = document.getElementById("unidadeInput");
  const listaUnidades = document.getElementById("listaUnidades");
  const formLogin = document.getElementById("formLogin");
  const loginError = document.getElementById("loginError");

  let unidadesData = [];
  let unidadeSelecionada = null;

  // ==================== CARREGAMENTO DE UNIDADES ====================

  try {
    unidadesData = await SisregUtils.carregarDadosJson(SISREG_CONFIG.ARQUIVOS.UNIDADES);

    if (!Array.isArray(unidadesData)) {
      unidadesData = unidadesData.unidades || [];
    }

    // Ordenar unidades por nome
    unidadesData = unidadesData.sort((a, b) =>
      (a.NOME_FANTASIA || '').localeCompare(b.NOME_FANTASIA || '')
    );

  } catch (err) {
    console.error("Erro ao carregar unidades:", err);
    SisregUtils.showToast(SISREG_CONFIG.MENSAGENS.ERRO_CONEXAO, "error");
  }

  // ==================== AUTOCOMPLETE PARA UNIDADES ====================

  /**
   * Filtra e exibe unidades conforme o usuário digita
   */
  unidadeInput.addEventListener("input", () => {
    listaUnidades.innerHTML = "";
    const termo = unidadeInput.value.toLowerCase().trim();

    if (termo.length < 2) {
      listaUnidades.style.display = "none";
      unidadeSelecionada = null;
      return;
    }

    // Filtra unidades pelo nome
    const unidadesFiltradas = unidadesData.filter(u =>
      (u.NOME_FANTASIA || "").toLowerCase().includes(termo)
    ).slice(0, 15);

    if (unidadesFiltradas.length === 0) {
      listaUnidades.style.display = "none";
      return;
    }

    // Cria elementos para cada unidade encontrada
    unidadesFiltradas.forEach(unidade => {
      const div = document.createElement("div");
      div.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span>${unidade.NOME_FANTASIA}</span>
          <span style="color:${SISREG_CONFIG.CORES.GRAY};font-size:0.85rem;">${unidade.CODIGO_CNES}</span>
        </div>
      `;
      div.style.cursor = "pointer";
      div.style.padding = "12px 16px";
      div.style.borderBottom = "1px solid rgba(0,0,0,0.06)";

      div.onmouseover = () => {
        div.style.background = `rgba(26,42,108,0.08)`;
        div.style.color = SISREG_CONFIG.CORES.PRIMARY;
        div.style.paddingLeft = "20px";
      };

      div.onmouseout = () => {
        div.style.background = "";
        div.style.color = "";
        div.style.paddingLeft = "16px";
      };

      div.onclick = () => {
        unidadeInput.value = unidade.NOME_FANTASIA;
        unidadeSelecionada = unidade;
        listaUnidades.style.display = "none";
      };

      listaUnidades.appendChild(div);
    });

    listaUnidades.style.display = "block";
  });

  /**
   * Fecha o autocomplete quando o campo perde o foco
   */
  unidadeInput.addEventListener("blur", () => {
    setTimeout(() => {
      listaUnidades.style.display = "none";
    }, 200);
  });

  /**
   * Seleciona unidade ao pressionar Enter
   */
  unidadeInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && listaUnidades.style.display === "block") {
      e.preventDefault();
      const primeiraUnidade = listaUnidades.querySelector("div");
      if (primeiraUnidade) {
        primeiraUnidade.click();
      }
    }
  });

  // ==================== PROCESSAMENTO DE LOGIN ====================

  formLogin.addEventListener("submit", (e) => {
    e.preventDefault();

    const senhaDigitada = document.getElementById("password")?.value || "";

    // Verifica se uma unidade foi selecionada
    if (!unidadeSelecionada) {
      // Tenta encontrar a unidade pelo nome digitado
      const nomeDigitado = unidadeInput.value.trim();
      unidadeSelecionada = unidadesData.find(u => u.NOME_FANTASIA === nomeDigitado);

      if (!unidadeSelecionada) {
        if (loginError) {
          loginError.textContent = "❌ Selecione uma unidade válida da lista.";
          loginError.style.display = "block";
        }
        SisregUtils.showToast("Selecione uma unidade válida da lista.", "warning");
        unidadeInput.focus();
        return;
      }
    }

    // Verifica se a senha (CNES) está correta
    if (senhaDigitada === unidadeSelecionada.CODIGO_CNES) {

      // =======================
      // SALVAR SESSÃO
      // =======================
      SisregUtils.setUnidade(unidadeSelecionada.NOME_FANTASIA, unidadeSelecionada.CODIGO_CNES);

      // ==============================
      // NOVO: criar sessão com expiração
      // ==============================
      const agora = Date.now();
      const expiraEmHoras = 8; // ajuste se quiser (ex: 24)
      const expiresAt = agora + (expiraEmHoras * 60 * 60 * 1000);
      
      const perfil = (String(unidadeSelecionada.TIPO || "").toUpperCase().includes("MASTER"))
        ? "MASTER"
        : "UNIDADE";
      
      // token simples só pra marcar sessão do navegador
      setSessao({
        unidade: unidadeSelecionada.NOME_FANTASIA,
        cnes: unidadeSelecionada.CODIGO_CNES,
        perfil,
        token: `${agora}-${Math.random().toString(16).slice(2)}`,
        expiresAt
      });


      // Flag MASTER (gestor)
      const tipo = String(unidadeSelecionada.TIPO || "").toUpperCase().trim();
      const isMaster = (tipo === "MASTER");

      // Salvar flag master (simples e direto)
      localStorage.setItem("SISREG_IS_MASTER", isMaster ? "1" : "0");

      // Feedback visual
      const submitBtn = formLogin.querySelector('button[type="submit"]');
      if (submitBtn) {
        SisregUtils.showLoading(submitBtn, "Entrando...");
      }

      // =======================
      // REDIRECIONAMENTO
      // =======================
      const urlMaster = (SISREG_CONFIG?.PAGINAS?.DASHBOARD_MASTER) || "dashboard-master.html";
      const urlNormal = (SISREG_CONFIG?.PAGINAS?.DASHBOARD) || "dashboard.html";

      setTimeout(() => {
        SisregUtils.showToast(SISREG_CONFIG.MENSAGENS.LOGIN_SUCESSO, "success");
        window.location.href = isMaster ? urlMaster : urlNormal;
      }, 800);

    } else {
      // Senha incorreta
      if (loginError) {
        loginError.textContent = SISREG_CONFIG.MENSAGENS.LOGIN_ERRO;
        loginError.style.display = "block";
      }
      SisregUtils.showToast(SISREG_CONFIG.MENSAGENS.LOGIN_ERRO, "error");

      // Limpa campo de senha
      const pass = document.getElementById("password");
      if (pass) pass.value = "";
      pass?.focus();
    }
  });

  // Limpar erro ao mudar seleção
  unidadeInput.addEventListener("input", () => {
    if (loginError) loginError.style.display = "none";
  });

  // Limpar erro ao digitar senha
  document.getElementById("password")?.addEventListener("input", () => {
    if (loginError) loginError.style.display = "none";
  });

});
