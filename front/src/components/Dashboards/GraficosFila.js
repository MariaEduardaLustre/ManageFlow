import React from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar,
    ScatterChart, Scatter,
} from 'recharts';

const diasSemanaMap = {
    1: 'Dom',
    2: 'Seg',
    3: 'Ter',
    4: 'Qua',
    5: 'Qui',
    6: 'Sex',
    7: 'Sáb',
};

const GraficosFila = ({ dados, nomeFila }) => {
    // 1. Fluxo por hora
    const fluxoHoraData = dados.fluxoPorHora.map(item => ({
        hora: `${item.hora}:00`,
        clientes: item.qtd_clientes != null ? Number(item.qtd_clientes) : 0,
    }));

    // 2. Heatmap simplificado (dia da semana vs hora)
    const heatmapData = {};
    dados.fluxoPorDiaHora.forEach(({ dia_semana, hora, qtd_clientes }) => {
        const key = diasSemanaMap[dia_semana] || dia_semana;
        if (!heatmapData[key]) heatmapData[key] = {};
        heatmapData[key][hora] = qtd_clientes != null ? Number(qtd_clientes) : 0;
    });

    const heatmapArray = Object.entries(heatmapData).map(([dia, horas]) => ({
        dia,
        ...horas,
    }));

    const horasUnicas = [...new Set(dados.fluxoPorDiaHora.map(item => item.hora))].sort((a, b) => a - b);

    // 3. Tempo de espera por cliente
    const esperaTempoData = dados.tempoEspera
        .map((item, idx) => ({
            nome: idx,
            tempo: item.tempo_espera_min != null ? Number(item.tempo_espera_min) : 0,
        }))
        .filter(item => item.tempo !== null && item.tempo !== undefined);

    // 4. Tempo médio de espera por dia
    const esperaMediaData = dados.tempoEsperaMedia.map(item => ({
        data: item.data,
        media: item.media_espera != null ? parseFloat(item.media_espera) : 0,
    }));

    // 5. Tempo de permanência
    const permanenciaData = dados.tempoPermanencia.map(item => {
        const horaChegada = new Date(item.DT_ENTRA).getHours();
        return {
            horaChegada,
            tempoPermanencia: item.tempo_permanencia_min != null ? Number(item.tempo_permanencia_min) : 0,
        };
    });

    return (
        <div className="graficos-fila-container">
            <h2>Gráficos da fila: {nomeFila}</h2>

            <section>
                <h3>1. Fluxo de clientes por hora</h3>
                <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={fluxoHoraData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="hora" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="clientes" stroke="#8884d8" />
                    </LineChart>
                </ResponsiveContainer>
            </section>

            <section>
                <h3>2. Distribuição por dia da semana vs horário (Heatmap simplificado)</h3>
                <div style={{ overflowX: 'auto' }}>
                    <table border="1" cellPadding="5" style={{ borderCollapse: 'collapse', width: '100%' }}>
                        <thead>
                            <tr>
                                <th>Dia / Hora</th>
                                {horasUnicas.map(h => (
                                    <th key={h}>{h}:00</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {heatmapArray.map(row => (
                                <tr key={row.dia}>
                                    <td>{row.dia}</td>
                                    {horasUnicas.map(h => (
                                        <td
                                            key={h}
                                            style={{
                                                backgroundColor: row[h]
                                                    ? `rgba(136, 132, 216, ${Math.min(row[h] / 10, 1)})`
                                                    : 'transparent',
                                                textAlign: 'center'
                                            }}
                                        >
                                            {row[h] || 0}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
{/** 
            <section>
                <h3>3. Histograma: Frequência de entrada dos clientes</h3>
                <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={fluxoHoraData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="hora" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="clientes" fill="#82ca9d" />
                    </BarChart>
                </ResponsiveContainer>
            </section>

            <section>
                <h3>4. Tempo médio de espera (histograma)</h3>
                <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={esperaTempoData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="nome" hide />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="tempo" fill="#ffc658" />
                    </BarChart>
                </ResponsiveContainer>
            </section>

            <section>
                <h3>5. Evolução diária do tempo médio de espera</h3>
                <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={esperaMediaData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="data" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="media" stroke="#d88484" />
                    </LineChart>
                </ResponsiveContainer>
            </section>

            <section>
                <h3>6. Tempo total de permanência vs horário de chegada (dispersão)</h3>
                <ResponsiveContainer width="100%" height={200}>
                    <ScatterChart>
                        <CartesianGrid />
                        <XAxis type="number" dataKey="horaChegada" name="Hora Chegada" unit="h" />
                        <YAxis type="number" dataKey="tempoPermanencia" name="Tempo Permanência" unit="min" />
                        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                        <Scatter name="Permanência" data={permanenciaData} fill="#8884d8" />
                    </ScatterChart>
                </ResponsiveContainer>
            </section> */}
        </div>
    );
};

export default GraficosFila;
