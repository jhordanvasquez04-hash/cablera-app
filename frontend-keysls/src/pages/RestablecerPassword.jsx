import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';
import { authApi } from '../services/api';

const inputStyle = {
  width: '100%', padding: '11px 14px', borderRadius: 10,
  border: '1px solid #E2ECF4', background: '#F4F8FC',
  fontSize: 13.5, color: '#0D1B2A', outline: 'none',
  transition: 'border-color .15s', boxSizing: 'border-box',
};

export default function RestablecerPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [listo, setListo] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirmar) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setLoading(true);
    try {
      await authApi.restablecerPassword({ token, password });
      setListo(true);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo restablecer la contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFFFF', fontFamily: 'Inter, sans-serif', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 340 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#1E3A8A' }}>K</span>
          </div>
          <span style={{ fontSize: 15, fontWeight: 800, color: '#0D1B2A' }}>Keysls</span>
        </div>

        {!token ? (
          <div>
            <h1 style={{ fontSize: 19, fontWeight: 800, color: '#0D1B2A', margin: '0 0 8px' }}>Enlace inválido</h1>
            <p style={{ fontSize: 13, color: '#5A7A9A', margin: '0 0 20px', lineHeight: 1.5 }}>
              Este enlace no incluye un token de restablecimiento. Solicita uno nuevo.
            </p>
            <Link to="/olvide-password" style={{ fontSize: 13, fontWeight: 700, color: '#1E3A8A' }}>Solicitar enlace nuevo</Link>
          </div>
        ) : listo ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
              <CheckCircle2 size={24} color="#16A34A" />
            </div>
            <h1 style={{ fontSize: 19, fontWeight: 800, color: '#0D1B2A', margin: '0 0 8px' }}>Contraseña actualizada</h1>
            <p style={{ fontSize: 13, color: '#5A7A9A', margin: '0 0 20px' }}>Ya puedes iniciar sesión con tu nueva contraseña.</p>
            <button
              onClick={() => navigate('/login')}
              style={{ width: '100%', padding: '12px', borderRadius: 10, background: '#1E3A8A', color: '#fff', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer' }}
            >
              Ir a iniciar sesión
            </button>
          </div>
        ) : (
          <>
            <h1 style={{ fontSize: 21, fontWeight: 800, color: '#0D1B2A', margin: '0 0 6px' }}>Nueva contraseña</h1>
            <p style={{ fontSize: 13, color: '#8AAABB', margin: '0 0 28px' }}>Elige una contraseña nueva para tu cuenta</p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#4A6A8A', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Contraseña nueva
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres" autoComplete="new-password" required autoFocus
                    style={{ ...inputStyle, padding: '11px 40px 11px 14px' }}
                    onFocus={e => e.target.style.borderColor = '#1E3A8A'}
                    onBlur={e => e.target.style.borderColor = '#E2ECF4'}
                  />
                  <button type="button" onClick={() => setShowPass(v => !v)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#8AAABB', padding: 0, display: 'flex' }}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#4A6A8A', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Confirmar contraseña
                </label>
                <input
                  type={showPass ? 'text' : 'password'} value={confirmar} onChange={e => setConfirmar(e.target.value)}
                  placeholder="Repite la contraseña" autoComplete="new-password" required
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#1E3A8A'}
                  onBlur={e => e.target.style.borderColor = '#E2ECF4'}
                />
              </div>

              {error && (
                <div style={{ fontSize: 12, color: '#DC2626', padding: '10px 14px', background: 'rgba(220,38,38,0.07)', borderRadius: 8, border: '1px solid rgba(220,38,38,0.2)', borderLeft: '3px solid #DC2626' }}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} style={{
                width: '100%', padding: '12px', borderRadius: 10,
                background: loading ? '#93AECB' : '#1E3A8A',
                color: '#fff', fontSize: 14, fontWeight: 700,
                border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                {loading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Guardando…</> : 'Restablecer contraseña'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
