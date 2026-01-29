// js/login.js

document.addEventListener("DOMContentLoaded", () => {
    const inputBusca = document.getElementById("unidadeBusca");
    const listaSugestoes = document.getElementById("listaSugestoes");
    const cnesHidden = document.getElementById("cnesSelecionado");
    const formLogin = document.getElementById("formLogin");
    const loginError = document.getElementById("loginError");
    
    let unidadesData = [];

    // 1. Carregar unidades do arquivo JSON gerado pelo script
    fetch("data/unidades.json")
        .then(response => {
            if (!response.ok) throw new Error("Não foi possível ler o arquivo data/unidades.json");
            return response.json();
        })
        .then(data => {
            unidadesData = Array.isArray(data) ? data : [];
            console.log("Unidades carregadas com sucesso:", unidadesData.length);
        })
        .catch(err => {
            console.error("Erro Crítico:", err);
            loginError.textContent = "Erro ao carregar banco de dados. Verifique a pasta data/.";
            loginError.style.display = "block";
        });

    // 2. Lógica da Lista de Sugestões (Aparece ao digitar)
    inputBusca.addEventListener("input", (e) => {
        const termo = e.target.value.toLowerCase().trim();
        listaSugestoes.innerHTML = "";
        
        if (termo.length < 2) {
            listaSugestoes.style.display = "none";
            return;
        }

        // Filtra comparando com NOME_FANTASIA conforme seu script de conversão
        const filtrados = unidadesData.filter(u => 
            (u.NOME_FANTASIA && u.NOME_FANTASIA.toLowerCase().includes(termo)) || 
            (u.CODIGO_CNES && u.CODIGO_CNES.includes(termo))
        ).slice(0, 8); 

        if (filtrados.length > 0) {
            filtrados.forEach(u => {
                const item = document.createElement("div");
                item.style.padding = "10px";
                item.style.cursor = "pointer";
                item.style.borderBottom = "1px solid #eee";
                item.textContent = u.NOME_FANTASIA;
                
                item.addEventListener("click", () => {
                    inputBusca.value = u.NOME_FANTASIA;
                    cnesHidden.value = u.CODIGO_CNES;
                    listaSugestoes.style.display = "none";
                    loginError.textContent = "";
                });
                listaSugestoes.appendChild(item);
            });
            listaSugestoes.style.display = "block";
        } else {
            listaSugestoes.style.display = "none";
        }
    });

    // Fecha a lista se clicar fora do campo
    document.addEventListener("click", (e) => {
        if (e.target !== inputBusca) {
            listaSugestoes.style.display = "none";
        }
    });

    // 3. Validação do Login
    formLogin.addEventListener("submit", (e) => {
        e.preventDefault();
        
        const cnesAlvo = cnesHidden.value;
        const senhaDigitada = document.getElementById("password").value.trim();

        if (!cnesAlvo) {
            loginError.textContent = "Selecione uma unidade da lista para continuar.";
            loginError.style.display = "block";
            return;
        }

        // A senha deve ser exatamente o CODIGO_CNES
        if (senhaDigitada === cnesAlvo) {
            localStorage.setItem("unidade_selecionada", inputBusca.value);
            localStorage.setItem("cnes_logado", cnesAlvo);
            localStorage.setItem("logado", "true");
            
            // Só avançamos quando você autorizar, mas o link já fica pronto
            window.location.href = "dashboard.html";
        } else {
            loginError.textContent = "Senha incorreta (CNES inválido).";
            loginError.style.display = "block";
        }
    });
});
