import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import { useMutation } from '@tanstack/react-query';
import { ShieldCheck, ShieldAlert, Copy, Check, X } from 'lucide-react';
import { authApi } from '../services/api';
import { useAuthStore } from '../store/auth.store';
import { Btn, Badge } from './ui';

const campoInputStyle = {
  width: '100%', height: 40, padding: '0 12px', background: '#F4F8FC',
  border: '1px solid #DCE6F0', borderRadius: 8, color: '#0D1B2A',
  fontSize: 13.5, outline: 'none', boxSizing: 'border-box',
};

function Campo({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: '#3B5B7A', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</label>
      {children}
    </div>
  );
}

function Card({ icon: Icon, title, subtitle, children }) {
  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--blue-bg)', flexShrink: 0 }}>
          <Icon size={16} color="var(--blue)" />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)' }}>{title}</div>
          {subtitle && <div style={{ fontSize: 11.5, color: 'var(--txt-3)' }}>{subtitle}</div>}
        </div>
      </div>
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>{children}</div>
    </div>
  );
}

// Sección "Verificación en dos pasos" para una pantalla de Perfil — la usan
// tanto el Perfil del panel de tenant como el del super-admin, porque ambos
// son cuentas Usuario con el mismo mecanismo de 2FA.
export default function Seccion2FA() {
  const usuario = useAuthStore((s) => s.usuario);
  const setUsuario = useAuthStore((s) => s.setUsuario);

  const [paso, setPaso] = useState('estado'); // estado | setup | recuperacion | desactivar
  const [setupData, setSetupData] = useState(null);
  const [codigoConfirmar, setCodigoConfirmar] = useState('');
  const [codigosRecuperacion, setCodigosRecuperacion] = useState(null);
  const [passwordDesactivar, setPasswordDesactivar] = useState('');
  const [copiado, setCopiado] = useState(false);

  const refrescarUsuario = async () => {
    const { data } = await authApi.me();
    setUsuario(data.usuario);
  };

  const iniciarM = useMutation({
    mutationFn: () => authApi.iniciar2FA().then((r) => r.data),
    onSuccess: (data) => { setSetupData(data); setPaso('setup'); },
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo iniciar la activación'),
  });

  const confirmarM = useMutation({
    mutationFn: () => authApi.confirmar2FA(codigoConfirmar).then((r) => r.data),
    onSuccess: async (data) => {
      setCodigosRecuperacion(data.codigosRecuperacion);
      setPaso('recuperacion');
      await refrescarUsuario();
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Código incorrecto'),
  });

  const desactivarM = useMutation({
    mutationFn: () => authApi.desactivar2FA(passwordDesactivar),
    onSuccess: async () => {
      toast.success('Verificación en dos pasos desactivada');
      setPaso('estado');
      setPasswordDesactivar('');
      await refrescarUsuario();
    },
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo desactivar'),
  });

  const terminarYVolver = () => {
    setPaso('estado');
    setSetupData(null);
    setCodigoConfirmar('');
    setCodigosRecuperacion(null);
  };

  if (paso === 'recuperacion') {
    return (
      <Card icon={ShieldCheck} title="Verificación en dos pasos activada" subtitle="Guardá estos códigos de recuperación — no se van a volver a mostrar">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, background: 'var(--bg-3)', border: '1px solid var(--border-2)', borderRadius: 8, padding: 14, fontFamily: 'var(--font-mono)', fontSize: 13 }}>
          {codigosRecuperacion.map((c) => <div key={c}>{c}</div>)}
        </div>
        <p style={{ fontSize: 11.5, color: 'var(--red)', margin: 0 }}>
          Cada código sirve una sola vez, para entrar si perdés el acceso a tu app de autenticación.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn
            variant="ghost" icon={copiado ? <Check size={14} /> : <Copy size={14} />}
            onClick={() => { navigator.clipboard.writeText(codigosRecuperacion.join('\n')); setCopiado(true); setTimeout(() => setCopiado(false), 1500); }}
          >
            Copiar todos
          </Btn>
          <Btn onClick={terminarYVolver}>Listo, ya los guardé</Btn>
        </div>
      </Card>
    );
  }

  if (paso === 'setup') {
    return (
      <Card icon={ShieldCheck} title="Activar verificación en dos pasos">
        <p style={{ fontSize: 12.5, color: 'var(--txt-3)', margin: 0 }}>
          Escaneá este código con Google Authenticator, Authy, o cualquier app de códigos, y después ingresá el código de 6 dígitos que te muestre.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', padding: 16, background: '#fff', border: '1px solid var(--border)', borderRadius: 10 }}>
          <QRCodeSVG value={setupData.otpauthUrl} size={180} />
        </div>
        <Campo label="¿No podés escanear? Ingresá esta clave a mano">
          <input readOnly style={{ ...campoInputStyle, fontFamily: 'var(--font-mono)', fontSize: 12.5 }} value={setupData.secret} onFocus={(e) => e.target.select()} />
        </Campo>
        <form onSubmit={(e) => { e.preventDefault(); confirmarM.mutate(); }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Campo label="Código de 6 dígitos">
            <input
              required autoFocus style={{ ...campoInputStyle, fontSize: 18, letterSpacing: '0.15em', textAlign: 'center', fontFamily: 'var(--font-mono)' }}
              value={codigoConfirmar} onChange={(e) => setCodigoConfirmar(e.target.value)} placeholder="123456"
            />
          </Campo>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn type="button" variant="ghost" icon={<X size={14} />} onClick={terminarYVolver}>Cancelar</Btn>
            <Btn type="submit" loading={confirmarM.isPending} style={{ flex: 1 }}>Confirmar y activar</Btn>
          </div>
        </form>
      </Card>
    );
  }

  if (paso === 'desactivar') {
    return (
      <Card icon={ShieldAlert} title="Desactivar verificación en dos pasos">
        <form onSubmit={(e) => { e.preventDefault(); desactivarM.mutate(); }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Campo label="Confirmá tu contraseña">
            <input required type="password" style={campoInputStyle} value={passwordDesactivar} onChange={(e) => setPasswordDesactivar(e.target.value)} />
          </Campo>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn type="button" variant="ghost" onClick={() => { setPaso('estado'); setPasswordDesactivar(''); }}>Cancelar</Btn>
            <Btn type="submit" loading={desactivarM.isPending} variant="danger" style={{ flex: 1 }}>Desactivar</Btn>
          </div>
        </form>
      </Card>
    );
  }

  const habilitado = Boolean(usuario?.totpHabilitado);

  return (
    <Card icon={habilitado ? ShieldCheck : ShieldAlert} title="Verificación en dos pasos" subtitle="Un código extra de tu celular, además de la contraseña">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Badge color={habilitado ? 'green' : 'yellow'}>{habilitado ? 'Activada' : 'Desactivada'}</Badge>
        {habilitado
          ? <Btn variant="ghost" onClick={() => setPaso('desactivar')}>Desactivar</Btn>
          : <Btn loading={iniciarM.isPending} onClick={() => iniciarM.mutate()}>Activar</Btn>}
      </div>
    </Card>
  );
}
