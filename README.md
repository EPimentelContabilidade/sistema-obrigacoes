# Sistema de Obrigações Acessórias
### EPimentel Auditoria & Contabilidade Ltda — CRC/GO 026.994/O-8

Sistema para entrega automática de obrigações acessórias via **WhatsApp**, **E-mail** e **IA (Claude)**.

---

## 🚀 Início Rápido (Windows)

**Opção 1 — Automático:**
Dê dois cliques no arquivo `INICIAR.bat`

**Opção 2 — Manual:**
```
Backend:
  cd backend
  python -m venv venv
  venv\Scripts\activate
  pip install -r requirements.txt
  copy .env.example .env
  python main.py

Frontend (outro terminal):
  cd frontend
  npm install
  npm run dev
```

Acesse: http://localhost:5173

---

## ⚙️ Configuração (.env)

Edite o arquivo `backend\.env` com suas credenciais:

| Variável | Onde obter |
|---|---|
| `ANTHROPIC_API_KEY` | console.anthropic.com |
| `WHATSAPP_TOKEN` | developers.facebook.com |
| `WHATSAPP_PHONE_ID` | Meta for Developers |
| `EMAIL_USER` + `EMAIL_PASSWORD` | Conta Gmail + Senha de App |

---

## 📋 Funcionalidades

- ✅ Cadastro de clientes com regime tributário
- ✅ 12 tipos de obrigações pré-cadastrados (DAS, ISS, FGTS, RET, etc.)
- ✅ Geração de mensagens com IA (Claude)
- ✅ Envio via WhatsApp Business API
- ✅ Envio via E-mail (SMTP Gmail)
- ✅ Dashboard com estatísticas
- ✅ Histórico de entregas com reenvio
- ✅ Webhook para receber respostas do WhatsApp

---

## 📁 Estrutura

```
sistema_obrigacoes/
├── INICIAR.bat          ← Iniciar tudo com 1 clique
├── backend/
│   ├── main.py          ← Servidor FastAPI
│   ├── config.py        ← Configurações
│   ├── database.py      ← Banco de dados
│   ├── models/          ← Tabelas
│   ├── routers/         ← Endpoints da API
│   ├── services/        ← WhatsApp, E-mail, IA
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── api.js
    │   └── pages/       ← Dashboard, Clientes, Obrigações, Entregas
    ├── package.json
    └── vite.config.js
```

---

Desenvolvido para EPimentel Auditoria & Contabilidade Ltda
