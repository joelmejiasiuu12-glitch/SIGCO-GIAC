"use client";

import { useEffect, useRef } from "react";

const principles = [
  {
    number: "01",
    title: "Misión",
    text: "Administrar los servicios comerciales, aeroportuarios y complementarios, así como las actividades de gestión de calidad y publicidad, para mantener a la Entidad dentro de los márgenes de rentabilidad financiera y satisfacer las necesidades de los usuarios y público en general mediante estándares de calidad de los servicios.",
  },
  {
    number: "02",
    title: "Visión",
    text: "Para el año 2036 la Dirección Comercial y de Servicios habrá alcanzado la optimización de los espacios comerciales, para obtener un crecimiento en la rentabilidad y lograr los máximos niveles de calidad en los servicios que proporcionan y posicionar a la Entidad dentro de los aeropuertos líderes a nivel mundial.",
  },
  {
    number: "03",
    title: "Objetivo",
    text: "Maximizar el aprovechamiento del Aeropuerto Internacional Felipe Ángeles a través de la administración de los servicios aeroportuarios, complementarios y comerciales, proporcionando servicios de calidad e información oportuna.",
  },
];

const directionFunctions = [
  "Definir prioridades y líneas de acción para la gestión comercial y de servicios.",
  "Supervisar el desempeño de la cartera, la ocupación y el cumplimiento contractual.",
  "Coordinar decisiones con las áreas operativas, jurídicas, financieras y de atención.",
];

const subdirectionFunctions = [
  "Dar seguimiento a locales, contratos, convenios y condiciones comerciales.",
  "Integrar información confiable para indicadores, reportes y toma de decisiones.",
  "Impulsar acciones de comercialización, regularización y mejora de la oferta.",
];

export default function InstitutionalCenter({ open, onClose }: { open: boolean; onClose: () => void }) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    closeButtonRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="institutional-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="institutional-modal" role="dialog" aria-modal="true" aria-labelledby="institutional-modal-title">
        <button ref={closeButtonRef} type="button" className="institutional-modal-close" onClick={onClose} aria-label="Cerrar información institucional">×</button>

        <div className="institutional-center">
          <article className="institutional-intro">
            <div>
              <span className="section-kicker">Marco institucional</span>
              <h2 id="institutional-modal-title">Dirección Comercial y de Servicios</h2>
              <p>Identidad institucional que orienta la administración de los servicios comerciales, aeroportuarios y complementarios del Aeropuerto Internacional Felipe Ángeles.</p>
            </div>
            <span className="institutional-official-badge">Información institucional</span>
          </article>

          <div className="institutional-principles">
            {principles.map((principle) => (
              <article key={principle.title}>
                <span>{principle.number}</span>
                <h3>{principle.title}</h3>
                <p>{principle.text}</p>
              </article>
            ))}
          </div>

          <article className="institutional-structure">
            <div className="institutional-structure-heading">
              <span className="section-kicker">Estructura de actuación</span>
              <h2>De la dirección estratégica al seguimiento comercial</h2>
              <p>La Dirección establece el rumbo general y la Subdirección Comercial convierte esas prioridades en seguimiento operativo y analítico.</p>
            </div>
            <div className="institutional-levels">
              <section>
                <span className="institutional-level-label">Nivel directivo</span>
                <h3>Dirección Comercial y de Servicios</h3>
                <p>Orienta, coordina y supervisa la estrategia comercial y de servicios.</p>
                <ul>{directionFunctions.map((item) => <li key={item}>{item}</li>)}</ul>
              </section>
              <div className="institutional-connector" aria-hidden="true"><span>Coordinación</span></div>
              <section>
                <span className="institutional-level-label">Nivel de ejecución</span>
                <h3>Subdirección Comercial</h3>
                <p>Instrumenta y da seguimiento a la gestión de espacios y relaciones comerciales.</p>
                <ul>{subdirectionFunctions.map((item) => <li key={item}>{item}</li>)}</ul>
              </section>
            </div>
          </article>

          <article className="institutional-sigco">
            <div>
              <span className="section-kicker">Apoyo a la gestión</span>
              <h2>El papel de SIGCO</h2>
              <p>SIGCO concentra información operativa, contractual y financiera para transformar los registros de trabajo en consultas y análisis oportunos.</p>
            </div>
            <div className="institutional-sigco-points">
              <span><strong>01</strong>Información consolidada</span>
              <span><strong>02</strong>Seguimiento contractual</span>
              <span><strong>03</strong>Análisis financiero</span>
              <span><strong>04</strong>Reportes para decisión</span>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
