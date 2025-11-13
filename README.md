# ManageFlow – Gestão que flui, negócio que cresce

## 🌐 Sistema web para gerenciamento de filas de espera em estabelecimentos do ramo alimentício e de bebidas

---

## 🧭 Visão Geral

- **Objetivo**: reduzir o tempo de espera dos clientes e melhorar a organização interna dos estabelecimentos.  
- **Slogan**: _“Gestão que flui, negócio que cresce”_  
- **Tipo de solução**: aplicação web  
- **Público-alvo**: restaurantes, bares e similares de médio e grande porte.  

---

## 🧪 Protótipo

Veja o protótipo navegável do sistema:

📌 [Protótipo no Figma – ManageFlow](https://www.figma.com/design/q8IjhlXbrDxi6FRkJ1pT1J/ManageFlow?node-id=54-2&t=CsutAkp9eXL7qzyE-1)

---

## 🗂️ Dicionário de Dados

A estrutura das tabelas do banco de dados está documentada na planilha abaixo:

📊 [Dicionário de Dados – Google Planilhas](https://docs.google.com/spreadsheets/d/1WQ-retXVX1Ua1iJWaTbLA1Q7ztWhZIHunuzouF3o7oM/edit?usp=sharing)

---

## 🗂️ Documentação Online

A estrutura das tabelas do banco de dados está documentada na planilha abaixo:

📊 [Documentação ManageFlow](https://beatrizsakai.github.io/manageflow-docs/)

---

## 🧾 Funcionalidades principais

- Gerenciamento da fila em tempo real  
- Entrada e saída de clientes via aplicação web  
- Notificações automáticas (WhatsApp, SMS, e-mail)  
- Painel digital para exibição da fila no local (modo TV)  
- Relatórios e dashboards com indicadores de operação  
- Interface amigável e personalizável (logo, cores e mensagens do estabelecimento)

---

## ⚙️ Pré-requisitos

Para rodar o projeto localmente você vai precisar de:

- [Node.js](https://nodejs.org/) (versão 18+ recomendada)  
- npm (já vem com o Node)  
- [MySQL](https://www.mysql.com/) instalado e em execução  
- Acesso a um terminal (cmd, PowerShell, Git Bash, etc.)

---

## 🚀 Como rodar o projeto (desenvolvimento)

O repositório está organizado em duas pastas principais:

- `/back` – API (Node.js + Express + MySQL)  
- `/front` – Front-end (React)

### 1. Clonar o repositório

```bash
git clone https://github.com/MariaEduardaLustre/ManageFlow.git
cd ManageFlow
```
---

### 2. Configurar o banco de dados (MySQL)

1. Abra o MySQL (Workbench, DBeaver, terminal, etc.).
2. Crie o banco de dados e as tabelas necessárias, executando o script SQL disponibilizado no projeto (arquivo `.sql` correspondente ao banco do **ManageFlow**).
3. Lembre de ajustar o nome do banco no script (caso necessário) e usar o mesmo nome nas variáveis de ambiente do back-end.

---

### 3. Configurar e subir o back-end (API)

Acesse a pasta do back-end:

```bash
cd back
```

Instale as dependências:

```bash
npm install
```
Crie um arquivo .env na pasta back com as variáveis de ambiente básicas, por exemplo:

```env
PORT=3001

DB_HOST=localhost
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
DB_NAME=manageflow
DB_PORT=3306

JWT_SECRET=uma_senha_bem_secreta

PUBLIC_API_BASE_URL=http://localhost:3001
PUBLIC_FRONT_BASE_URL=http://localhost:3000
```

Suba o servidor do back-end:

```bash
npm start
```

---

### 4. Configurar o Front-end (/front)

Em outro terminal, volte para a raiz e entre na pasta do front:

```bash
cd ../front
```
Instale as dependências:

```bash
npm install
```

Crie um arquivo .env ou .env.local na pasta /front configurando a URL da API e do socket. Exemplo:

```bash
REACT_APP_API_BASE_URL=http://localhost:3001
REACT_APP_SOCKET_URL=http://localhost:3001
```
Suba o front-end:

```bash
npm start
```

**O front-end ficará disponível em:
👉 http://localhost:3000**
