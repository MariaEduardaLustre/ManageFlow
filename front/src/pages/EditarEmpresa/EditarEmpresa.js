// src/pages/EditarEmpresa/EditarEmpresa.js
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import Menu from '../../components/Menu/Menu';
import {
  Form, Button, Container, Card, Alert, Modal, Row, Col, Spinner
} from 'react-bootstrap';
import {
  FaBuilding, FaIdCard, FaEnvelope, FaHome, FaHashtag, FaStar, FaQrcode,
  FaLink, FaCopy, FaDownload, FaTimes, FaGlobeAmericas, FaImage, FaUpload, FaArrowLeft
} from 'react-icons/fa';
import './EditarEmpresa.css';

const validarCNPJ = (cnpj) => {
  cnpj = cnpj.replace(/[^\d]+/g, '');
  if (cnpj === '') return false;
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1+$/.test(cnpj)) return false;
  let tamanho = cnpj.length - 2;
  let numeros = cnpj.substring(0, tamanho);
  let digitos = cnpj.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;
  for (let i = tamanho; i >= 1; i--) {
    soma += numeros.charAt(tamanho - i) * pos--;
    if (pos < 2) pos = 9;
  }
  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado != digitos.charAt(0)) return false;
  tamanho += 1;
  numeros = cnpj.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;
  for (let i = tamanho; i >= 1; i--) {
    soma += numeros.charAt(tamanho - i) * pos--;
    if (pos < 2) pos = 9;
  }
  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado != digitos.charAt(1)) return false;
  return true;
};

// aceita string ou objeto { url, key }
function normalizeImg(v) {
  if (!v) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'object' && v !== null) {
    return v.url || v.href || '';
  }
  return '';
}

// cache-buster para evitar imagem antiga
function withCacheBuster(url, seed = Date.now()) {
  if (!url) return url;
  try {
    const hasQ = url.includes('?');
    return `${url}${hasQ ? '&' : '?'}v=${encodeURIComponent(seed)}`;
  } catch {
    return url;
  }
}

