// js/login.js
// ============================================================
// LOGIN SISREG — versão FINAL compatível com config.js atual
// ============================================================

document.addEventListener("DOMContentLoaded", async () => {

  // ==================== INICIALIZAÇÃO ====================

  await SisregUtils.preencherCreditos("footerCreditos");

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

  // ==================== CARREGAR UNIDADES ====================

  try {
    const dados = await SisregUtils.carregarDadosJson(SISREG_CONFIG.ARQUIVOS.UNIDADES);
    unidadesData = Array.isArray(dados) ? dados : (dados?.unidades || []);

    unidadesData.sort((a, b) =>
      (a.NOME_FANTASIA || "").localeCompare(b.NOME_FANTASIA || "")
    );

  } catch (err) {
    console.error(err);
    SisregUtils.showToast(SISREG_CONFIG.MENSAGENS.ERRO_CONEXAO, "error");
  }

  // ==================== AUTOCOMPLETE ====================

  unidadeInput.addEventListener("input", () => {
    listaUnidades.innerHTML = "";
    const termo = unidadeInput.value.toLowerCase().trim();

    unidadeSelecionada = null;

    if (termo.length < 2) {
      listaUnidades.style.display = "none";
      return;
    }

    const filtradas = unidadesData
      .filter(u => (u.NOME_FANTASIA || "").toLowerCase().includes(termo))
      .slice(0, 15);

    if (!filtradas.length) {
      listaUnidades.style.display = "none";
      return;
    }

    filtradas.forEach(unidade => {
      const div = document.createElement("div");
      div.style.cursor = "pointer";
      div.style.padding = "12px 16px";
      div.style.borderBottom = "1px solid rgba(0,0,0,0.06)";

      div.innerHTML = `
        <div style="display:flex;justify-content:space-between;">
          <span>${unidade.NOME_FANTASIA}</span>
          <span style="font-size:0.85rem;color:${SISREG_CONFIG.CORES.GRAY}">
            ${unidade.CODIGO_CNES}
          </span>
        </div>
      `;

      div.onclick = () => {
        unidadeInput.value = unidade.NOME_FANTASIA;
        unidadeSelecionada = unidade;
        listaUnidades.style.display = "none";
      };

      listaUnidades.appendChild(div);
    });

    listaUnidades.style.display = "block";
  });

  unidadeInput.addEventListener("blur", () => {
    setTimeout(() => listaUnidades.style.display = "none", 200);
  });

  // ==================== LOGIN ====================

  formLogin.addEventListener("submit", (e) => {
    e.preventDefault();

    const senha = document.getElementById("password")?.value || "";

    if (!unidadeSelecionada) {
      const nome = unidadeInput.value.trim();
      unidadeSelecionada = unidadesData.find(u => u.NOME_FANTASIA === nome);
    }

    if (!unidadeSelecionada) {
      loginError.textContent = "❌ Selecione uma unidade válida.";
      loginError.style.display = "block";
      return;
    }

    if (senha !== unidadeSelecionada.CODIGO_CNES) {
      loginError.textContent = SISREG_CONFIG.MENSAGENS.LOGIN_ERRO;
      loginError.style.display = "block";
      SisregUtils.showToast(SISREG_CONFIG.MENSAGENS.LOGIN_ERRO, "error");
      return;
    }

    // ==================== SESSÃO VÁLIDA ====================

    SisregUtils.setUnidade(
      unidadeSelecionada.NOME_FANTASIA,
      unidadeSelecionada.CODIGO_CNES
    );

    const isMaster = String(unidadeSelecionada.TIPO || "")
      .toUpperCase()
      .trim() === "MASTER";

    const btn = formLogin.querySelector("button[type='submit']");
    if (btn) SisregUtils.showLoading(btn, "Entrando...");

    const destino = isMaster
      ? "dashboard-master.html"
      : SISREG_CONFIG.PAGINAS.DASHBOARD;

    setTimeout(() => {
      SisregUtils.showToast(SISREG_CONFIG.MENSAGENS.LOGIN_SUCESSO, "success");
      window.location.href = destino;
    }, 600);
  });

  // ==================== LIMPAR ERROS ====================

  unidadeInput.addEventListener("input", () => {
    if (loginError) loginError.style.display = "none";
  });

  document.getElementById("password")?.addEventListener("input", () => {
    if (loginError) loginError.style.display = "none";
  });

});
