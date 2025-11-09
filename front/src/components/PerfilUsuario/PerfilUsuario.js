import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaArrowLeft, FaEdit, FaSave, FaTimes } from 'react-icons/fa';
import './PerfilUsuario.css';
import Menu from '../Menu/Menu';
// ⭐️ 1. Importa o hook de tradução
import { useTranslation } from 'react-i18next'; 

const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) ||
  (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_BASE) ||
  (typeof window !== 'undefined' && window.location && window.location.hostname
    ? `http://${window.location.hostname}:3001/api`
    : 'http://localhost:3001/api');

export default function PerfilUsuario() {
  const navigate = useNavigate();
  // ⭐️ 2. Obtém a função de tradução 't'
  const { t } = useTranslation(); 

  const token = localStorage.getItem('token');
  const idUsuario = Number(localStorage.getItem('idUsuario') || 0);

  const api = useMemo(() => {
    const instance = axios.create({ baseURL: API_BASE });
    instance.interceptors.request.use((config) => {
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });
    return instance;
  }, [token]);

  const [form, setForm] = useState({
    nome: '',
    email: '',
    cpfCnpj: '',
    cep: '',
    endereco: '',
    numero: '',
    complemento: '',
    ddi: '',
    ddd: '',
    telefone: '',
  });
  const [original, setOriginal] = useState(null);

  const [imgPreview, setImgPreview] = useState('');
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [erro, setErro] = useState('');

  // Foto
  const defaultAvatar = '/imagens/avatar-default.png';

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErro('');
      try {
        const { data } = await api.get(`/usuarios/${idUsuario}`);
        const loaded = {
          nome: data.nome || '',
          email: data.email || '',
          cpfCnpj: data.cpfCnpj || '',
          cep: data.cep || '',
          endereco: data.endereco || '',
          numero: data.numero || '',
          complemento: data.complemento || '',
          ddi: data.ddi || '',
          ddd: data.ddd || '',
          telefone: data.telefone || '',
        };
        setForm(loaded);
        setOriginal(loaded);
        setImgPreview(data.img_perfil || '');
        if (data?.nome) localStorage.setItem('nomeUsuario', data.nome);
      } catch (err) {
        // ⭐️ Tradução para mensagem de erro
        setErro(err?.response?.data?.error || t('perfil.erroCarregar'));
      } finally {
        setLoading(false);
      }
    })();
  }, [api, idUsuario, t]); // Adiciona 't' como dependência

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  const handleEdit = () => {
    setIsEditing(true);
    setMsg('');
    setErro('');
  };

  const handleCancel = () => {
    if (original) setForm(original);
    setIsEditing(false);
    setMsg('');
    setErro('');
  };

  const handleSave = async () => {
    setSaving(true);
    setMsg('');
    setErro('');
    try {
      const payload = {
        nome: form.nome,
        email: original.email,
        cpfCnpj: original.cpfCnpj,
        cep: form.cep,
        endereco: form.endereco,
        numero: form.numero,
        complemento: form.complemento,
        ddi: form.ddi,
        ddd: form.ddd,
        telefone: form.telefone,
      };
      const { data } = await api.put(`/usuarios/${idUsuario}`, payload);
      const normalized = {
        nome: data.nome || '',
        email: data.email || '',
        cpfCnpj: data.cpfCnpj || '',
        cep: data.cep || '',
        endereco: data.endereco || '',
        numero: data.numero || '',
        complemento: data.complemento || '',
        ddi: data.ddi || '',
        ddd: data.ddd || '',
        telefone: data.telefone || '',
      };
      setForm(normalized);
      setOriginal(normalized);
      if (data?.img_perfil) setImgPreview(data.img_perfil);
      setIsEditing(false);
      // ⭐️ Tradução para mensagem de sucesso
      setMsg(t('perfil.msgSucesso'));
      if (data?.nome) localStorage.setItem('nomeUsuario', data.nome);
    } catch (err) {
      // ⭐️ Tradução para mensagem de erro
      setErro(err?.response?.data?.error || t('perfil.erroSalvar'));
    } finally {
      setSaving(false);
    }
  };

  const handlePhoto = async (e) => {
    if (!e.target.files?.length) return;
    const f = e.target.files[0];
    setErro('');
    setMsg('');
    try {
      const fd = new FormData();
      fd.append('img_perfil', f);
      const { data } = await api.put(`/usuarios/${idUsuario}/photo`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImgPreview(data.img_perfil || '');
      // ⭐️ Tradução para mensagem de sucesso da foto
      setMsg(t('perfil.msgFotoSucesso'));
    } catch (err) {
      // ⭐️ Tradução para mensagem de erro da foto
      setErro(err?.response?.data?.error || t('perfil.erroFoto'));
    }
  };

  if (loading) {
    return (
      <div className="perfil-page">
        <div className="topbar">
          <button className="btn ghost" onClick={() => navigate(-1)}>
            {/* ⭐️ Tradução para Voltar */}
            <FaArrowLeft /> {t('geral.voltar')}
          </button>
        </div>
        {/* ⭐️ Tradução para Carregando perfil... */}
        <div className="skeleton">{t('perfil.carregando')}</div>
      </div>
    );
  }

  return (
    <div className="perfil-page">
    <Menu />
      {/* Cabeçalho */}
      <div className="topbar">
        <div className="title-wrap">
          {/* ⭐️ Tradução para Meu Perfil */}
          <h2>{t('perfil.titulo')}</h2>
          <span className={`badge ${isEditing ? 'editing' : 'view'}`}>
            {/* ⭐️ Tradução para Editando/Visualização */}
            {isEditing ? t('perfil.tituloEdicao') : t('perfil.tituloVisualizacao')}
          </span>
        </div>

        <div className="actions">
          {!isEditing ? (
            <button className="btn primary" onClick={handleEdit}>
              {/* ⭐️ Tradução para Editar perfil */}
              <FaEdit /> {t('perfil.botaoEditar')}
            </button>
          ) : (
            <>
              <button className="btn primary" onClick={handleSave} disabled={saving}>
                <FaSave /> 
                {/* ⭐️ Tradução para Salvando.../Salvar */}
                {saving ? t('perfil.botaoSalvando') : t('perfil.botaoSalvar')}
              </button>
              <button className="btn ghost danger" onClick={handleCancel}>
                {/* ⭐️ Tradução para Cancelar (usando chave 'geral' ou 'perfil') */}
                <FaTimes /> {t('geral.cancelar')}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Mensagens */}
      <div className="perfil container">
        {erro && <div className="alert error">{erro}</div>}
        {msg && <div className="alert ok">{msg}</div>}

        <div className="grid">
          {/* Foto */}
          <div className="card photo-card">
            <div className="avatar">
              <img
                src={imgPreview || defaultAvatar}
                // ⭐️ Tradução para alt da imagem
                alt={t('perfil.fotoTitulo')}
                onError={(e) => {
                  e.currentTarget.src = defaultAvatar;
                }}
              />
            </div>
            <label className="btn neutral file-btn">
              {/* ⭐️ Tradução para Alterar foto */}
              {t('perfil.fotoBotao')}
              <input type="file" accept="image/*" onChange={handlePhoto} hidden />
            </label>
            {/* ⭐️ Tradução para dica da foto */}
            <small className="help">{t('perfil.fotoAjuda')}</small>
          </div>

          {/* Form */}
          <div className="card form-card">
            <div className="form-grid">
              <div className="field">
                {/* ⭐️ Tradução para Nome */}
                <label>{t('perfil.nomeLabel')}</label>
                <input
                  name="nome"
                  value={form.nome}
                  onChange={onChange}
                  disabled={!isEditing}
                  // ⭐️ Tradução para placeholder
                  placeholder={t('perfil.nomePlaceholder')}
                />
              </div>

              <div className="field disabled">
                {/* ⭐️ Tradução para E-mail */}
                <label>{t('perfil.emailLabel')}</label>
                <input
                  name="email"
                  value={form.email}
                  readOnly
                  disabled
                  // ⭐️ Tradução para title (tooltip)
                  title={t('perfil.emailTitle')}
                />
              </div>

              <div className="field disabled">
                {/* ⭐️ Tradução para CPF/CNPJ */}
                <label>{t('perfil.cpfCnpjLabel')}</label>
                <input
                  name="cpfCnpj"
                  value={form.cpfCnpj}
                  readOnly
                  disabled
                  // ⭐️ Tradução para title (tooltip)
                  title={t('perfil.cpfCnpjTitle')}
                />
              </div>
              
              {/* Note que podemos reutilizar placeholders do 'cadastro' se a chave for a mesma!
                  Ex: t('cadastro.placeholder.cep') */}

              <div className="field">
                {/* ⭐️ Tradução para CEP */}
                <label>{t('perfil.cepLabel')}</label>
                <input
                  name="cep"
                  value={form.cep}
                  onChange={onChange}
                  disabled={!isEditing}
                />
              </div>

              <div className="field">
                {/* ⭐️ Tradução para Endereço */}
                <label>{t('perfil.enderecoLabel')}</label>
                <input
                  name="endereco"
                  value={form.endereco}
                  onChange={onChange}
                  disabled={!isEditing}
                />
              </div>

              <div className="field">
                {/* ⭐️ Tradução para Número */}
                <label>{t('perfil.numeroLabel')}</label>
                <input
                  name="numero"
                  value={form.numero}
                  onChange={onChange}
                  disabled={!isEditing}
                />
              </div>

              <div className="field">
                {/* ⭐️ Tradução para Complemento */}
                <label>{t('perfil.complementoLabel')}</label>
                <input
                  name="complemento"
                  value={form.complemento}
                  onChange={onChange}
                  disabled={!isEditing}
                />
              </div>

              <div className="field">
                {/* ⭐️ Tradução para DDI */}
                <label>{t('perfil.ddiLabel')}</label>
                <input
                  name="ddi"
                  value={form.ddi}
                  onChange={onChange}
                  disabled={!isEditing}
                />
              </div>

              <div className="field">
                {/* ⭐️ Tradução para DDD */}
                <label>{t('perfil.dddLabel')}</label>
                <input
                  name="ddd"
                  value={form.ddd}
                  onChange={onChange}
                  disabled={!isEditing}
                />
              </div>

              <div className="field">
                {/* ⭐️ Tradução para Telefone */}
                <label>{t('perfil.telefoneLabel')}</label>
                <input
                  name="telefone"
                  value={form.telefone}
                  onChange={onChange}
                  disabled={!isEditing}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Segurança extra: dica para senha */}
        <div className="tip">
          {/* ⭐️ Tradução para Dica de segurança */}
          {t('perfil.dicaSeguranca')}
        </div>
      </div>
    </div>
  );
}