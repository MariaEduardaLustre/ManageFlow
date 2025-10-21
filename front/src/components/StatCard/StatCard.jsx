import React from "react";
import CountUp from "react-countup";
// Não precisamos importar CSS aqui, pois os estilos .mf-stat
// já estão no Dashboard.css global.

const StatCard = ({ title, value, suffix, subtitle, precision = 0 }) => (
    <div className="mf-stat">
        <div className="mf-stat-title">{title}</div>
        <div className="mf-stat-value">
            <CountUp 
                end={Number(value || 0)} 
                duration={0.6} 
                separator="." 
                decimal=","
                decimals={precision}
            />
            {suffix ? <span className="mf-stat-suffix">{suffix}</span> : null}
        </div>
        {subtitle ? <div className="mf-stat-sub">{subtitle}</div> : null}
    </div>
);

export default StatCard;