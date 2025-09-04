import React, { useEffect, useState } from 'react';
import axios from 'axios';
import GraficosFila from './GraficosFila';

const DashboardComDados = ({ idFila, nomeFila }) => {
    const [dados, setDados] = useState(null);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState(null);

    useEffect(() => {
        const buscarDados = async () => {
            try {
                const response = await axios.get(`/api/dashboard/dados-graficos/${idFila}`);
                setDados(response.data);
            } catch (err) {
                console.error('Erro ao buscar dados:', err);
                setErro('Erro ao carregar os dados do dashboard.');
            } finally {
                setCarregando(false);
            }
        };

        buscarDados();
    }, [idFila]);

    if (carregando) return <p>Carregando dados...</p>;
    if (erro) return <p>{erro}</p>;
    if (!dados) return <p>Nenhum dado disponível.</p>;

    return <GraficosFila dados={dados} nomeFila={nomeFila} />;
};

export default DashboardComDados;
