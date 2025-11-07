// src/pages/Empresa/Empresa.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import { useNavigate } from "react-router-dom";
import "./Empresa.css";
import ThemeToggleButton from "../ThemeToggleButton/ThemeToggleButton"; // ✨

const initialEmpresa = {
  nome: "",
  cnpj: "",
  email: "",
  ddi: "",
  ddd: "",
  telefone: "",
  endereco: "",
  numero: "",
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
  const [fetchingPerm, setFetchingPerm] = useState(false);

  // Upload/preview da logo
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");

  // Erros do servidor por campo (iguais em UX)
  const [serverEmailError, setServerEmailError] = useState("");
  const [serverCnpjError, setServerCnpjError] = useState("");

  const logoSrc = "/imagens/logo.png";
  const navigate = useNavigate();

  const userId = useMemo(() => {
    const fromProp = Number(idUsuario);
    if (fromProp) return fromProp;
    const fromStorage = Number(localStorage.getItem("idUsuario"));
    return Number.isFinite(fromStorage) ? fromStorage : null;
  }, [idUsuario]);

  useEffect(() => {
    let ativo = true;
    const cache = sessionStorage.getItem("empresasDoUsuario");
    if (cache) {
      try {
        const parsed = JSON.parse(cache);
        if (Array.isArray(parsed)) {
          setEmpresas(parsed);
          setLoading(false);
        }
      } catch {}
    }
    if (!userId) {
      setLoading(false);
      navigate("/login");
      return;
    }
    async function fetchEmpresas() {
      if (!cache) setLoading(true);
      setErro("");
      try {
        const resp = await api.get(`/empresas/empresas-do-usuario/${userId}`);
        if (!ativo) return;
        const list = Array.isArray(resp.data) ? resp.data : [];
        setEmpresas(list);
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

  const getTargetRoute = (role, nivel) => {
    const r = (role || "").toUpperCase();
    const n = Number(nivel);
    if (r === "ANALYST" || n === 3) return "/dashboard";
    return "/home";
  };

  const escolherEmpresa = async (empresa) => {
    try {
      setFetchingPerm(true);
      const { data } = await api.get("/me/permissions", {
        params: { empresaId: empresa.ID_EMPRESA },
      });

      const payload = {
        ...empresa,
        ROLE: data.role,
        PERMISSIONS: data.permissions,
        NOME_PERFIL: data.nomePerfil ?? empresa.NOME_PERFIL,
        NIVEL: data.nivel ?? empresa.NIVEL,
        ID_PERFIL: data.idPerfil,
      };

      localStorage.setItem("empresaSelecionada", JSON.stringify(payload));
      navigate(getTargetRoute(payload.ROLE, payload.NIVEL));
    } catch (e) {
      console.error("Falha ao obter permissões", e);
      localStorage.setItem("empresaSelecionada", JSON.stringify(empresa));
      navigate(getTargetRoute(empresa.ROLE, empresa.NIVEL));
    } finally {
      setFetchingPerm(false);
    }
  };

  const errosForm = useMemo(() => {
    const e = {};
    if (!novaEmpresa.nome?.trim()) e.nome = "Informe o nome da empresa.";
    if (!novaEmpresa.cnpj?.trim()) e.cnpj = "Informe o CNPJ.";
    if (!/^\d{14}$/.test((novaEmpresa.cnpj || "").replace(/\D/g, "")))
      e.cnpj = "CNPJ deve ter 14 dígitos (apenas números).";
    if (!novaEmpresa.email?.trim()) e.email = "Informe o e-mail.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(novaEmpresa.email))
      e.email = "E-mail inválido.";
    return e;
  }, [novaEmpresa]);

  const podeSalvar = Object.keys(errosForm).length === 0;

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    setLogoFile(file || null);
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setLogoPreview(reader.result);
      reader.readAsDataURL(file);
    } else {
      setLogoPreview("");
    }
  };

  const handleCriar = async () => {
    if (!podeSalvar || !userId) return;
    setSubmitting(true);
    setServerEmailError("");
    setServerCnpjError("");
    try {
      const { nome, cnpj, email, ddi, ddd, telefone, endereco, numero } =
        novaEmpresa;

      const response = await api.post("/empresas/criar-empresa", {
        nomeEmpresa: nome,
        cnpj: (cnpj || "").replace(/\D/g, ""),
        email,
        ddi,
        ddd,
        telefone,
        endereco,
        numero,
        logo: null,
        idUsuario: userId,
      });

      const idEmpresa = response?.data?.idEmpresa;
      if (!idEmpresa) throw new Error("Resposta inválida da API (idEmpresa ausente).");

      // Upload da logo (opcional)
      let logoUrlSalva = "";
      if (logoFile) {
        try {
          const fd = new FormData();
          fd.append("img_perfil", logoFile);
          const up = await api.post(`/empresas/${idEmpresa}/perfil`, fd, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          logoUrlSalva = up?.data?.img_perfil || "";
        } catch (errUp) {
          console.warn("Empresa criada, mas falha ao subir logo:", errUp);
        }
      }

      const novaSelecionavel = {
        ID_EMPRESA: idEmpresa,
        NOME_EMPRESA: nome,
        NOME_PERFIL: "Administrador",
        NIVEL: 1,
        LOGO: logoUrlSalva || "",
      };

      await escolherEmpresa(novaSelecionavel);
    } catch (error) {
      console.error("Erro ao criar empresa", error);
      const status = error?.response?.status;
      const payload = error?.response?.data;

      if (status === 409) {
        if (payload?.field === "email" || payload?.error === "EMAIL_DUPLICADO") {
          setServerEmailError(
            payload?.message || "Já existe uma empresa registrada com este e-mail."
          );
          return;
        }
        if (payload?.field === "cnpj" || payload?.error === "CNPJ_DUPLICADO") {
          setServerCnpjError(
            payload?.message || "Já existe uma empresa registrada com este CNPJ."
          );
          return;
        }
      }

      setErro("Não foi possível criar a empresa. Verifique os dados e tente novamente.");
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
        `${emp.NOME_EMPRESA ?? ""} ${emp.NOME_PERFIL ?? ""}`
          .toLowerCase()
          .includes(termo)
      );
    }
    const ordenadores = {
      nomeAsc: (a, b) =>
        (a.NOME_EMPRESA ?? "").localeCompare(b.NOME_EMPRESA ?? ""),
      nomeDesc: (a, b) =>
        (b.NOME_EMPRESA ?? "").localeCompare(a.NOME_EMPRESA ?? ""),
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
          className="mf-emp-card__logo"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      );
    }
    const iniciais = (nome || "?")
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
    return (
      <div className="mf-emp-card__avatar" aria-hidden>
        {iniciais}
      </div>
    );
  };

  return (
    <div className="mf-emp">
      <nav className="navbar navbar-expand-lg navbar-light bg-white fixed-top mf-emp__header shadow-sm">
        <div className="container">
          <a className="navbar-brand" href="#home">
            <img src={logoSrc} alt="Manage Flow Logo" className="mf-emp__logo" />
          </a>
          <ThemeToggleButton />
        </div>
      </nav>

      <section className="mf-emp__heading">
        <h1 className="mf-emp__title">Selecione a sua empresa</h1>
        <p className="mf-emp__subtitle">
          Entre numa empresa existente ou crie uma nova para começar.
        </p>

        <div className="mf-emp__actions">
          <div className="mf-emp__search">
            <input
              type="search"
              placeholder="Procurar por nome ou perfil…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              aria-label="Procurar empresa"
            />
          </div>

          <select
            className="mf-emp__select"
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
            className="mf-emp__btn mf-emp__btn--primary"
            onClick={() => {
              setMostrarFormulario((v) => !v);
              setServerEmailError("");
              setServerCnpjError("");
              setErro("");
            }}
            aria-expanded={mostrarFormulario}
          >
            {mostrarFormulario ? "Fechar formulário" : "Criar nova empresa"}
          </button>
        </div>
      </section>

      {erro && (
        <div className="mf-emp__alert" role="alert">
          {erro}
        </div>
      )}

      {loading ? (
        <div className="mf-emp__grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="mf-emp-card mf-emp-card--skeleton" />
          ))}
        </div>
      ) : listaFiltrada.length === 0 ? (
        <div className="mf-emp__empty">
          <div className="mf-emp__empty-icon" aria-hidden>
            🏷️
          </div>
          <h3>Nenhuma empresa encontrada</h3>
          <p>Pode ajustar a pesquisa ou criar uma nova empresa.</p>
        </div>
      ) : (
        <div className="mf-emp__grid">
          {listaFiltrada.map((empresa) => (
            <article
              key={empresa.ID_EMPRESA}
              className="mf-emp-card"
              tabIndex={0}
              role="button"
              onClick={() => escolherEmpresa(empresa)}
              onKeyDown={(e) => e.key === "Enter" && escolherEmpresa(empresa)}
            >
              {avatar(empresa.NOME_EMPRESA, empresa.LOGO)}
              <div className="mf-emp-card__body">
                <h3 className="mf-emp-card__title">
                  {empresa.NOME_EMPRESA}
                </h3>
                <p className="mf-emp-card__meta">
                  {empresa.NOME_PERFIL ?? "Perfil"} • Nível{" "}
                  {empresa.NIVEL ?? "—"}
                </p>
              </div>
              <div className="mf-emp-card__footer">
                <button
                  className="mf-emp__btn mf-emp__btn--ghost"
                  disabled={fetchingPerm}
                  onClick={(e) => {
                    e.stopPropagation();
                    escolherEmpresa(empresa);
                  }}
                >
                  {fetchingPerm ? "A entrar..." : "Entrar"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {mostrarFormulario && (
        <section className="mf-emp__drawer">
          <div className="mf-emp__drawer-content" onKeyDown={handleEnter}>
            <header className="mf-emp__drawer-header">
              <h2>Criar nova empresa</h2>
            </header>

            <div className="mf-emp__form-grid">
              <div className="mf-emp__field">
                <label>Nome da empresa *</label>
                <input
                  type="text"
                  placeholder="Ex.: Tech LTDA"
                  value={novaEmpresa.nome}
                  onChange={(e) =>
                    setNovaEmpresa({ ...novaEmpresa, nome: e.target.value })
                  }
                />
                {errosForm.nome && (
                  <span className="mf-emp__field-error">{errosForm.nome}</span>
                )}
              </div>

              <div className="mf-emp__field">
                <label>CNPJ (14 dígitos) *</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Apenas números"
                  maxLength={18}
                  value={novaEmpresa.cnpj}
                  onChange={(e) => {
                    const onlyDigits = e.target.value.replace(/\D/g, "").slice(0, 14);
                    setNovaEmpresa({ ...novaEmpresa, cnpj: onlyDigits });
                    if (serverCnpjError) setServerCnpjError("");
                  }}
                  aria-invalid={!!serverCnpjError || !!errosForm.cnpj}
                  aria-describedby="cnpj-help cnpj-error"
                />
                {errosForm.cnpj && (
                  <span id="cnpj-error" className="mf-emp__field-error">
                    {errosForm.cnpj}
                  </span>
                )}
                {serverCnpjError && !errosForm.cnpj && (
                  <span id="cnpj-help" className="mf-emp__field-error">
                    {serverCnpjError}
                  </span>
                )}
              </div>

              <div className="mf-emp__field">
                <label>E-mail *</label>
                <input
                  type="email"
                  placeholder="contacto@empresa.com"
                  value={novaEmpresa.email}
                  onChange={(e) => {
                    setNovaEmpresa({ ...novaEmpresa, email: e.target.value });
                    if (serverEmailError) setServerEmailError("");
                  }}
                  aria-invalid={!!serverEmailError || !!errosForm.email}
                  aria-describedby="email-help email-error"
                />
                {errosForm.email && (
                  <span id="email-error" className="mf-emp__field-error">
                    {errosForm.email}
                  </span>
                )}
                {serverEmailError && !errosForm.email && (
                  <span id="email-help" className="mf-emp__field-error">
                    {serverEmailError}
                  </span>
                )}
              </div>

              <div className="mf-emp__field">
                <label>DDI</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="55"
                  value={novaEmpresa.ddi}
                  onChange={(e) =>
                    setNovaEmpresa({
                      ...novaEmpresa,
                      ddi: e.target.value.replace(/\D/g, "").slice(0, 3),
                    })
                  }
                />
              </div>

              <div className="mf-emp__field">
                <label>DDD</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="11"
                  value={novaEmpresa.ddd}
                  onChange={(e) =>
                    setNovaEmpresa({
                      ...novaEmpresa,
                      ddd: e.target.value.replace(/\D/g, "").slice(0, 3),
                    })
                  }
                />
              </div>

              <div className="mf-emp__field">
                <label>Telefone</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="999999999"
                  value={novaEmpresa.telefone}
                  onChange={(e) =>
                    setNovaEmpresa({
                      ...novaEmpresa,
                      telefone: e.target.value.replace(/\D/g, "").slice(0, 11),
                    })
                  }
                />
              </div>

              <div className="mf-emp__field mf-emp__field--col2">
                <label>Endereço</label>
                <input
                  type="text"
                  placeholder="Rua, bairro, cidade"
                  value={novaEmpresa.endereco}
                  onChange={(e) =>
                    setNovaEmpresa({ ...novaEmpresa, endereco: e.target.value })
                  }
                />
              </div>

              <div className="mf-emp__field">
                <label>Número</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="123"
                  value={novaEmpresa.numero}
                  onChange={(e) =>
                    setNovaEmpresa({
                      ...novaEmpresa,
                      numero: e.target.value.replace(/\D/g, "").slice(0, 6),
                    })
                  }
                />
              </div>

              {/* Upload da logo */}
              <div className="mf-emp__field mf-emp__field--col2">
                <label>Logo da empresa (imagem)</label>
                <div className="mf-emp__logo-upload">
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/jpg, image/webp"
                    onChange={handleLogoChange}
                    aria-label="Selecionar arquivo de imagem para a logo da empresa"
                  />
                  {logoPreview && (
                    <div className="mf-emp__logo-preview">
                      <img
                        src={logoPreview}
                        alt="Pré-visualização da logo"
                        style={{ width: 88, height: 88, objectFit: "cover", borderRadius: 12 }}
                      />
                      <button
                        type="button"
                        className="mf-emp__btn mf-emp__btn--ghost"
                        onClick={() => { setLogoFile(null); setLogoPreview(""); }}
                      >
                        Remover
                      </button>
                    </div>
                  )}
                </div>
                <small className="text-muted">
                  Formatos aceitos: PNG, JPG, WEBP. Tamanho máximo ~5–10MB (conforme backend).
                </small>
              </div>
            </div>

            <footer className="mf-emp__drawer-footer">
              <button
                className="mf-emp__btn"
                onClick={() => {
                  setNovaEmpresa(initialEmpresa);
                  setLogoFile(null);
                  setLogoPreview("");
                  setServerEmailError("");
                  setServerCnpjError("");
                  setMostrarFormulario(false);
                }}
                disabled={submitting}
              >
                Cancelar
              </button>
              <button
                className="mf-emp__btn mf-emp__btn--primary"
                onClick={handleCriar}
                disabled={!podeSalvar || submitting}
              >
                {submitting ? "A guardar..." : "Guardar e entrar"}
              </button>
            </footer>
          </div>
        </section>
      )}
    </div>
  );
};

export default Empresa;
