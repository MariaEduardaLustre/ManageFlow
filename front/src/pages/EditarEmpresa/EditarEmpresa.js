// src/pages/EditarEmpresa/EditarEmpresa.js
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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

const EditarEmpresa = ({ onLogout }) => {
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

  // Foto de Perfil (empresa)
  const [perfilPreview, setPerfilPreview] = useState('');
  const [perfilFile, setPerfilFile] = useState(null);
  const [uploadingPerfil, setUploadingPerfil] = useState(false);

  const empresaSelecionada = useMemo(
    () => JSON.parse(localStorage.getItem('empresaSelecionada') || 'null'),
    []
  );
  const isAdmin = empresaSelecionada?.NIVEL === 1;

  // Igual ao Perfil de Usuário: usamos a URL absoluta enviada pelo back (img_perfil)
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

        // SOMENTE URL ABSOLUTA vinda do back (como no PerfilUsuario)
        setPerfilPreview(emp.img_perfil || emp.LOGO_URL || '');
      } catch (err) {
        setError(err?.response?.data?.error || 'Não foi possível carregar os dados da empresa.');
      } finally {
        setLoading(false);
      }
    })();
  }, [idEmpresa]);

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
      setError('O CNPJ informado não é válido.');
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
      setSuccess('Dados da empresa atualizados com sucesso!');
      setTimeout(() => navigate('/home'), 2000);
    } catch (err) {
      setError(err?.response?.data?.error || 'Erro ao atualizar os dados.');
    }
  };

  // Avaliações
  const gerarLinkAvaliacao = async () => {
    try {
      const { data } = await api.get(`/avaliacoes/avaliacao-link/${idEmpresa}`);
      setAvaliacaoUrl(data.url);
      setAvaliacaoToken(data.token);
    } catch (error) {
      alert(`Erro ao gerar o link de avaliação: ${error?.response?.data?.error || error.message}`);
    }
  };

  const copiarLink = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text)
      .then(() => alert('Link copiado!'))
      .catch(() => alert('Falha ao copiar.'));
  };

  const exibirQrCode = async () => {
    if (!avaliacaoToken) {
      alert('Gere o link de avaliação primeiro.');
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
      alert('Erro ao gerar QR Code.');
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

  // Perfil Público — APENAS TOKEN
  const gerarLinkPerfil = async () => {
    try {
      const { data } = await api.get(`/public/perfil-link/${idEmpresa}`);
      setPerfilUrlByToken(data.urlByToken);
      setPerfilToken(data.token);
    } catch (error) {
      alert('Erro ao gerar o link do perfil público.');
    }
  };

  const exibirQrCodePerfil = async () => {
    if (!perfilToken) {
      alert('Gere o link do perfil público primeiro.');
      return;
    }
    setShowQrPerfilModal(true);
    setQrPerfilLoading(true);
    try {
      const response = await api.get(`/public/qr/perfil/${perfilToken}`, { responseType: 'blob' });
      if (qrPerfilUrl) URL.revokeObjectURL(qrPerfilUrl);
      const url = URL.createObjectURL(response.data);
      setQrPerfilUrl(url);
    } catch (error) {
      alert('Erro ao gerar QR Code do perfil.');
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

  // Upload da FOTO DE PERFIL (empresa) — igual ao PerfilUsuario (usa URL devolvida)
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
      alert('Selecione uma imagem para o perfil.');
      return;
    }
    try {
      setUploadingPerfil(true);
      setError(''); setSuccess('');
      const fd = new FormData();
      fd.append('img_perfil', perfilFile);

      // back retorna { img_perfil: 'URL absoluta', key: '/uploads/...' }
      const { data } = await api.post(`/empresas/${idEmpresa}/perfil`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setPerfilPreview(data.img_perfil || '');
      setEmpresa((prev) => ({
        ...prev,
        LOGO: data.key || prev.LOGO,
        LOGO_URL: data.img_perfil || prev.LOGO_URL
      }));
      setSuccess('Foto de perfil da empresa atualizada com sucesso!');
    } catch (err) {
      setError(err?.response?.data?.error || 'Erro ao enviar a foto de perfil.');
    } finally {
      setUploadingPerfil(false);
    }
  };

  // Loading
  if (loading) {
    return (
      <>
        <div className="editar-empresa-container">
          <Menu onLogout={onLogout} />
          <Container as="main" className="editar-empresa-main-content">
            <div className="editar-empresa-header">
              <h1 className="mb-0">Dados da Empresa</h1>
              <Button variant="outline-secondary" className="btn-voltar" onClick={() => navigate('/home')}>
                <FaArrowLeft />
                Voltar para a Home
              </Button>
            </div>

            <Card>
              <Card.Body>
                {!isAdmin && (<Alert variant="info">Você está em modo de visualização.</Alert>)}
                {error && <Alert variant="danger">{error}</Alert>}
                {success && <Alert variant="success">{success}</Alert>}
                <Form onSubmit={() => {}} noValidate>
                  <Form.Group className="mb-3">
                    <Form.Label>Nome da Empresa</Form.Label>
                    <div className="form-group-with-icon">
                      <FaBuilding className="form-icon" />
                      <Form.Control type="text" name="NOME_EMPRESA" value={empresa.NOME_EMPRESA || ''} disabled />
                    </div>
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>CNPJ</Form.Label>
                    <div className="form-group-with-icon">
                      <FaIdCard className="form-icon" />
                      <Form.Control type="text" name="CNPJ" value={empresa.CNPJ || ''} disabled />
                    </div>
                  </Form.Group>
                </Form>
              </Card.Body>
            </Card>
          </Container>
        </div>
      </>
    );
  }

  // Render
  return (
    <>
      <div className="editar-empresa-container">
        <Menu onLogout={onLogout} />
        <Container as="main" className="editar-empresa-main-content">
          <h1 className="mb-4">Dados da Empresa</h1>
          <Card>
            <Card.Body>
              {!isAdmin && (<Alert variant="info">Você está em modo de visualização.</Alert>)}
              {error && <Alert variant="danger">{error}</Alert>}
              {success && <Alert variant="success">{success}</Alert>}

              <Form onSubmit={handleSubmit} noValidate>
                <Form.Group className="mb-3">
                  <Form.Label>Nome da Empresa</Form.Label>
                  <div className="form-group-with-icon">
                    <FaBuilding className="form-icon" />
                    <Form.Control
                      type="text"
                      name="NOME_EMPRESA"
                      value={empresa.NOME_EMPRESA || ''}
                      onChange={handleChange}
                      disabled={!isAdmin}
                      required
                    />
                  </div>
                </Form.Group>

                {/* FOTO DE PERFIL DA EMPRESA (como PerfilUsuario: usa URL absoluta do back) */}
                <Form.Group className="mb-3">
                  <Form.Label>Foto de Perfil da Empresa (exibida no Perfil Público)</Form.Label>
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
                            alt="Foto de Perfil"
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
                        <Form.Control type="file" accept="image/*" onChange={handlePerfilChange} disabled={!isAdmin} />
                        <Button
                          variant="outline-secondary"
                          onClick={enviarPerfil}
                          disabled={!isAdmin || !perfilFile || uploadingPerfil}
                        >
                          {uploadingPerfil ? (<><Spinner size="sm" className="me-2" /> Enviando...</>) : (<><FaUpload className="me-2" /> Enviar foto</>)}
                        </Button>
                      </div>
                      <Form.Text className="text-muted">
                        O backend já retorna a URL pública (S3/CloudFront) em <code>img_perfil</code>.
                      </Form.Text>
                    </Col>
                  </Row>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>CNPJ</Form.Label>
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
                    />
                  </div>
                  {!isCnpjValid && (empresa.CNPJ || '').length > 0 && (
                    <Form.Text className="text-danger">CNPJ inválido.</Form.Text>
                  )}
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <div className="form-group-with-icon">
                    <FaEnvelope className="form-icon" />
                    <Form.Control
                      type="email"
                      name="EMAIL"
                      value={empresa.EMAIL || ''}
                      onChange={handleChange}
                      disabled={!isAdmin}
                    />
                  </div>
                </Form.Group>

                <div className="form-row">
                  <Form.Group className="mb-3 form-group-endereco">
                    <Form.Label>Endereço</Form.Label>
                    <div className="form-group-with-icon">
                      <FaHome className="form-icon" />
                      <Form.Control
                        type="text"
                        name="ENDERECO"
                        value={empresa.ENDERECO || ''}
                        onChange={handleChange}
                        disabled={!isAdmin}
                      />
                    </div>
                  </Form.Group>

                  <Form.Group className="mb-3 form-group-numero">
                    <Form.Label>Número</Form.Label>
                    <div className="form-group-with-icon">
                      <FaHashtag className="form-icon" />
                      <Form.Control
                        type="text"
                        name="NUMERO"
                        value={empresa.NUMERO || ''}
                        onChange={handleChange}
                        disabled={!isAdmin}
                      />
                    </div>
                  </Form.Group>
                </div>

                {isAdmin && (
                  <Button variant="primary" type="submit" className="mt-2">
                    Salvar Alterações
                  </Button>
                )}
              </Form>
            </Card.Body>
          </Card>

          {/* Bloco de Avaliações */}
          <Card className="mt-4">
            <Card.Body>
              <Card.Title className="card-title-icon"><FaStar /> Avaliações de Clientes</Card.Title>
              <Card.Text>Use o link ou QR Code para que seus clientes possam avaliar o atendimento.</Card.Text>
              {avaliacaoUrl && (
                <div className="url-display-box"><FaLink /><span>{avaliacaoUrl}</span></div>
              )}
              <div className="botoes-acao">
                <Button variant="secondary" onClick={gerarLinkAvaliacao}>
                  {avaliacaoUrl ? 'Gerar Novo Link' : 'Gerar Link'}
                </Button>
                <Button variant="outline-primary" onClick={() => copiarLink(avaliacaoUrl)} disabled={!avaliacaoUrl}>
                  <FaCopy /> Copiar
                </Button>
                <Button variant="outline-primary" onClick={exibirQrCode} disabled={!avaliacaoUrl}>
                  <FaQrcode /> QR Code
                </Button>
              </div>
            </Card.Body>
          </Card>

          {/* Perfil Público — APENAS TOKEN */}
          <Card className="mt-4">
            <Card.Body>
              <Card.Title className="card-title-icon"><FaGlobeAmericas /> Perfil Público</Card.Title>
              <Card.Text>Link público com foto de perfil, nome e avaliações da sua empresa (acesso por token).</Card.Text>
              {perfilUrlByToken && (
                <div className="url-display-box alt"><FaLink /><span>{perfilUrlByToken}</span></div>
              )}
              <div className="botoes-acao">
                <Button variant="secondary" onClick={gerarLinkPerfil}>
                  {perfilUrlByToken ? 'Gerar Novo Link' : 'Gerar Link'}
                </Button>
                <Button variant="outline-primary" onClick={() => copiarLink(perfilUrlByToken)} disabled={!perfilUrlByToken}>
                  <FaCopy /> Copiar
                </Button>
                <Button variant="outline-primary" onClick={exibirQrCodePerfil} disabled={!perfilToken}>
                  <FaQrcode /> QR Code
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Container>
      </div>

      {/* Modal de confirmação de salvar dados */}
      <Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)} centered>
        <Modal.Header closeButton><Modal.Title>Confirmar Alterações</Modal.Title></Modal.Header>
        <Modal.Body>Você tem certeza de que deseja salvar as alterações?</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowConfirmModal(false)}>Cancelar</Button>
          <Button variant="primary" onClick={handleConfirmSave}>Sim, Salvar</Button>
        </Modal.Footer>
      </Modal>

      {/* Modal QR de Avaliação */}
      <Modal show={showQrModal} onHide={() => setShowQrModal(false)} centered>
        <Modal.Header closeButton><Modal.Title>QR Code de Avaliação</Modal.Title></Modal.Header>
        <Modal.Body className="text-center">
          {qrLoading && <p>Gerando...</p>}
          {qrCodeUrl && <img src={qrCodeUrl} alt="QR Code de Avaliação" className="qr-code-image" />}
          <p className="mt-3">Aponte a câmera do celular para o código para abrir o link.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowQrModal(false)}><FaTimes /> Fechar</Button>
          <Button variant="primary" onClick={handleDownloadQr} disabled={!qrCodeUrl}><FaDownload /> Baixar</Button>
        </Modal.Footer>
      </Modal>

      {/* Modal QR do Perfil Público */}
      <Modal show={showQrPerfilModal} onHide={() => setShowQrPerfilModal(false)} centered>
        <Modal.Header closeButton><Modal.Title>QR Code do Perfil Público</Modal.Title></Modal.Header>
        <Modal.Body className="text-center">
          {qrPerfilLoading && <p>Gerando...</p>}
          {qrPerfilUrl && <img src={qrPerfilUrl} alt="QR Code do Perfil Público" className="qr-code-image" />}
          <p className="mt-3">Aponte a câmera do celular para o código para abrir o perfil.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowQrPerfilModal(false)}><FaTimes /> Fechar</Button>
          <Button variant="primary" onClick={handleDownloadQrPerfil} disabled={!qrPerfilUrl}><FaDownload /> Baixar</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default EditarEmpresa;
