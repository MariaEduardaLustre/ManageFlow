import React, { useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import { useNavigate } from "react-router-dom";
import "./Empresa.css";

const initialEmpresa = {
  nome: "",
  cnpj: "",
  email: "",
  ddi: "",
  ddd: "",
  telefone: "",
  endereco: "",
  numero: "",
  logo: "",
};

const Empresa = ({ idUsuario }) => {
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [novaEmpresa, setNovaEmpresa] = useState(initialEmpresa);
  const [submitting, setSubmitting] = useState(false);
  const [busca, setBusca] = useState("");
  const [ordenacao, setOrdenacao] = useState("nomeAsc");

  // use um nome diferente para o caminho do logo para não conflitar com o campo "logo" do form
  const logoSrc = "/imagens/logo.png";

  const navigate = useNavigate();

  // Resolva o id do usuário: prop > localStorage
  const userId = useMemo(() => {
    const fromProp = Number(idUsuario);
    if (fromProp) return fromProp;
    const fromStorage = Number(localStorage.getItem("idUsuario"));
    return Number.isFinite(fromStorage) ? fromStorage : null;
  }, [idUsuario]);

  // Hidratamos com cache (se existir) e também buscamos do backend
  useEffect(() => {
    let ativo = true;

    // 1) hidrata com cache para render rápido
    const cache = sessionStorage.getItem("empresasDoUsuario");
    if (cache) {
      try {
        const parsed = JSON.parse(cache);
        if (Array.isArray(parsed)) {
          setEmpresas(parsed);
          setLoading(false); // já mostra algo enquanto atualiza em background
        }
      } catch {}
    }

    // 2) se não tiver userId, volta pro login
    if (!userId) {
      setLoading(false);
      navigate("/login");
      return;
    }

    // 3) busca oficial
    async function fetchEmpresas() {
      // se já carregou do cache, não precisa mostrar loading forte
      if (!cache) setLoading(true);
      setErro("");

      try {
        const resp = await api.get(`/empresas/empresas-do-usuario/${userId}`);
        if (!ativo) return;
        const list = Array.isArray(resp.data) ? resp.data : [];
        setEmpresas(list);
        // atualiza cache
        sessionStorage.setItem("empresasDoUsuario", JSON.stringify(list));
      } catch (error) {
        console.error("Erro ao buscar empresas", error);
        if (!ativo) return;
        setErro("Não foi possível carregar as empresas. Tente novamente.");
      } finally {
        if (ativo) setLoading(false);
      }
    }

    fetchEmpresas();
    return () => {
      ativo = false;
    };
  }, [userId, navigate]);

  const escolherEmpresa = (empresa) => {
    localStorage.setItem("empresaSelecionada", JSON.stringify(empresa));
    navigate("/home");
  };

  // Validações simples
  const errosForm = useMemo(() => {
    const e = {};
    if (!novaEmpresa.nome?.trim()) e.nome = "Informe o nome da empresa.";
    if (!novaEmpresa.cnpj?.trim()) e.cnpj = "Informe o CNPJ.";
    if (!/^\d{14}$/.test(novaEmpresa.cnpj.replace(/\D/g, "")))
      e.cnpj = "CNPJ deve ter 14 dígitos (apenas números).";
    if (!novaEmpresa.email?.trim()) e.email = "Informe o e-mail.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(novaEmpresa.email))
      e.email = "E-mail inválido.";
    return e;
  }, [novaEmpresa]);

  const podeSalvar = Object.keys(errosForm).length === 0;

  const handleCriar = async () => {
    if (!podeSalvar) return;
    setSubmitting(true);
    try {
      const { nome, cnpj, email, ddi, ddd, telefone, endereco, numero, logo } = novaEmpresa;

      const idUsuarioStorage = userId;

      const response = await api.post("/empresas/criar-empresa", {
        nomeEmpresa: nome,
        cnpj: cnpj.replace(/\D/g, ""),
        email,
        ddi,
        ddd,
        telefone,
        endereco,
        numero,
        logo,
        idUsuario: idUsuarioStorage,
      });

      const idEmpresa = response?.data?.idEmpresa;
      if (!idEmpresa) {
        throw new Error("Resposta inválida da API (idEmpresa ausente).");
      }

      const novaSelecionavel = {
        ID_EMPRESA: idEmpresa,
        NOME_EMPRESA: nome,
        NOME_PERFIL: "Administrador",
        NIVEL: 1,
        LOGO: logo,
      };

      escolherEmpresa(novaSelecionavel);
    } catch (error) {
      console.error("Erro ao criar empresa", error);
      alert("Erro ao criar empresa. Verifique os dados e tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEnter = (e) => {
    if (e.key === "Enter") handleCriar();
  };

  const listaFiltrada = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    let base = empresas;

    if (termo) {
      base = empresas.filter((emp) =>
        `${emp.NOME_EMPRESA ?? ""} ${emp.NOME_PERFIL ?? ""}`.toLowerCase().includes(termo)
      );
    }

    const ordenadores = {
      nomeAsc: (a, b) => (a.NOME_EMPRESA ?? "").localeCompare(b.NOME_EMPRESA ?? ""),
      nomeDesc: (a, b) => (b.NOME_EMPRESA ?? "").localeCompare(a.NOME_EMPRESA ?? ""),
      nivelAsc: (a, b) => (a.NIVEL ?? 0) - (b.NIVEL ?? 0),
      nivelDesc: (a, b) => (b.NIVEL ?? 0) - (a.NIVEL ?? 0),
    };

    return [...base].sort(ordenadores[ordenacao]);
  }, [empresas, busca, ordenacao]);

  const avatar = (nome, logoUrl) => {
    if (logoUrl) {
      return (
        <img
          src={logoUrl}
          alt={nome}
          className="empresa-card__logo"
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
      );
    }
    const iniciais = (nome || "?")
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
    return <div className="empresa-card__avatar" aria-hidden>{iniciais}</div>;
  };

  return (
    <div className="empresa">
      {/* NAVBAR fixa ao topo */}
      <nav className="navbar navbar-expand-lg navbar-light bg-white fixed-top flow-header shadow-sm">
        <div className="container">
          <a className="navbar-brand" href="#home">
            <img src={logoSrc} alt="Manage Flow Logo" className="flow-logo" />
          </a>
        </div>
      </nav>

      {/* TÍTULO + FILTROS */}
      <section className="empresa__heading">
        <h1 className="empresa__title">Selecione sua empresa</h1>
        <p className="empresa__subtitle">
          Entre em uma empresa existente ou crie uma nova para começar.
        </p>

        <div className="empresa__actions">
          <div className="input-search">
            <input
              type="search"
              placeholder="Buscar por nome ou perfil…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              aria-label="Buscar empresa"
            />
          </div>

          <select
            className="select"
            value={ordenacao}
            onChange={(e) => setOrdenacao(e.target.value)}
            aria-label="Ordenar lista"
          >
            <option value="nomeAsc">Nome (A–Z)</option>
            <option value="nomeDesc">Nome (Z–A)</option>
            <option value="nivelAsc">Nível (menor → maior)</option>
            <option value="nivelDesc">Nível (maior → menor)</option>
          </select>

          <button
            className="btn btn-primary"
            onClick={() => setMostrarFormulario((v) => !v)}
            aria-expanded={mostrarFormulario}
          >
            {mostrarFormulario ? "Fechar formulário" : "Criar nova empresa"}
          </button>
        </div>
      </section>

      {/* Estado de erro */}
      {erro && <div className="alert alert-error" role="alert">{erro}</div>}

      {/* Lista / Loading / Vazio */}
      {loading ? (
        <div className="empresa-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="empresa-card empresa-card--skeleton" />
          ))}
        </div>
      ) : listaFiltrada.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon" aria-hidden>🏷️</div>
          <h3>Nenhuma empresa encontrada</h3>
          <p>Você pode ajustar a busca ou criar uma nova empresa.</p>
        </div>
      ) : (
        <div className="empresa-grid">
          {listaFiltrada.map((empresa) => (
            <article
              key={empresa.ID_EMPRESA}
              className="empresa-card"
              tabIndex={0}
              role="button"
              onClick={() => escolherEmpresa(empresa)}
              onKeyDown={(e) => e.key === "Enter" && escolherEmpresa(empresa)}
            >
              {avatar(empresa.NOME_EMPRESA, empresa.LOGO)}
              <div className="empresa-card__body">
                <h3 className="empresa-card__title">{empresa.NOME_EMPRESA}</h3>
                <p className="empresa-card__meta">
                  {empresa.NOME_PERFIL ?? "Perfil"} • Nível {empresa.NIVEL ?? "—"}
                </p>
              </div>
              <div className="empresa-card__footer">
                <button
                  className="btn btn-ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    escolherEmpresa(empresa);
                  }}
                >
                  Entrar
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Formulário de criação */}
      {mostrarFormulario && (
        <section className="drawer">
          <div className="drawer__content" onKeyDown={handleEnter}>
            <header className="drawer__header">
              <h2>Criar nova empresa</h2>
            </header>

            <div className="form-grid">
              <div className="form-field">
                <label>Nome da empresa *</label>
                <input
                  type="text"
                  placeholder="Ex.: Tech LTDA"
                  value={novaEmpresa.nome}
                  onChange={(e) => setNovaEmpresa({ ...novaEmpresa, nome: e.target.value })}
                />
                {errosForm.nome && <span className="field-error">{errosForm.nome}</span>}
              </div>

              <div className="form-field">
                <label>CNPJ (14 dígitos) *</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Somente números"
                  maxLength={18}
                  value={novaEmpresa.cnpj}
                  onChange={(e) => {
                    const onlyDigits = e.target.value.replace(/\D/g, "").slice(0, 14);
                    setNovaEmpresa({ ...novaEmpresa, cnpj: onlyDigits });
                  }}
                />
                {errosForm.cnpj && <span className="field-error">{errosForm.cnpj}</span>}
              </div>

              <div className="form-field">
                <label>E-mail *</label>
                <input
                  type="email"
                  placeholder="contato@empresa.com"
                  value={novaEmpresa.email}
                  onChange={(e) => setNovaEmpresa({ ...novaEmpresa, email: e.target.value })}
                />
                {errosForm.email && <span className="field-error">{errosForm.email}</span>}
              </div>

              <div className="form-field">
                <label>DDI</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="55"
                  value={novaEmpresa.ddi}
                  onChange={(e) =>
                    setNovaEmpresa({ ...novaEmpresa, ddi: e.target.value.replace(/\D/g, "").slice(0, 3) })
                  }
                />
              </div>

              <div className="form-field">
                <label>DDD</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="11"
                  value={novaEmpresa.ddd}
                  onChange={(e) =>
                    setNovaEmpresa({ ...novaEmpresa, ddd: e.target.value.replace(/\D/g, "").slice(0, 3) })
                  }
                />
              </div>

              <div className="form-field">
                <label>Telefone</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="999999999"
                  value={novaEmpresa.telefone}
                  onChange={(e) =>
                    setNovaEmpresa({ ...novaEmpresa, telefone: e.target.value.replace(/\D/g, "").slice(0, 11) })
                  }
                />
              </div>

              <div className="form-field form-field--col2">
                <label>Endereço</label>
                <input
                  type="text"
                  placeholder="Rua, bairro, cidade"
                  value={novaEmpresa.endereco}
                  onChange={(e) => setNovaEmpresa({ ...novaEmpresa, endereco: e.target.value })}
                />
              </div>

              <div className="form-field">
                <label>Número</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="123"
                  value={novaEmpresa.numero}
                  onChange={(e) =>
                    setNovaEmpresa({ ...novaEmpresa, numero: e.target.value.replace(/\D/g, "").slice(0, 6) })
                  }
                />
              </div>

              <div className="form-field form-field--col2">
                <label>Logo (URL)</label>
                <input
                  type="url"
                  placeholder="https://.../logo.png"
                  value={novaEmpresa.logo}
                  onChange={(e) => setNovaEmpresa({ ...novaEmpresa, logo: e.target.value })}
                />
              </div>
            </div>

            <footer className="drawer__footer">
              <button
                className="btn"
                onClick={() => {
                  setNovaEmpresa(initialEmpresa);
                  setMostrarFormulario(false);
                }}
                disabled={submitting}
              >
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCriar}
                disabled={!podeSalvar || submitting}
              >
                {submitting ? "Salvando..." : "Salvar e entrar"}
              </button>
            </footer>
          </div>
        </section>
      )}
    </div>
  );
};

export default Empresa;
