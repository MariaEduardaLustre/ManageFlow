 #   <img width="511" height="276" alt="image" src="https://github.com/user-attachments/assets/7bd6c4e9-3689-4760-8a40-00bfa77f138b" />

![Status do Projeto](https://img.shields.io/badge/Status-Concluído%20(TCC)-brightgreen)

Sistema web para gestão de filas de espera em estabelecimentos (restaurantes/bebidas), focado em otimizar a operação e a experiência do cliente. 

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

O ManageFlow é um sistema projetado para organizar e agilizar o fluxo de clientes em estabelecimentos com alta demanda. O seu principal objetivo é reduzir o tempo de espera percebido, automatizar o processo de chamada e fornecer indicadores de gestão para os administradores do negócio. 

O sistema é composto por uma aplicação administrativa (para o staff) e páginas públicas para os clientes (entrar na fila e painel digital). 

### ✨ Principais Funcionalidades

- **Gestão de Filas:** Organiza clientes em filas de espera por empresa ou filial.
- **Entrada na Fila (Pública):** Clientes podem registar-se numa página pública e receber a sua posição e tempo estimado. 
- **Chamada de Cliente:** O staff pode chamar o próximo cliente, atualizando o status de "AGUARDANDO" para "CHAMADO". 
- **Painel Digital em Tempo Real:** Uma tela pública que exibe as chamadas em tempo real, utilizando Websocket. 
- **Confirmação de Presença:** Funcionalidade opcional que exige que o cliente confirme a presença (via link ou geolocalização) após ser chamado, para evitar "no-shows". 
- **Gestão de Papéis (RBAC):** Controlo de acesso por perfis (ADM, STAFF, ANALYST, CUSTOMER). 
- **Relatórios e Indicadores:** Métricas de tempo médio de espera, desistências e volume de atendimento. 
- **Configuração de Empresas:** Cadastro de empresas e upload de logos/banners para o AWS S3. 

---

### 🛠️ Arquitetura e Tecnologias

O projeto segue um padrão cliente-servidor com uma API RESTful e comunicação em tempo real.

| Componente | Tecnologia Utilizada |
| :--- | :--- |
| **Backend (API)** | Node.js com Express |
| **Frontend** | React (com React Router e Axios) |
| **Banco de Dados** | MySQL  |
| **Tempo Real** | Websocket |
| **Autenticação** | JSON Web Tokens (JWT)  |
| **Armazenamento de Ficheiros** | AWS S3 (para logos, banners, etc.)  |
| **Arquitetura Backend** | Camadas: Controller → Service → Repository  |

---

### 🏁 Como Começar (Instalação)

Siga estes passos para configurar e executar o projeto localmente.

#### Pré-requisitos

- [Node.js](https://nodejs.org/) (v16 ou superior)
- [NPM](https://www.npmjs.com/) ou [Yarn](https://yarnpkg.com/)
- Um servidor de banco de dados [MySQL](https://www.mysql.com/)
- (Opcional) Credenciais de um bucket AWS S3 para upload de imagens 

#### 1. Backend (API)

```bash
# 1. Clone o repositório
git clone [https://github.com/Maria](https://github.com/Maria) Eduarda Lustre/ManageFlow.git 

# 2. Navegue para a pasta do backend (ajuste o nome da pasta se necessário)
cd ManageFlow/backend

# 3. Instale as dependências
npm install

