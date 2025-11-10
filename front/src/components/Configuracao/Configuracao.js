// src/pages/FormularioConfiguracaoFila.js
import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import "./Configuracao.css";
import Menu from "../Menu/Menu";

const FormularioConfiguracaoFila = ({ onLogout }) => {
  const { id } = useParams();
  const navigate = useNavigate();

  const empresaSelecionada = JSON.parse(localStorage.getItem("empresaSelecionada"));
  const idEmpresa = empresaSelecionada?.ID_EMPRESA || null;

  const [formData, setFormData] = useState({
    id_empresa: idEmpresa,
    nome_fila: "",
    ini_vig: "",
    fim_vig: "",
    campos: {
      cpf: true,
      rg: false,
      telefone: true,
      endereco: false,
      data_nascimento: false,
      email: false,
      qtde_pessoas: false,
    },
    mensagem: "",
    img_banner: { url: "" },
    img_logo: { url: "" },
    temp_tol: "",
    qtde_min: "",
    qtde_max: "",
    per_sair: false,
    per_loc: false,
    situacao: 1,
  });

  const [loading, setLoading] = useState(true);
  const [mostrarModalSucesso, setMostrarModalSucesso] = useState(false);
  const [mensagemSucessoModal, setMensagemSucessoModal] = useState("");
  const [mostrarModalErro, setMostrarModalErro] = useState(false);
  const [mensagemErroModal, setMensagemErroModal] = useState("");

  const [linkConvite, setLinkConvite] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [tokenFila, setTokenFila] = useState("");

  // ===== Helpers =====
  const todayYmd = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return Number(`${y}${m}${day}`);
  }, []);

  const dentroDaVigencia = useMemo(() => {
    const ini = formData.ini_vig ? Number(String(formData.ini_vig).replace(/-/g, "")) : null;
    const fim = formData.fim_vig ? Number(String(formData.fim_vig).replace(/-/g, "")) : null;
    const okIni = ini == null || todayYmd >= ini;
    const okFim = fim == null || todayYmd <= fim;
    return okIni && okFim;
  }, [formData.ini_vig, formData.fim_vig, todayYmd]);

  const statusEfetivo = useMemo(() => {
    if (!dentroDaVigencia) return "Inativa (fora de vigência)";
    return formData.situacao === 1 ? "Ativa" : "Inativa";
  }, [formData.situacao, dentroDaVigencia]);

  // ===== Normalização dos CAMPO(S) recebidos do back =====
  const camposArrayParaMapa = (raw) => {
    const base = {
      cpf: true, // sempre true na edição
      rg: false,
      telefone: false,
      endereco: false,
      data_nascimento: false,
      email: false,
      qtde_pessoas: false,
    };

    // Se vier string JSON, tenta parsear
    try {
      if (typeof raw === "string") raw = JSON.parse(raw);
    } catch (e) {
      console.warn("campos veio como string mas não é JSON válido:", raw);
    }

    try {
      if (Array.isArray(raw)) {
        const map = { ...base };
        for (const item of raw) {
          const label = String(item?.campo || "").trim().toLowerCase();
          if (label === "rg") map.rg = true;
          else if (label === "telefone") map.telefone = true;
          else if (label === "endereco" || label === "endereço") map.endereco = true;
          else if (label === "data nascimento" || label === "data_de_nascimento" || label === "data de nascimento")
            map.data_nascimento = true;
          else if (label === "email" || label === "e-mail") map.email = true;
          else if (label === "qtde pessoas" || label === "quantidade pessoas" || label === "qtde_pessoas")
            map.qtde_pessoas = true;
          else if (label === "cpf") map.cpf = true;
        }
        return map;
      }

      if (raw && typeof raw === "object") {
        const normalizaChave = (k) =>
          String(k).toLowerCase().replace(/\s+/g, "_").replace(/[êéè]/g, "e").replace(/[ç]/g, "c");
        const map = { ...base };
        for (const [k, v] of Object.entries(raw)) {
          const nk = normalizaChave(k);
          if (v && nk in map) map[nk] = true;
        }
        return map;
      }
    } catch (e) {
      console.warn("Falha ao normalizar campos:", e);
    }

    return base;
  };

  // ===== Carregamento =====
  useEffect(() => {
    const fetchAll = async () => {
      if (!id) {
        setLoading(false);
        return;
      }
      try {
        // Usa a rota que você já tinha no front
        const { data } = await api.get(`/configuracao/configuracao-fila/${id}`);
        console.log("[GET configuracao-fila/:id] payload:", data);

        // Normaliza campos (array/obj/string)
        const camposMapa = camposArrayParaMapa(data.campos);

        // CPF sempre true no editor
        camposMapa.cpf = true;

        const loadedData = {
          id_conf_fila: data.id_conf_fila ?? data.ID_CONF_FILA ?? id,
          id_empresa: data.id_empresa ?? data.ID_EMPRESA ?? idEmpresa,
          nome_fila: data.nome_fila ?? data.nome ?? data.NOME_FILA ?? "",
          ini_vig: data.ini_vig ?? "",
          fim_vig: data.fim_vig ?? "",
          campos: camposMapa,
          mensagem: data.mensagem ?? data.MENSAGEM ?? "",
          img_banner: data.img_banner || { url: "" },
          img_logo: data.img_logo || { url: "" },
          temp_tol: data.temp_tol ?? data.TEMP_TOL ?? "",
          qtde_min: data.qtde_min ?? data.QDTE_MIN ?? "",
          qtde_max: data.qtde_max ?? data.QTDE_MAX ?? "",
          per_sair: !!(data.per_sair ?? data.PER_SAIR),
          per_loc: !!(data.per_loc ?? data.PER_LOC),
          situacao: Number.isFinite(Number(data.situacao ?? data.SITUACAO))
            ? Number(data.situacao ?? data.SITUACAO)
            : 1,
        };

        setFormData(loadedData);
      } catch (err) {
        console.error("Erro ao carregar configuração:", err?.response?.data || err.message, err);
        setMensagemErroModal("Erro ao carregar os dados. Faça login novamente se necessário.");
        setMostrarModalErro(true);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, idEmpresa]);

  // ===== Handlers =====
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      setFormData({ ...formData, [name]: checked });
    } else if (["temp_tol", "qtde_min", "qtde_max"].includes(name)) {
      setFormData({ ...formData, [name]: value === "" ? "" : Number(value) });
    } else if (name === "situacao") {
      setFormData({ ...formData, [name]: Number(value) });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleCamposChange = (e) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      campos: { ...prev.campos, [name]: checked },
    }));
  };

  const handleFileUpload = (e, fieldName) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({
        ...prev,
        [fieldName]: { url: reader.result, file },
      }));
    };
    reader.readAsDataURL(file);
  };

  // Converte o mapa para array [{campo, tipo}] antes de enviar
  const mapaParaCamposArray = (mapa) => {
    const arr = [];
    const push = (nome, tipo = "texto") => arr.push({ campo: nome, tipo });

    if (mapa.cpf) push("CPF", "numero");
    if (mapa.rg) push("Rg", "texto");
    if (mapa.telefone) push("Telefone", "texto");
    if (mapa.endereco) push("Endereco", "texto");
    if (mapa.data_nascimento) push("Data Nascimento", "data");
    if (mapa.email) push("Email", "email");
    if (mapa.qtde_pessoas) push("Qtde Pessoas", "numero");

    return arr;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.id_empresa) {
      setMensagemErroModal("Empresa não identificada. Faça login novamente.");
      setMostrarModalErro(true);
      return;
    }

    const dataToSend = { ...formData };

    // datas -> INT YYYYMMDD
    dataToSend.ini_vig = dataToSend.ini_vig ? parseInt(String(dataToSend.ini_vig).replace(/-/g, ""), 10) : null;
    dataToSend.fim_vig = dataToSend.fim_vig ? parseInt(String(dataToSend.fim_vig).replace(/-/g, ""), 10) : null;

    // campos -> array
    dataToSend.campos = mapaParaCamposArray(formData.campos);

    // imagens
    dataToSend.img_banner = dataToSend.img_banner?.url ? { url: dataToSend.img_banner.url } : { url: "" };
    dataToSend.img_logo = dataToSend.img_logo?.url ? { url: dataToSend.img_logo.url } : { url: "" };

    // booleanos -> tinyint
    dataToSend.per_sair = dataToSend.per_sair ? 1 : 0;
    dataToSend.per_loc = dataToSend.per_loc ? 1 : 0;

    // numéricos opcionais
    dataToSend.temp_tol = dataToSend.temp_tol === "" ? null : Number(dataToSend.temp_tol);
    dataToSend.qtde_min = dataToSend.qtde_min === "" ? null : Number(dataToSend.qtde_min);
    dataToSend.qtde_max = dataToSend.qtde_max === "" ? null : Number(dataToSend.qtde_max);
    dataToSend.situacao = Number(dataToSend.situacao);

    try {
      let resp;
      if (id) {
        resp = await api.put(`/configuracao/configuracao-fila/${id}`, dataToSend);
      } else {
        resp = await api.post("/configuracao/configuracao-fila", dataToSend);
      }

      const data = resp.data || {};
      if (!id) {
        setTokenFila(data.token_fila || "");
        setLinkConvite(data.join_url || "");
        setQrDataUrl(data.qr_data_url || "");
      }

      // aplica estado na fila do dia (não bloqueia fluxo em caso de erro)
      try {
        const idConf = Number(id || data.id_conf_fila || data.ID_CONF_FILA);
        if (idConf) {
          await api.post("/filas/apply-config", { idConfFila: idConf });
        }
      } catch (e2) {
        console.error("Falha ao aplicar estado da configuração na fila de hoje:", e2);
        setMensagemErroModal("Configuração salva, mas não foi possível refletir na fila de hoje.");
        setMostrarModalErro(true);
      }

      setMensagemSucessoModal(
        `Configuração de fila ${id ? "atualizada" : "cadastrada"} com sucesso!${
          !id && data.token_fila ? " Token: " + data.token_fila : ""
        }`
      );
      setMostrarModalSucesso(true);

      if (id || (!data.join_url && !data.qr_data_url)) {
        setTimeout(() => {
          setMostrarModalSucesso(false);
          navigate("/filas-cadastradas");
        }, 2000);
      }

      if (!id) {
        // reset
        setFormData({
          id_empresa: idEmpresa,
          nome_fila: "",
          ini_vig: "",
          fim_vig: "",
          campos: {
            cpf: true,
            rg: false,
            telefone: true,
            endereco: false,
            data_nascimento: false,
            email: false,
            qtde_pessoas: false,
          },
          mensagem: "",
          img_banner: { url: "" },
          img_logo: { url: "" },
          temp_tol: "",
          qtde_min: "",
          qtde_max: "",
          per_sair: false,
          per_loc: false,
          situacao: 1,
        });
      }
    } catch (err) {
      console.error("Erro ao salvar configuração:", err?.response?.data || err.message, err);
      const msg = err.response?.data || err.message || "Falha ao salvar.";
      setMensagemErroModal(typeof msg === "string" ? msg : JSON.stringify(msg));
      setMostrarModalErro(true);
    }
  };

  const fecharModalSucesso = () => {
    setMostrarModalSucesso(false);
    navigate("/filas-cadastradas");
  };
  const fecharModalErro = () => setMostrarModalErro(false);

  if (loading)
    return (
      <div className="dashboard-container">
        <Menu onLogout={onLogout} />
        <main className="main-content">
          <p>Carregando formulário...</p>
        </main>
      </div>
    );

  return (
    <div className="mf-config configuracao-fila">
      <Menu onLogout={onLogout} />
      <main className="mf-config-page">
        <div className="header">
          <button className="voltar-btn" onClick={() => navigate("/filas-cadastradas")}>
            ← Voltar
          </button>
          <div>
            <h2>{id ? "Editar Configuração de Fila" : "Configuração de Fila"}</h2>
            <p className="subtitle">
              Status efetivo: <strong>{statusEfetivo}</strong>
              {!dentroDaVigencia && " — ajuste a vigência para reativar."}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="section-card">
            <div className="group-inputs">
              <div className="input-field">
                <label>Tempo de tolerância</label>
                <input
                  type="number"
                  name="temp_tol"
                  value={formData.temp_tol}
                  onChange={handleChange}
                  placeholder="Ex: 5"
                />
                <span>minutos</span>
              </div>
              <div className="input-field">
                <label>Quantidade mínima</label>
                <input
                  type="number"
                  name="qtde_min"
                  value={formData.qtde_min}
                  onChange={handleChange}
                  placeholder="Ex: 1"
                />
              </div>
              <div className="input-field">
                <label>Quantidade Máxima</label>
                <input
                  type="number"
                  name="qtde_max"
                  value={formData.qtde_max}
                  onChange={handleChange}
                  placeholder="Ex: 8"
                />
              </div>
            </div>

            <div className="permissoes">
              <label className="permissoes-title">Permissões</label>

              <div className="toggle-switch-container">
                <label className="switch">
                  <input
                    type="checkbox"
                    name="per_sair"
                    checked={formData.per_sair}
                    onChange={handleChange}
                  />
                  <span className="slider round"></span>
                </label>
                <div className="toggle-text">
                  <p>Permite sair</p>
                  <span>Permite que clientes saiam da fila enquanto aguardam.</span>
                </div>
              </div>

              <div className="toggle-switch-container">
                <label className="switch">
                  <input
                    type="checkbox"
                    name="per_loc"
                    checked={formData.per_loc}
                    onChange={handleChange}
                  />
                  <span className="slider round"></span>
                </label>
                <div className="toggle-text">
                  <p>Permite localização</p>
                  <span>Bloqueia entrada de clientes a mais de 8km do estabelecimento.</span>
                </div>
              </div>

              <div className="toggle-switch-container">
                <div className="toggle-text">
                  <p>Situação</p>
                  <span>Disponibilidade manual da configuração (respeita vigência).</span>
                </div>
                <select
                  name="situacao"
                  value={formData.situacao}
                  onChange={handleChange}
                  style={{ marginLeft: "auto", padding: 8, borderRadius: 6 }}
                >
                  <option value={1}>Ativa</option>
                  <option value={0}>Inativa</option>
                </select>
              </div>
            </div>
          </div>

          <div className="section-card">
            <label className="section-title">Informações da fila</label>

            <div className="input-field full-width">
              <label>Nome da fila</label>
              <input
                type="text"
                name="nome_fila"
                value={formData.nome_fila}
                onChange={handleChange}
                placeholder="Nome da fila"
                required
              />
            </div>

            <div className="group-inputs date-inputs">
              <div className="input-field">
                <label>Início da vigência</label>
                <input type="date" name="ini_vig" value={formData.ini_vig} onChange={handleChange} />
              </div>
              <div className="input-field">
                <label>Fim da vigência</label>
                <input type="date" name="fim_vig" value={formData.fim_vig} onChange={handleChange} />
              </div>
            </div>

            {/* Logo */}
            <div className="upload-box">
              <label>Logo</label>
              <div className="upload-area" onClick={() => document.getElementById("logo-upload").click()}>
                {formData.img_logo?.url ? (
                  <img src={formData.img_logo.url} alt="Logo Preview" className="uploaded-image-preview" />
                ) : (
                  <>
                    <img src="/imagens/upload-icon.png" alt="Upload Icon" className="upload-icon" />
                    <span>Clique aqui para selecionar arquivos</span>
                  </>
                )}
              </div>
              <input
                type="file"
                id="logo-upload"
                style={{ display: "none" }}
                accept="image/*"
                onChange={(e) => handleFileUpload(e, "img_logo")}
              />
            </div>

            {/* Mensagem */}
            <div className="input-field full-width">
              <label>Mensagem Whatsapp/SMS</label>
              <textarea
                name="mensagem"
                value={formData.mensagem}
                onChange={handleChange}
                placeholder="Digite sua mensagem..."
              />
            </div>

            {/* Banner */}
            <div className="upload-box">
              <label>Imagem para banner</label>
              <div className="upload-area" onClick={() => document.getElementById("banner-upload").click()}>
                {formData.img_banner?.url ? (
                  <img src={formData.img_banner.url} alt="Banner Preview" className="uploaded-image-preview" />
                ) : (
                  <>
                    <img src="/imagens/upload-icon.png" alt="Upload Icon" className="upload-icon" />
                    <span>Clique aqui para selecionar arquivos</span>
                  </>
                )}
              </div>
              <input
                type="file"
                id="banner-upload"
                style={{ display: "none" }}
                accept="image/*"
                onChange={(e) => handleFileUpload(e, "img_banner")}
              />
            </div>
          </div>

          <div className="section-card campos-cliente-section">
            <p className="section-title">Campos do cliente</p>
            <p className="subtitle">
              Escolha os campos que o cliente deverá preencher. *O campo de CPF é obrigatório
            </p>
            <div className="campos-grid">
              {Object.entries(formData.campos).map(([campo, ativo]) => (
                <label
                  key={campo}
                  className={`campo-box ${ativo ? "ativo" : ""} ${campo === "cpf" ? "disabled" : ""}`}
                >
                  <input
                    type="checkbox"
                    name={campo}
                    checked={!!ativo}
                    onChange={handleCamposChange}
                    disabled={campo === "cpf"}
                    style={{ display: "none" }}
                  />
                  <div className="campo-content">
                    <img src={`/imagens/${campo}.png`} alt={`${campo} icon`} className="campo-icon" />
                    <span>{campo.replace(/_/g, " ")}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="botoes">
            <button type="button" className="cancel-btn" onClick={() => navigate("/filas-cadastradas")}>
              Cancelar
            </button>
            <button type="submit" className="save-btn">
              Salvar
            </button>
          </div>
        </form>

        {/* Modal Sucesso */}
        {mostrarModalSucesso && mensagemSucessoModal && (
          <div className="modal-overlay">
            <div className="modal sucesso">
              <p className="mensagem-sucesso">{mensagemSucessoModal}</p>

              {(linkConvite || qrDataUrl) && (
                <div className="convite-bloco" style={{ marginTop: 12 }}>
                  {linkConvite && (
                    <>
                      <p>
                        <strong>Link para o cliente entrar na fila:</strong>
                      </p>
                      <a href={linkConvite} target="_blank" rel="noopener noreferrer">
                        {linkConvite}
                      </a>
                      <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                        <input
                          type="text"
                          readOnly
                          value={linkConvite}
                          style={{ flex: 1 }}
                          onFocus={(e) => e.target.select()}
                        />
                        <button type="button" onClick={() => navigator.clipboard.writeText(linkConvite)}>
                          Copiar link
                        </button>
                        <a href={linkConvite} target="_blank" rel="noopener noreferrer" className="btn-abrir-link">
                          Abrir
                        </a>
                      </div>
                    </>
                  )}
                  {qrDataUrl && (
                    <>
                      <p style={{ marginTop: 12 }}>
                        <strong>QR Code:</strong>
                      </p>
                      <img src={qrDataUrl} alt="QR Code da fila" style={{ width: 200, height: 200 }} />
                    </>
                  )}
                </div>
              )}

              <button onClick={fecharModalSucesso} className="btn-fechar-modal">
                Fechar
              </button>
            </div>
          </div>
        )}

        {/* Modal Erro */}
        {mostrarModalErro && mensagemErroModal && (
          <div className="modal-overlay">
            <div className="modal erro">
              <p className="mensagem-erro">{mensagemErroModal}</p>
              <button onClick={fecharModalErro} className="btn-fechar-modal">
                Fechar
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default FormularioConfiguracaoFila;
