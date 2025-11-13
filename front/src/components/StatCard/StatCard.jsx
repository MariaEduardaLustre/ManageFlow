import React from "react";
import CountUp from "react-countup";

const StatCard = ({
  title,
  value,
  suffix,
  subtitle,
  precision = 0,
  icon,
  accent = "brand",
}) => (
  <div className={`mf-stat ${icon ? "mf-stat--with-icon" : ""} mf-stat--${accent}`}>
    {icon ? <div className="mf-stat-icon">{icon}</div> : null}

    <div className="mf-stat-content">
      <div className="mf-stat-title">{title}</div>

      <div className="mf-stat-value" aria-live="polite">
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
  </div>
);

export default StatCard;
