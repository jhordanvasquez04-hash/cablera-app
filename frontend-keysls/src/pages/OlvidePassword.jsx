import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2, MailCheck } from 'lucide-react';
import { authApi } from '../services/api';

const inputStyle = {
  width: '100%', padding: '11px 14px', borderRadius: 10,
  border: '1px solid #E2ECF4', background: '#F4F8FC',
  fontSize: 13.5, color: '#0D1B2A', outline: 'none',
  transition: 'border-color .15s', boxSizing: 'border-box',
};

export default function OlvidePassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [enviado, setEnviado] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.olvidePassword(email.trim());
      setEnviado(true);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo procesar la solicitud');
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

        {!enviado ? (
          <>
            <h1 style={{ fontSize: 21, fontWeight: 800, color: '#0D1B2A', margin: '0 0 6px' }}>¿Olvidaste tu contraseña?</h1>
            <p style={{ fontSize: 13, color: '#8AAABB', margin: '0 0 28px' }}>Ingresa tu correo y te enviamos instrucciones para restablecerla</p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#4A6A8A', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Correo electrónico
                </label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="tu@empresa.com" autoComplete="email" required autoFocus
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
                {loading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Enviando…</> : 'Enviar instrucciones'}
              </button>
            </form>
          </>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
              <MailCheck size={24} color="#16A34A" />
            </div>
            <h1 style={{ fontSize: 19, fontWeight: 800, color: '#0D1B2A', margin: '0 0 8px' }}>Revisa tu correo</h1>
            <p style={{ fontSize: 13, color: '#5A7A9A', margin: 0, lineHeight: 1.5 }}>
              Si <strong>{email}</strong> existe en el sistema, te llegarán instrucciones para restablecer tu contraseña en unos minutos.
            </p>
          </div>
        )}

        <Link to="/login" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 28, fontSize: 12.5, color: '#8AAABB', fontWeight: 600, textDecoration: 'none' }}>
          <ArrowLeft size={14} /> Volver a iniciar sesión
        </Link>
      </div>
    </div>
  );
}
