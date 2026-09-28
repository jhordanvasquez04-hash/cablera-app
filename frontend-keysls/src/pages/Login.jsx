import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Loader2, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../store/auth.store';

export default function Login() {
  const navigate = useNavigate();
  const { login, confirmarLogin2FA, loading } = useAuthStore();

  const [form,     setForm]     = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [error,    setError]    = useState('');
  const [loginToken, setLoginToken] = useState(null);
  const [codigo2FA, setCodigo2FA] = useState('');

  const irSegunRol = () => {
    const rolActual = useAuthStore.getState().usuario?.rol;
    navigate(rolActual === 'SUPERADMIN' ? '/admin' : '/');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const res = await login(form.email, form.password);
    if (!res.ok) return setError(res.error);
    if (res.requiere2FA) return setLoginToken(res.loginToken);
    irSegunRol();
  };

  const handleSubmit2FA = async (e) => {
    e.preventDefault();
    setError('');
    const res = await confirmarLogin2FA(loginToken, codigo2FA);
    if (res.ok) irSegunRol();
    else        setError(res.error);
  };

  const volverACredenciales = () => {
    setLoginToken(null);
    setCodigo2FA('');
    setError('');
  };

  const inputStyle = {
    width: '100%', padding: '11px 14px', borderRadius: 10,
    border: '1px solid #E2ECF4', background: '#F4F8FC',
    fontSize: 13.5, color: '#0D1B2A', outline: 'none',
    transition: 'border-color .15s', boxSizing: 'border-box',
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: 'Inter, sans-serif' }}>
      {/* Panel izquierdo: marca */}
      <div className="login-panel-marca" style={{
        flex: '0 0 42%', minHeight: '100vh', background: '#0D1B2A',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        padding: '40px 44px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.5,
          background: 'radial-gradient(circle at 20% 20%, rgba(37,99,235,0.25), transparent 55%), radial-gradient(circle at 85% 80%, rgba(37,99,235,0.18), transparent 50%)',
        }} />

        <div style={{ position: 'relative' }}>
          <span style={{ fontSize: 17, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>Keysls</span>
        </div>

        <blockquote style={{ margin: 0, position: 'relative' }}>
          <p style={{ fontSize: 21, fontWeight: 600, color: '#E7EEF6', lineHeight: 1.45, margin: '0 0 14px', maxWidth: 380 }}>
            "El sistema de gestión pensado para proveedores de internet: contratos, cobros, técnicos y soporte en un solo lugar."
          </p>
          <footer style={{ fontSize: 12.5, color: '#7C93AE', fontWeight: 600 }}>Sistema de Gestión ISP</footer>
        </blockquote>
      </div>

      {/* Panel derecho: formulario */}
      <div style={{
        flex: 1, minHeight: '100vh', background: '#FFFFFF',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}>
        <div style={{ width: '100%', maxWidth: 340 }}>
          <div className="login-marca-movil" style={{ display: 'none', alignItems: 'center', marginBottom: 28 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: '#0D1B2A' }}>Keysls</span>
          </div>

          {!loginToken ? (
            <>
              <h1 style={{ fontSize: 21, fontWeight: 800, color: '#0D1B2A', margin: '0 0 6px' }}>Iniciar sesión</h1>
              <p style={{ fontSize: 13, color: '#8AAABB', margin: '0 0 28px' }}>Ingresa tus credenciales para continuar</p>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#4A6A8A', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Correo electrónico
                  </label>
                  <input type="email" value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="tu@empresa.com" autoComplete="email" required
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#1E3A8A'}
                    onBlur={e  => e.target.style.borderColor = '#E2ECF4'} />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#4A6A8A', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Contraseña
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input type={showPass ? 'text' : 'password'} value={form.password}
                      onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                      placeholder="••••••••" autoComplete="current-password" required
                      style={{ ...inputStyle, padding: '11px 40px 11px 14px' }}
                      onFocus={e => e.target.style.borderColor = '#1E3A8A'}
                      onBlur={e  => e.target.style.borderColor = '#E2ECF4'} />
                    <button type="button" onClick={() => setShowPass(v => !v)}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#8AAABB', padding: 0, display: 'flex' }}>
                      {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                    </button>
                  </div>
                  <Link to="/olvide-password" style={{ display: 'block', textAlign: 'right', fontSize: 12, color: '#1E3A8A', fontWeight: 600, textDecoration: 'none', marginTop: 8 }}>
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>

                {error && <ErrorBox message={error} />}

                <BtnSubmit loading={loading} label="Ingresar" />
              </form>
            </>
          ) : (
            <>
              <button type="button" onClick={volverACredenciales}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#8AAABB', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: 18 }}>
                <ArrowLeft size={14} /> Volver
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <ShieldCheck size={17} color="#1E3A8A" />
                </div>
                <h1 style={{ fontSize: 19, fontWeight: 800, color: '#0D1B2A', margin: 0 }}>Verificación en dos pasos</h1>
              </div>
              <p style={{ fontSize: 13, color: '#8AAABB', margin: '0 0 28px' }}>
                Ingresa el código de 6 dígitos de tu app de autenticación, o un código de recuperación
              </p>

              <form onSubmit={handleSubmit2FA} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#4A6A8A', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Código
                  </label>
                  <input type="text" value={codigo2FA}
                    onChange={e => setCodigo2FA(e.target.value)}
                    placeholder="123456" autoComplete="one-time-code" required autoFocus
                    style={{ ...inputStyle, fontSize: 18, letterSpacing: '0.15em', textAlign: 'center', fontFamily: 'monospace' }}
                    onFocus={e => e.target.style.borderColor = '#1E3A8A'}
                    onBlur={e  => e.target.style.borderColor = '#E2ECF4'} />
                </div>

                {error && <ErrorBox message={error} />}

                <BtnSubmit loading={loading} label="Verificar" />
              </form>
            </>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .login-panel-marca { display: none !important; }
          .login-marca-movil { display: flex !important; }
        }
      `}</style>
    </div>
  );
}

function ErrorBox({ message }) {
  return (
    <div style={{ fontSize: 12, color: '#DC2626', padding: '10px 14px', background: 'rgba(220,38,38,0.07)', borderRadius: 8, border: '1px solid rgba(220,38,38,0.2)', borderLeft: '3px solid #DC2626' }}>
      {message}
    </div>
  );
}

function BtnSubmit({ loading, label }) {
  return (
    <button type="submit" disabled={loading}
      style={{
        width: '100%', padding: '12px', borderRadius: 10,
        background: loading ? '#93AECB' : '#1E3A8A',
        color: '#fff', fontSize: 14, fontWeight: 700,
        border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        transition: 'background .15s', marginTop: 4,
      }}
      onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#162d6e'; }}
      onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#1E3A8A'; }}>
      {loading
        ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }}/> Verificando…</>
        : label}
    </button>
  );
}
