"use client";

import { useState } from "react";
import { validateCredentials, type AuthUser } from "@/app/types/auth";

interface LoginScreenProps {
  onLoginSuccess: (user: AuthUser) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [selectedUser, setSelectedUser] = useState<string>("Andrea AIFA — Administrador de GPGC");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedUser) {
      setError("Por favor seleccione un usuario autorizado.");
      return;
    }
    if (!password) {
      setError("Por favor ingrese su contraseña de acceso.");
      return;
    }
    setError(null);
    setLoading(true);

    setTimeout(() => {
      const user = validateCredentials(selectedUser, password);
      if (user) {
        onLoginSuccess(user);
      } else {
        setError("Contraseña incorrecta para el usuario seleccionado.");
        setLoading(false);
      }
    }, 250);
  };

  return (
    <div className="gpgc-login-viewport">
      <div className="gpgc-login-card">
        {/* Logo Superior AIFA Horizontal */}
        <div className="gpgc-login-logo-container">
          <img
            src="/brand/aifa-logo-horizontal-dark.png"
            alt="Aeropuerto Internacional Felipe Ángeles"
            className="gpgc-login-logo"
          />
        </div>

        {/* Encabezado Institucional GPGC */}
        <div className="gpgc-login-header">
          <span className="gpgc-login-kicker">DIRECCIÓN COMERCIAL Y DE SERVICIOS</span>
          <h1 className="gpgc-login-title">GPGC App</h1>
          <p className="gpgc-login-subtitle">Grupo de Prospección y Gestión Comercial</p>
        </div>

        {/* Formulario de Acceso */}
        <form onSubmit={handleSubmit} className="gpgc-login-form">
          {/* Selector de Usuario / Integrante GPGC */}
          <div className="gpgc-form-group">
            <label htmlFor="gpgc-user-select" className="gpgc-label">
              Usuario / Integrante GPGC
            </label>
            <div className="gpgc-select-wrapper">
              <select
                id="gpgc-user-select"
                value={selectedUser}
                onChange={(e) => {
                  setSelectedUser(e.target.value);
                  setError(null);
                }}
                className="gpgc-select"
                required
              >
                <option value="Andrea AIFA — Administrador de GPGC">
                  Andrea AIFA — Administrador de GPGC
                </option>
                <option value="Encargada de la Subdirección Servicios Comerciales">
                  Encargada de la Subdirección — Servicios Comerciales
                </option>
                <option value="Gerente de Servicios Comerciales">
                  Gerente de Servicios Comerciales — GSC
                </option>
                <option value="Auxiliar Administrativo">
                  Auxiliar Administrativo — Servicios Comerciales
                </option>
                <option value="Invitado">
                  Invitado — Solo Consulta
                </option>
              </select>
              <span className="gpgc-select-arrow" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </span>
            </div>
          </div>

          {/* Campo de Contraseña de Acceso */}
          <div className="gpgc-form-group">
            <label htmlFor="gpgc-password-input" className="gpgc-label">
              Contraseña de acceso
            </label>
            <div className="gpgc-input-wrapper">
              <input
                id="gpgc-password-input"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                placeholder="Ingresa tu contraseña"
                className="gpgc-input"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="gpgc-pwd-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                title={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Mensaje de Error */}
          {error && (
            <div className="gpgc-error-alert" role="alert">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Botón Iniciar Sesión › */}
          <button
            type="submit"
            disabled={loading || !selectedUser || !password}
            className="gpgc-submit-btn"
          >
            {loading ? "Iniciando Sesión..." : "Iniciar Sesión ›"}
          </button>
        </form>
      </div>
    </div>
  );
}
