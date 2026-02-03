SISREG Escalas
Sistema web para gestão de escalas, oferta de vagas e análise de indicadores do SISREG, com
suporte a múltiplas unidades e perfil MASTER (gestor).

Principais Funcionalidades
- Login por unidade (CNES)
- Dashboard analítico com gráficos e KPIs
- Dashboard MASTER com consolidação de todas as unidades
- Gestão e cálculo automático de vagas por vigência
- Identificação de vagas de retorno e primeira vez
- Exportação de dados e relatórios

Arquitetura
- Frontend: HTML, CSS, JavaScript puro
- Backend: Google Apps Script (API)
- Armazenamento local: LocalStorage
- Visualização: Chart.js e D3.js

Controle de Acesso
- Sessão baseada em LocalStorage
- Bloqueio de páginas por perfil (USER / MASTER)
- Proteção contra acesso direto por URL

Estrutura de Arquivos
- index.html (Login)
- dashboard.html (Unidade)
- dashboard-master.html (Gestor)
- escalas.html (Gestão de escalas)
- js/config.js (Configuração central)

Autor
Desenvolvido por Euripedes Javeras