const EditarEmpresa = ({ onLogout }) => {
  const { t } = useTranslation();
  const ns = 'empresaConfig';

  const { idEmpresa } = useParams();
  const navigate = useNavigate();

  const [empresa, setEmpresa] = useState({
    NOME_EMPRESA: '', CNPJ: '', EMAIL: '', ENDERECO: '', NUMERO: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isCnpjValid, setIsCnpjValid] = useState(true);

  // Avaliação
  const [avaliacaoUrl, setAvaliacaoUrl] = useState('');
  const [avaliacaoToken, setAvaliacaoToken] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  // Perfil Público (apenas TOKEN)
  const [perfilUrlByToken, setPerfilUrlByToken] = useState('');
  const [perfilToken, setPerfilToken] = useState('');
  const [qrPerfilUrl, setQrPerfilUrl] = useState(null);
  const [qrPerfilLoading, setQrPerfilLoading] = useState(false);
  const [showQrPerfilModal, setShowQrPerfilModal] = useState(false);

  // Foto de Perfil
  const [perfilPreview, setPerfilPreview] = useState('');
  const [perfilFile, setPerfilFile] = useState(null);
  const [uploadingPerfil, setUploadingPerfil] = useState(false);

  const empresaSelecionada = useMemo(
    () => JSON.parse(localStorage.getItem('empresaSelecionada') || 'null'),
    []
  );
  const isAdmin = empresaSelecionada?.NIVEL === 1;

  const defaultAvatar = '/imagens/avatar-default.png';

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        const { data: emp } = await api.get(`/empresas/detalhes/${idEmpresa}`);
        setEmpresa({
          NOME_EMPRESA: emp.NOME_EMPRESA || emp.nome || '',
          CNPJ: emp.CNPJ || emp.cnpj || '',
          EMAIL: emp.EMAIL || emp.email || '',
          ENDERECO: emp.ENDERECO || emp.endereco || '',
          NUMERO: emp.NUMERO || emp.numero || ''
        });
        const cnpjToValidate = String(emp.CNPJ || emp.cnpj || '');
        if (cnpjToValidate) setIsCnpjValid(validarCNPJ(cnpjToValidate));

        const img =
          normalizeImg(emp.img_perfil) ||
          normalizeImg(emp.img_perfil_url) ||
          normalizeImg(emp.LOGO_URL) ||
          normalizeImg(emp.LOGO) ||
          '';

        setPerfilPreview(img);
      } catch (err) {
        setError(err?.response?.data?.error || t(`${ns}.erroSalvarGeral`));
      } finally {
        setLoading(false);
      }
    })();
  }, [idEmpresa, t]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let finalValue = value;
    if (name === 'CNPJ') {
      finalValue = value.replace(/\D/g, '');
      setIsCnpjValid(validarCNPJ(finalValue));
    }
    setEmpresa((prev) => ({ ...prev, [name]: finalValue }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isCnpjValid) {
      setError(t(`${ns}.erroCNPJInvalido`));
      return;
    }
    setError('');
    if (isAdmin) setShowConfirmModal(true);
  };

  const handleConfirmSave = async () => {
    setShowConfirmModal(false);
    setError(''); setSuccess('');
    try {
      await api.put(`/empresas/detalhes/${idEmpresa}`, empresa);
      setSuccess(t(`${ns}.sucessoSalvarGeral`));
      setTimeout(() => navigate('/home'), 2000);
    } catch (err) {
      setError(err?.response?.data?.error || t(`${ns}.erroSalvarGeral`));
    }
  };

  const handleVoltar = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/home');
  };

  const handleIrSelecionarEmpresa = () => {
    navigate('/escolher-empresa');
  };

  // Avaliações
  const gerarLinkAvaliacao = async () => {
    try {
      const { data } = await api.get(`/avaliacoes/avaliacao-link/${idEmpresa}`);
      setAvaliacaoUrl(data.url);
      setAvaliacaoToken(data.token);
    } catch (error) {
      alert(`${t(`${ns}.avaliacoesTitulo`)}: ${t(`${ns}.erroSalvarGeral`)}`);
    }
  };

  const copiarLink = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text)
      .then(() => alert(`${t(`${ns}.linkAvaliacaoCopiar`)} ✓`))
      .catch(() => alert(`${t(`${ns}.linkAvaliacaoCopiar`)} ✗`));
  };

  const exibirQrCode = async () => {
    if (!avaliacaoToken) {
      alert(t(`${ns}.linkAvaliacaoGerar`));
      return;
    }
    setShowQrModal(true);
    setQrLoading(true);
    try {
      const response = await api.get(`/avaliacoes/qr/avaliacao/${avaliacaoToken}`, { responseType: 'blob' });
      if (qrCodeUrl) URL.revokeObjectURL(qrCodeUrl);
      const url = URL.createObjectURL(response.data);
      setQrCodeUrl(url);
    } catch (error) {
      alert(t(`${ns}.erroSalvarGeral`));
    } finally {
      setQrLoading(false);
    }
  };

  const handleDownloadQr = () => {
    if (!qrCodeUrl) return;
    const a = document.createElement('a');
    a.href = qrCodeUrl;
    a.download = `qrcode-avaliacao-${idEmpresa}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Perfil público (token)
  const gerarLinkPerfil = async () => {
    try {
      const { data } = await api.get(`/public/perfil-link/${idEmpresa}`);
      setPerfilUrlByToken(data.urlByToken);
      setPerfilToken(data.token);
    } catch {
      alert(t(`${ns}.erroSalvarGeral`));
    }
  };

  const exibirQrCodePerfil = async () => {
    if (!perfilToken) {
      alert(t(`${ns}.linkPerfilGerar`));
      return;
    }
    setShowQrPerfilModal(true);
    setQrPerfilLoading(true);
    try {
      const response = await api.get(`/public/qr/perfil/${perfilToken}`, { responseType: 'blob' });
      if (qrPerfilUrl) URL.revokeObjectURL(qrPerfilUrl);
      const url = URL.createObjectURL(response.data);
      setQrPerfilUrl(url);
    } catch {
      alert(t(`${ns}.erroSalvarGeral`));
    } finally {
      setQrPerfilLoading(false);
    }
  };

  const handleDownloadQrPerfil = () => {
    if (!qrPerfilUrl) return;
    const a = document.createElement('a');
    a.href = qrPerfilUrl;
    a.download = `qrcode-perfil-${idEmpresa}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Upload
  const handlePerfilChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPerfilFile(file);
    const reader = new FileReader();
    reader.onload = () => setPerfilPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const enviarPerfil = async () => {
    if (!perfilFile) {
      alert(t(`${ns}.botaoEnviarFoto`));
      return;
    }
    try {
      setUploadingPerfil(true);
      setError(''); setSuccess('');
      const fd = new FormData();
      fd.append('img_perfil', perfilFile);
      const { data } = await api.post(`/empresas/${idEmpresa}/perfil`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const rawUrl = normalizeImg(data.img_perfil);
      const url = withCacheBuster(rawUrl);

      setPerfilPreview(url || '');
      setEmpresa((prev) => ({
        ...prev,
        LOGO: data.key || prev.LOGO,
        LOGO_URL: url || prev.LOGO_URL
      }));
      setPerfilFile(null);

      setSuccess(t(`${ns}.sucessoUploadFoto`));
    } catch (err) {
      setError(err?.response?.data?.error || t(`${ns}.erroUploadFoto`));
    } finally {
      setUploadingPerfil(false);
    }
  };

  if (loading) {
    return (
      <div className="editar-empresa-container">
        <Menu onLogout={onLogout} />
        <Container as="main" className="editar-empresa-main-content">
          <section className="editar-header-card">
            <div className="editar-header-row">
              <h1 className="editar-header-title">{t(`${ns}.tituloPrincipal`)}</h1>
              <div className="editar-header-actions">
                <Button variant="outline-secondary" className="btn-voltar" onClick={handleVoltar}>
                  <FaArrowLeft />&nbsp;{t('geral.voltar')}
                </Button>
              </div>
            </div>
          </section>

          <Card>
            <Card.Body>
              <Alert variant="info" className="mb-0 d-flex align-items-center gap-2">
                <Spinner animation="border" size="sm" />&nbsp;{t('geral.carregando')}
              </Alert>
            </Card.Body>
          </Card>
        </Container>
      </div>
    );
  }

  return (
    <div className="editar-empresa-container">
      <Menu onLogout={onLogout} />
      <Container as="main" className="editar-empresa-main-content">
        <section className="editar-header-card">
          <div className="editar-header-row">
            <h2>{t(`${ns}.tituloPrincipal`)}</h2>
            <div className="editar-header-actions" />
          </div>
        </section>

        <Card>
          <Card.Body>
            {!isAdmin && (<Alert variant="info">{t(`${ns}.avisoVisualizacao`)}</Alert>)}
            {error && <Alert variant="danger">{error}</Alert>}
            {success && <Alert variant="success">{success}</Alert>}

            <Form onSubmit={handleSubmit} noValidate>
              <Form.Group className="mb-3">
                <Form.Label>{t(`${ns}.nomeLabel`)}</Form.Label>
                <div className="form-group-with-icon">
                  <FaBuilding className="form-icon" />
                  <Form.Control
                    type="text"
                    name="NOME_EMPRESA"
                    value={empresa.NOME_EMPRESA || ''}
                    onChange={handleChange}
                    disabled={!isAdmin}
                    required
                    aria-label={t(`${ns}.nomeLabel`)}
                  />
                </div>
              </Form.Group>

              {/* Foto de Perfil */}
              <Form.Group className="mb-3">
                <Form.Label>{t(`${ns}.fotoTitulo`)}</Form.Label>
                <Row className="align-items-center g-3">
                  <Col xs="auto">
                    <div
                      className="mf-logo-preview"
                      style={{
                        width: 88, height: 88, borderRadius: 12, overflow: 'hidden',
                        border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', background: '#f8fafc'
                      }}
                    >
                      {perfilPreview ? (
                        <img
                          src={perfilPreview || defaultAvatar}
                          alt={t(`${ns}.fotoTitulo`)}
                          crossOrigin="anonymous"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => { e.currentTarget.src = defaultAvatar; }}
                        />
                      ) : (
                        <FaImage size={28} style={{ opacity: .6 }} />
                      )}
                    </div>
                  </Col>
                  <Col>
                    <div className="d-flex gap-2 flex-wrap">
                      <Form.Control
                        type="file"
                        accept="image/*"
                        onChange={handlePerfilChange}
                        disabled={!isAdmin}
                        aria-label={t(`${ns}.fotoTitulo`)}
                      />
                      <Button
                        variant="outline-secondary"
                        onClick={enviarPerfil}
                        disabled={!isAdmin || !perfilFile || uploadingPerfil}
                      >
                        {uploadingPerfil ? (
                          <>
                            <Spinner size="sm" className="me-2" /> {t(`${ns}.botaoEnviandoFoto`)}
                          </>
                        ) : (
                          <>
                            <FaUpload className="me-2" /> {t(`${ns}.botaoEnviarFoto`)}
                          </>
                        )}
                      </Button>
                    </div>
                    <Form.Text className="text-muted">
                      {t(`${ns}.fotoDescricaoBackend`)} <code>IMG_PERFIL</code>.
                    </Form.Text>
                  </Col>
                </Row>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>{t(`${ns}.cnpjLabel`)}</Form.Label>
                <div className="form-group-with-icon">
                  <FaIdCard className="form-icon" />
                  <Form.Control
                    type="text"
                    name="CNPJ"
                    value={empresa.CNPJ || ''}
                    onChange={handleChange}
                    disabled={!isAdmin}
                    required
                    maxLength={14}
                    isInvalid={!isCnpjValid && (empresa.CNPJ || '').length > 0}
                    aria-invalid={!isCnpjValid}
                    aria-label={t(`${ns}.cnpjLabel`)}
                  />
                </div>
                {!isCnpjValid && (empresa.CNPJ || '').length > 0 && (
                  <Form.Text className="text-danger">{t(`${ns}.erroCNPJInvalido`)}</Form.Text>
                )}
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>{t(`${ns}.emailLabel`)}</Form.Label>
                <div className="form-group-with-icon">
                  <FaEnvelope className="form-icon" />
                  <Form.Control
                    type="email"
                    name="EMAIL"
                    value={empresa.EMAIL || ''}
                    onChange={handleChange}
                    disabled={!isAdmin}
                    aria-label={t(`${ns}.emailLabel`)}
                  />
                </div>
              </Form.Group>

              <div className="form-row">
                <Form.Group className="mb-3 form-group-endereco">
                  <Form.Label>{t(`${ns}.enderecoLabel`)}</Form.Label>
                  <div className="form-group-with-icon">
                    <FaHome className="form-icon" />
                    <Form.Control
                      type="text"
                      name="ENDERECO"
                      value={empresa.ENDERECO || ''}
                      onChange={handleChange}
                      disabled={!isAdmin}
                      aria-label={t(`${ns}.enderecoLabel`)}
                    />
                  </div>
                </Form.Group>

                <Form.Group className="mb-3 form-group-numero">
                  <Form.Label>{t(`${ns}.numeroLabel`)}</Form.Label>
                  <div className="form-group-with-icon">
                    <FaHashtag className="form-icon" />
                    <Form.Control
                      type="text"
                      name="NUMERO"
                      value={empresa.NUMERO || ''}
                      onChange={handleChange}
                      disabled={!isAdmin}
                      aria-label={t(`${ns}.numeroLabel`)}
                    />
                  </div>
                </Form.Group>
              </div>

              {isAdmin && (
                <Button variant="primary" type="submit" className="mt-2">
                  {t(`${ns}.botaoSalvar`)}
                </Button>
              )}
            </Form>
          </Card.Body>
        </Card>

        {/* Avaliações */}
        <Card className="mt-4">
          <Card.Body>
            <Card.Title className="card-title-icon">
              <FaStar /> {t(`${ns}.avaliacoesTitulo`)}
            </Card.Title>
            <Card.Text>{t(`${ns}.avaliacoesDescricao`)}</Card.Text>

            {avaliacaoUrl && (
              <div className="url-display-box">
                <FaLink /><span>{avaliacaoUrl}</span>
              </div>
            )}

            <div className="botoes-acao">
              <Button variant="secondary" onClick={gerarLinkAvaliacao}>
                {avaliacaoUrl ? t(`${ns}.linkAvaliacaoGerarNovo`) : t(`${ns}.linkAvaliacaoGerar`)}
              </Button>
              <Button variant="outline-primary" onClick={() => copiarLink(avaliacaoUrl)} disabled={!avaliacaoUrl}>
                <FaCopy /> {t(`${ns}.linkAvaliacaoCopiar`)}
              </Button>
              <Button variant="outline-primary" onClick={exibirQrCode} disabled={!avaliacaoUrl}>
                <FaQrcode /> {t(`${ns}.linkAvaliacaoQr`)}
              </Button>
            </div>
          </Card.Body>
        </Card>

        {/* Perfil Público — token */}
        <Card className="mt-4">
          <Card.Body>
            <Card.Title className="card-title-icon">
              <FaGlobeAmericas /> {t(`${ns}.perfilTitulo`)}
            </Card.Title>
            <Card.Text>{t(`${ns}.perfilDescricao`)}</Card.Text>

            {perfilUrlByToken && (
              <div className="url-display-box alt">
                <FaLink /><span>{perfilUrlByToken}</span>
              </div>
            )}

            <div className="botoes-acao">
              <Button variant="secondary" onClick={gerarLinkPerfil}>
                {perfilUrlByToken ? t(`${ns}.linkPerfilGerarNovo`) : t(`${ns}.linkPerfilGerar`)}
              </Button>
              <Button variant="outline-primary" onClick={() => copiarLink(perfilUrlByToken)} disabled={!perfilUrlByToken}>
                <FaCopy /> {t(`${ns}.linkPerfilCopiar`)}
              </Button>
              <Button variant="outline-primary" onClick={exibirQrCodePerfil} disabled={!perfilToken}>
                <FaQrcode /> {t(`${ns}.linkPerfilQr`)}
              </Button>
            </div>
          </Card.Body>
        </Card>

        {/* botão escolher outra empresa */}
        <section className="mt-4 mb-5">
          <div className="d-flex justify-content-rigth">
            <Button
              variant="outline-secondary"
              onClick={handleIrSelecionarEmpresa}
              className="px-4"
              title={t(`${ns}.botaoEscolherOutraEmpresa`)}
            >
              <FaBuilding className="me-2" />
              {t(`${ns}.botaoEscolherOutraEmpresa`)}
            </Button>
          </div>
        </section>
      </Container>

      {/* Modal de confirmação */}
      <Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)} centered>
        <Modal.Header closeButton><Modal.Title>{t(`${ns}.modalConfirmarTitulo`)}</Modal.Title></Modal.Header>
        <Modal.Body>{t(`${ns}.modalConfirmarCorpo`)}</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowConfirmModal(false)}>{t('geral.cancelar')}</Button>
          <Button variant="primary" onClick={handleConfirmSave}>{t(`${ns}.botaoSalvar`)}</Button>
        </Modal.Footer>
      </Modal>

      {/* Modal QR de Avaliação */}
      <Modal show={showQrModal} onHide={() => setShowQrModal(false)} centered>
        <Modal.Header closeButton><Modal.Title>{t(`${ns}.modalAvaliacaoTitulo`)}</Modal.Title></Modal.Header>
        <Modal.Body className="text-center">
          {qrLoading && <p>{t('geral.carregando')}</p>}
          {qrCodeUrl && <img src={qrCodeUrl} alt={t(`${ns}.modalAvaliacaoTitulo`)} className="qr-code-image" />}
          <p className="mt-3">{t(`${ns}.modalAvaliacaoDescricao`)}</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowQrModal(false)}><FaTimes /> {t('geral.fechar')}</Button>
          <Button variant="primary" onClick={handleDownloadQr} disabled={!qrCodeUrl}><FaDownload /> {t(`${ns}.modalAvaliacaoBotaoBaixar`)}</Button>
        </Modal.Footer>
      </Modal>

      {/* Modal QR do Perfil Público */}
      <Modal show={showQrPerfilModal} onHide={() => setShowQrPerfilModal(false)} centered>
        <Modal.Header closeButton><Modal.Title>{t(`${ns}.modalPerfilTitulo`)}</Modal.Title></Modal.Header>
        <Modal.Body className="text-center">
          {qrPerfilLoading && <p>{t('geral.carregando')}</p>}
          {qrPerfilUrl && <img src={qrPerfilUrl} alt={t(`${ns}.modalPerfilTitulo`)} className="qr-code-image" />}
          <p className="mt-3">{t(`${ns}.modalPerfilDescricao`)}</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowQrPerfilModal(false)}><FaTimes /> {t('geral.fechar')}</Button>
          <Button variant="primary" onClick={handleDownloadQrPerfil} disabled={!qrPerfilUrl}><FaDownload /> {t(`${ns}.modalAvaliacaoBotaoBaixar`)}</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default EditarEmpresa;
