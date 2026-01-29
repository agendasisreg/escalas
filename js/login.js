// js/login.js

document.addEventListener("DOMContentLoaded", () => {
    const inputBusca = document.getElementById("unidadeBusca");
    const listaSugestoes = document.getElementById("listaSugestoes");
    const cnesHidden = document.getElementById("cnesSelecionado");
    const formLogin = document.getElementById("formLogin");
    const loginError = document.getElementById("loginError");
    
    let unidadesData = [];

    // 1. Carregar unidades do arquivo JSON 
    fetch("data/unidades.json")
        .then(response => response.json())
        .then(data => {
            unidadesData = Array.isArray(data) ? data : [];
        })
        .catch(err => {
            console.error("Erro ao carregar unidades:", err);
            loginError.textContent = "Erro técnico ao carregar dados das unidades.";
        });

    // 2. Lógica de Busca em Tempo Real
    inputBusca.addEventListener("input", (e) => {
        const termo = e.target.value.toLowerCase();
        listaSugestoes.innerHTML = "";
        
        if (termo.length < 2) {
            listaSugestoes.style.display = "none";
            return;
        }

        const filtrados = unidadesData.filter(u => 
            (u.unidade && u.unidade.toLowerCase().includes(termo)) || 
            (u.cnes && u.cnes.includes(termo))
        ).slice(0, 6); // Limita a 6 resultados para manter o visual limpo

        if (filtrados.length > 0) {
            filtrados.forEach(u => {
                const item = document.createElement("div");
                item.textContent = u.unidade;
                item.onclick = () => {
                    inputBusca.value = u.unidade;
                    cnesHidden.value = u.cnes;
                    listaSugestoes.style.display = "none";
                    loginError.textContent = "";
                };
                listaSugestoes.appendChild(item);
            });
            listaSugestoes.style.display = "block";
        } else {
            listaSugestoes.style.display = "none";
        }
    });

    // Fechar lista ao clicar fora
    document.addEventListener("click", (e) => {
        if (e.target !== inputBusca) listaSugestoes.style.display = "none";
    });

    // 3. Processar Login [cite: 23, 24]
    formLogin.addEventListener("submit", (e) => {
        e.preventDefault();
        const cnesAlvo = cnesHidden.value;
        const senhaDigitada = document.getElementById("password").value;

        if (!cnesAlvo) {
            loginError.textContent = "Por favor, selecione uma unidade da lista.";
            return;
        }

        // Validação: Senha é o CNES [cite: 23]
        if (senhaDigitada === cnesAlvo) {
            localStorage.setItem("unidade_selecionada", inputBusca.value);
            localStorage.setItem("cnes_logado", cnesAlvo);
            localStorage.setItem("logado", "true");
            
            window.location.href = "dashboard.html"; // [cite: 24]
        } else {
            loginError.textContent = "Código CNES incorreto para esta unidade.";
        }
    });
});
