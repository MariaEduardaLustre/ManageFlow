// src/pages/AvaliacaoEmpresaPage/AvaliacaoEmpresaPage.jsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';
import { FaStar } from 'react-icons/fa';
import './AvaliacaoEmpresaPage.css';

const AvaliacaoEmpresaPage = () => {
    const { token } = useParams();
    const [empresa, setEmpresa] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const [nota, setNota] = useState(0);
    const [hoverNota, setHoverNota] = useState(0);
    const [comentario, setComentario] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const fetchEmpresaInfo = async () => {
            try {
                const { data } = await api.get(`/avaliacoes/info-empresa/${token}`);
                setEmpresa(data);
            } catch (err) {
                setError('Link de avaliação inválido ou a empresa não foi encontrada.');
            } finally {
                setLoading(false);
            }
        };
        fetchEmpresaInfo();
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (nota === 0) {
            alert('Por favor, selecione uma nota de 1 a 5 estrelas.');
            return;
        }
        setSubmitting(true);
        setError('');
        try {
            await api.post('/avaliacoes', {
                token,
                nota,
                comentario,
            });
            setSuccess(true);
        } catch (err) {
            setError('Ocorreu um erro ao enviar sua avaliação. Tente novamente.');
        } finally {
            setSubmitting(false);
        }
    };
    
    if (loading) return <div className="avaliacao-container"><p>Carregando...</p></div>;
    if (error) return <div className="avaliacao-container"><div className="avaliacao-card error">{error}</div></div>;

    if (success) {
        return (
            // ALTERADO: Adicionada uma 'key' para a tela de sucesso
            <div className="avaliacao-container" key="success-view">
                <div className="avaliacao-card">
                    <div className="logo-circle">
                        {empresa?.LOGO ? <img src={empresa.LOGO} alt={empresa.NOME_EMPRESA} /> : '⭐'}
                    </div>
                    <h1>Obrigado!</h1>
                    <p>Sua avaliação sobre a <strong>{empresa.NOME_EMPRESA}</strong> foi registrada com sucesso.</p>
                </div>
            </div>
        );
    }

    return (
        // ALTERADO: Adicionada uma 'key' para a tela do formulário
        <div className="avaliacao-container" key="form-view">
            <div className="avaliacao-card">
                <div className="logo-circle">
                    {empresa?.LOGO ? <img src={empresa.LOGO} alt={empresa.NOME_EMPRESA} /> : '🏢'}
                </div>
                <h1>Avalie {empresa?.NOME_EMPRESA}</h1>
                <p>Sua opinião é muito importante para nós!</p>

                <form onSubmit={handleSubmit}>
                    <div className="estrelas-container">
                        {[...Array(5)].map((_, index) => {
                            const notaEstrela = index + 1;
                            return (
                                <FaStar
                                    key={notaEstrela}
                                    className="estrela"
                                    color={notaEstrela <= (hoverNota || nota) ? '#ffc107' : '#e4e5e9'}
                                    size={40}
                                    onClick={() => setNota(notaEstrela)}
                                    onMouseEnter={() => setHoverNota(notaEstrela)}
                                    onMouseLeave={() => setHoverNota(0)}
                                />
                            );
                        })}
                    </div>

                    <textarea
                        className="comentario-textarea"
                        placeholder="Deixe um comentário (opcional)..."
                        value={comentario}
                        onChange={(e) => setComentario(e.target.value)}
                    />

                    <button type="submit" className="submit-button" disabled={submitting}>
                        {submitting ? 'Enviando...' : 'Enviar Avaliação'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AvaliacaoEmpresaPage;