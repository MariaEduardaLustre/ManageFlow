import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Alert, Button, Form } from 'react-bootstrap';
import Menu from '../Menu/Menu';
import api from '../../services/api';
import './Dashboard.css';

// Componente para personalizar o tooltip do gráfico de tempo de espera
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const minutosTotais = payload[0].value;
        const minutos = Math.floor(minutosTotais);
        const segundos = Math.round((minutosTotais - minutos) * 60);

        return (
            <div className="custom-tooltip" style={{ backgroundColor: '#fff', padding: '10px', border: '1px solid #ccc' }}>
                <p className="label">{`Hora: ${label}h`}</p>
                <p className="intro" style={{ color: payload[0].color }}>{`Tempo de Espera: ${minutos} min ${segundos} seg`}</p>
            </div>
        );
    }
    return null;
};


// Componente para exibir os gráficos de horários de pico
const HorariosDePico = ({ idEmpresa, idFila }) => {
    const [dadosPico, setDadosPico] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchHorariosDePico = async () => {
            if (!idEmpresa || !idFila) {
                setLoading(false);
                return;
            }
            setLoading(true);
            setError(null);
            try {
                const response = await api.get(`/empresas/horarios-de-pico/${idEmpresa}/${idFila}`);
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
    }, [idEmpresa, idFila]);

    const exportarCSV = () => {
        if (!dadosPico || !dadosPico.dadosPorHora || dadosPico.dadosPorHora.length === 0) return;
        const headers = ["Hora", "Total de Clientes"];
        const csvContent = "data:text/csv;charset=utf-8," + headers.join(";") + "\n" + dadosPico.dadosPorHora.map(e => `${e.hora};${e.total_clientes}`).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `horarios_de_pico_${idEmpresa}_${idFila}.csv`);
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
        link.setAttribute("download", `horarios_de_pico_${idEmpresa}_${idFila}.json`);
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
                    <BarChart data={dadosPico.dadosPorHora.sort((a, b) => a.hora - b.hora)} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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


// Componente para exibir os gráficos de tempo de espera
const TempoDeEspera = ({ idEmpresa, idFila }) => {
    const [dadosEspera, setDadosEspera] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchTemposEspera = async () => {
            if (!idEmpresa || !idFila) {
                setLoading(false);
                return;
            }
            setLoading(true);
            setError(null);
            try {
                const response = await api.get(`/empresas/tempo-espera/${idEmpresa}/${idFila}`);
                setDadosEspera(response.data);
            } catch (err) {
                console.error('Erro ao buscar tempo de espera:', err);
                if (err.response && err.response.status === 404) {
                    setError('Nenhum dado de tempo de espera encontrado para esta empresa.');
                } else {
                    setError('Não foi possível carregar os dados. Tente novamente mais tarde.');
                }
            } finally {
                setLoading(false);
            }
        };
        fetchTemposEspera();
    }, [idEmpresa, idFila]);

    if (loading) {
        return <div className="text-center my-4">Carregando dados de tempo de espera...</div>;
    }
    if (error) {
        return <Alert variant="danger" className="mt-4">{error}</Alert>;
    }
    if (!dadosEspera || dadosEspera.length === 0) {
        return <Alert variant="info" className="mt-4">Nenhum dado de tempo de espera disponível para análise.</Alert>;
    }

    return (
        <div className="container-pico mt-4">
            <h3>Tempo Médio de Espera por Hora</h3>
            <div className="chart-container">
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={dadosEspera}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="hora" label={{ value: "Hora do Dia", position: 'insideBottom', offset: -5 }} />
                        <YAxis label={{ value: "Minutos", angle: -90, position: 'insideLeft' }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Line type="monotone" dataKey="media_espera_minutos" stroke="#82ca9d" name="Tempo de Espera" />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};


const Dashboard = () => {
    const [idEmpresa, setIdEmpresa] = useState(null);
    const [filas, setFilas] = useState([]);
    const [selectedFila, setSelectedFila] = useState(null);

    useEffect(() => {
        const empresaSelecionada = JSON.parse(localStorage.getItem('empresaSelecionada'));
        if (empresaSelecionada && empresaSelecionada.ID_EMPRESA) {
            const id = empresaSelecionada.ID_EMPRESA;
            setIdEmpresa(id);
            fetchFilas(id);
        }
    }, []);

    const fetchFilas = async (id) => {
        try {
            const response = await api.get(`/empresas/filas/${id}`);
            if (response.data.length > 0) {
                setFilas(response.data);
                setSelectedFila(response.data[0]); // Seleciona a primeira fila por padrão
            }
        } catch (err) {
            console.error('Erro ao buscar filas para seleção:', err);
        }
    };

    const handleFilaChange = (e) => {
        const idFilaSelecionada = e.target.value;
        const fila = filas.find(f => f.ID_FILA.toString() === idFilaSelecionada);
        setSelectedFila(fila);
    };

    return (
        <div className="dashboard-container">
            <Menu />
            <div className="dashboard-content">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h1>Dashboard</h1>
                    {filas.length > 0 && (
                        <Form.Group className="dashboard-select-group">
                            <Form.Label className="me-2">Selecionar Fila:</Form.Label>
                            <Form.Select value={selectedFila?.ID_FILA || ''} onChange={handleFilaChange}>
                                {filas.map(f => (
                                    <option key={f.ID_FILA} value={f.ID_FILA}>
                                        {f.NOME_FILA}
                                    </option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                    )}
                </div>

                {/* Renderização condicional com base na seleção da fila */}
                {idEmpresa && selectedFila ? (
                    <>
                        <p>Análise de dados para a fila **{selectedFila.NOME_FILA}**</p>
                        <HorariosDePico idEmpresa={idEmpresa} idFila={selectedFila.ID_FILA} />
                        <TempoDeEspera idEmpresa={idEmpresa} idFila={selectedFila.ID_FILA} />
                    </>
                ) : (
                    <p className="text-center text-muted">Selecione uma empresa ou aguarde o carregamento das filas.</p>
                )}
            </div>
        </div>
    );
};

export default Dashboard;