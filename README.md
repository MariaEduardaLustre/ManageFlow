# 🚀 ManageFlow

![Status do Projeto](https://img.shields.io/badge/Status-Concluído%20(TCC)-brightgreen)

[cite_start]Sistema web para gestão de filas de espera em estabelecimentos (restaurantes/bebidas), focado em otimizar a operação e a experiência do cliente. 

---

### 📖 Índice

- [Sobre o Projeto](#-sobre-o-projeto)
- [Principais Funcionalidades](#-principais-funcionalidades)
- [Arquitetura e Tecnologias](#-arquitetura-e-tecnologias)
- [Como Começar (Instalação)](#-como-começar-instalação)
  - [Pré-requisitos](#pré-requisitos)
  - [Backend (API)](#backend-api)
  - [Frontend (Web)](#frontend-web)
- [Guia de Uso](#-guia-de-uso)
- [Autor](#-autor)

---

### 🎯 Sobre o Projeto

[cite_start]O ManageFlow é um sistema projetado para organizar e agilizar o fluxo de clientes em estabelecimentos com alta demanda. [cite: 13, 18] [cite_start]O seu principal objetivo é reduzir o tempo de espera percebido, automatizar o processo de chamada e fornecer indicadores de gestão para os administradores do negócio. 

[cite_start]O sistema é composto por uma aplicação administrativa (para o staff) e páginas públicas para os clientes (entrar na fila e painel digital). [cite: 24]

### ✨ Principais Funcionalidades

- [cite_start]**Gestão de Filas:** Organiza clientes em filas de espera por empresa ou filial. [cite: 18]
- [cite_start]**Entrada na Fila (Pública):** Clientes podem registar-se numa página pública e receber a sua posição e tempo estimado. [cite: 64, 185]
- [cite_start]**Chamada de Cliente:** O staff pode chamar o próximo cliente, atualizando o status de "AGUARDANDO" para "CHAMADO". [cite: 64, 227]
- [cite_start]**Painel Digital em Tempo Real:** Uma tela pública que exibe as chamadas em tempo real, utilizando Socket.IO. [cite: 20, 27, 64, 272]
- [cite_start]**Confirmação de Presença:** Funcionalidade opcional que exige que o cliente confirme a presença (via link ou geolocalização) após ser chamado, para evitar "no-shows". [cite: 7, 73, 74, 83]
- [cite_start]**Gestão de Papéis (RBAC):** Controlo de acesso por perfis (ADM, STAFF, ANALYST, CUSTOMER). [cite: 21, 65]
- [cite_start]**Relatórios e Indicadores:** Métricas de tempo médio de espera, desistências e volume de atendimento. [cite: 64]
- [cite_start]**Configuração de Empresas:** Cadastro de empresas e upload de logos/banners para o AWS S3. [cite: 64, 28]

---

### 🛠️ Arquitetura e Tecnologias

O projeto segue um padrão cliente-servidor com uma API RESTful e comunicação em tempo real.

| Componente | Tecnologia Utilizada |
| :--- | :--- |
| **Backend (API)** | [cite_start]Node.js [cite: 25] [cite_start]com Express [cite: 39] |
| **Frontend** | [cite_start]React (com React Router e Axios) [cite: 24, 35] |
| **Banco de Dados** | [cite_start]MySQL [cite: 26, 49] |
| **Tempo Real** | [cite_start]Socket.IO [cite: 27, 46] |
| **Autenticação** | [cite_start]JSON Web Tokens (JWT) [cite: 25, 44] |
| **Armazenamento de Ficheiros** | [cite_start]AWS S3 (para logos, banners, etc.) [cite: 28, 47] |
| **Arquitetura Backend** | [cite_start]Camadas: Controller → Service → Repository [cite: 32, 40] |

---

### 🏁 Como Começar (Instalação)

Siga estes passos para configurar e executar o projeto localmente.

#### Pré-requisitos

- [Node.js](https://nodejs.org/) (v16 ou superior)
- [NPM](https://www.npmjs.com/) ou [Yarn](https://yarnpkg.com/)
- Um servidor de banco de dados [MySQL](https://www.mysql.com/)
- (Opcional) [cite_start]Credenciais de um bucket AWS S3 para upload de imagens [cite: 28, 47]

#### 1. Backend (API)

```bash
# 1. Clone o repositório
[cite_start]git clone [https://github.com/Maria](https://github.com/Maria) Eduarda Lustre/ManageFlow.git 

# 2. Navegue para a pasta do backend (ajuste o nome da pasta se necessário)
cd ManageFlow/backend

# 3. Instale as dependências
npm install

