import React from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
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

const GraficosFila = ({ dados = {}, nomeFila = '', metaDeClientes = 100 }) => {
    // Valores seguros
    const fluxoPorHora = Array.isArray(dados.fluxoPorHora) ? dados.fluxoPorHora : [];

    // 1. Fluxo por hora
    const fluxoHoraData = fluxoPorHora.map(item => ({
        hora: new Date(2000, 0, 1, item.hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),  // Formata a hora
        clientes: item.qtd_clientes != null ? Number(item.qtd_clientes) : 0,
    }));

    // 2. Custom Tooltip
    const CustomTooltip = ({ payload, label }) => {
        if (payload.length === 0) return null;
        const { clientes } = payload[0].payload;
        return (
            <div style={{
                backgroundColor: '#fff', padding: '10px', borderRadius: '4px', border: '1px solid #ddd',
                boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
            }}>
                <p><strong>{label}</strong></p>
                <p><strong>Clientes:</strong> {clientes}</p>
            </div>
        );
    };

    return (
        <div className="graficos-fila-container">
            <h2>Gráficos da fila: {nomeFila}</h2>

            {/* Fluxo de clientes por hora */}
            <section>
                <h3>{nomeFila} - Fluxo de clientes por hora</h3>
                <p>Este gráfico mostra o número de clientes que entram na fila a cada hora durante o período analisado.</p>
                {fluxoHoraData.length === 0 ? (
                    <p>Sem dados disponíveis</p>
                ) : (
                    <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={fluxoHoraData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="hora" />
                            <YAxis />
                            <Tooltip content={<CustomTooltip />} />
                            <Line type="monotone" dataKey="clientes" stroke="#ff7300" strokeWidth={3} />
                            <ReferenceLine y={metaDeClientes} label="Meta" stroke="red" strokeDasharray="3 3" />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </section>
        </div>
    );
};

export default GraficosFila;
