import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import api from '../../services/api';
import { Button, Alert } from 'react-bootstrap';
import './HorariosDePico.css';

const HorariosDePico = ({ idEmpresa }) => {
    const [dadosPico, setDadosPico] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchHorariosDePico = async () => {
            if (!idEmpresa) {
                setError('ID da empresa não fornecido.');
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);
            try {
                const response = await api.get(`/empresas/horarios-de-pico/${idEmpresa}`);
                setDadosPico(response.data);
            } catch (err) {
                console.error('Erro ao buscar dados de pico:', err);
                if (err.response && err.response.status === 404) {
                    setError('Não há dados de fila suficientes para esta empresa.');
                } else {
                    setError('Não foi possível carregar os dados. Tente novamente mais tarde.');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchHorariosDePico();
    }, [idEmpresa]);

    const exportarCSV = () => {
        if (!dadosPico || !dadosPico.dadosPorHora || dadosPico.dadosPorHora.length === 0) return;
        const headers = ["Hora", "Total de Clientes"];
        const csvContent = "data:text/csv;charset=utf-8," + headers.join(";") + "\n" + dadosPico.dadosPorHora.map(e => `${e.hora};${e.total_clientes}`).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `horarios_de_pico_${idEmpresa}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportarJSON = () => {
        if (!dadosPico || !dadosPico.dadosPorHora || dadosPico.dadosPorHora.length === 0) return;
        const jsonContent = JSON.stringify(dadosPico.dadosPorHora, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `horarios_de_pico_${idEmpresa}.json`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    if (loading) {
        return <div className="text-center my-4">Carregando dados de pico...</div>;
    }

    if (error) {
        return <Alert variant="danger" className="mt-4">{error}</Alert>;
    }

    if (!dadosPico || dadosPico.dadosPorHora.length === 0) {
        return <Alert variant="info" className="mt-4">Nenhum dado de pico disponível para análise.</Alert>;
    }
    
    return (
        <div className="container-pico">
            <h3>Análise de Horários de Pico</h3>
            <div className="destaque-pico mt-3">
                <p><strong>{dadosPico.horarioDePico}</strong></p>
            </div>
            
            <div className="chart-container">
                <h4 className="mt-4">Movimento por Hora do Dia</h4>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dadosPico.dadosPorHora} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="hora" label={{ value: "Hora do Dia", position: 'insideBottom', offset: -5 }} />
                        <YAxis label={{ value: "Nº de Clientes", angle: -90, position: 'insideLeft' }} />
                        <Tooltip />
                        <Bar dataKey="total_clientes" fill="#8884d8" name="Clientes" />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="botoes-exportacao mt-4">
                <Button onClick={exportarCSV} variant="success" className="me-2">Exportar para CSV</Button>
                <Button onClick={exportarJSON} variant="secondary">Exportar para JSON</Button>
            </div>
        </div>
    );
};

export default HorariosDePico;