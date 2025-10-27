import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaArrowLeft, FaEdit, FaSave, FaTimes } from 'react-icons/fa';
import './PerfilUsuario.css';
import Menu from '../Menu/Menu';

const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) ||
  (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_BASE) ||
  (typeof window !== 'undefined' && window.location && window.location.hostname
    ? `http://${window.location.hostname}:3001/api`
    : 'http://localhost:3001/api');

export default function PerfilUsuario() {
  const navigate = useNavigate();

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
        // atualiza header do menu rapidamente
        if (data?.nome) localStorage.setItem('nomeUsuario', data.nome);
      } catch (err) {
        setErro(err?.response?.data?.error || 'Falha ao carregar perfil.');
      } finally {
        setLoading(false);
      }
    })();
  }, [api, idUsuario]);

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
      // Envia apenas campos editáveis (email/cpf permanecem do original e são ignorados pelo back se vierem iguais)
      const payload = {
        nome: form.nome,
        email: original.email,      // congela
        cpfCnpj: original.cpfCnpj,  // congela
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
      setMsg('Perfil atualizado com sucesso.');
      // Atualiza nome no header/menu
      if (data?.nome) localStorage.setItem('nomeUsuario', data.nome);
    } catch (err) {
      setErro(err?.response?.data?.error || 'Falha ao salvar.');
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
      setMsg('Foto atualizada.');
    } catch (err) {
      setErro(err?.response?.data?.error || 'Falha ao subir foto.');
    }
  };

  if (loading) {
    return (
      <div className="perfil-page">
        <div className="topbar">
          <button className="btn ghost" onClick={() => navigate(-1)}>
            <FaArrowLeft /> Voltar
          </button>
        </div>
        <div className="skeleton">Carregando perfil...</div>
      </div>
    );
  }

  return (
    <div className="perfil-page">
    <Menu />
      {/* Cabeçalho */}
      <div className="topbar">
        <div className="title-wrap">
          <h2>Meu Perfil</h2>
          <span className={`badge ${isEditing ? 'editing' : 'view'}`}>
            {isEditing ? 'Editando' : 'Visualização'}
          </span>
        </div>

        <div className="actions">
          {!isEditing ? (
            <button className="btn primary" onClick={handleEdit}>
              <FaEdit /> Editar perfil
            </button>
          ) : (
            <>
              <button className="btn primary" onClick={handleSave} disabled={saving}>
                <FaSave /> {saving ? 'Salvando...' : 'Salvar'}
              </button>
              <button className="btn ghost danger" onClick={handleCancel}>
                <FaTimes /> Cancelar
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
                alt="Foto do usuário"
                onError={(e) => {
                  e.currentTarget.src = defaultAvatar;
                }}
              />
            </div>
            <label className="btn neutral file-btn">
              Alterar foto
              <input type="file" accept="image/*" onChange={handlePhoto} hidden />
            </label>
            <small className="help">PNG, JPG até 5MB</small>
          </div>

          {/* Form */}
          <div className="card form-card">
            <div className="form-grid">
              <div className="field">
                <label>Nome</label>
                <input
                  name="nome"
                  value={form.nome}
                  onChange={onChange}
                  disabled={!isEditing}
                  placeholder="Seu nome completo"
                />
              </div>

              <div className="field disabled">
                <label>E-mail</label>
                <input
                  name="email"
                  value={form.email}
                  readOnly
                  disabled
                  title="E-mail não pode ser alterado"
                />
              </div>

              <div className="field disabled">
                <label>CPF/CNPJ</label>
                <input
                  name="cpfCnpj"
                  value={form.cpfCnpj}
                  readOnly
                  disabled
                  title="CPF/CNPJ não pode ser alterado"
                />
              </div>

              <div className="field">
                <label>CEP</label>
                <input
                  name="cep"
                  value={form.cep}
                  onChange={onChange}
                  disabled={!isEditing}
                />
              </div>

              <div className="field">
                <label>Endereço</label>
                <input
                  name="endereco"
                  value={form.endereco}
                  onChange={onChange}
                  disabled={!isEditing}
                />
              </div>

              <div className="field">
                <label>Número</label>
                <input
                  name="numero"
                  value={form.numero}
                  onChange={onChange}
                  disabled={!isEditing}
                />
              </div>

              <div className="field">
                <label>Complemento</label>
                <input
                  name="complemento"
                  value={form.complemento}
                  onChange={onChange}
                  disabled={!isEditing}
                />
              </div>

              <div className="field">
                <label>DDI</label>
                <input
                  name="ddi"
                  value={form.ddi}
                  onChange={onChange}
                  disabled={!isEditing}
                />
              </div>

              <div className="field">
                <label>DDD</label>
                <input
                  name="ddd"
                  value={form.ddd}
                  onChange={onChange}
                  disabled={!isEditing}
                />
              </div>

              <div className="field">
                <label>Telefone</label>
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
          Dica: Altere sua senha periodicamente na área de segurança da conta.
        </div>
      </div>
    </div>
  );
}
