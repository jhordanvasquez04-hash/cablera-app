import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { UserCircle, Plus } from 'lucide-react';
import { authApi, superadminApi } from '../../services/api';
import { useAuthStore } from '../../store/auth.store';
import { Btn, Modal, Table, Tr, Td } from '../../components/ui';
import Seccion2FA from '../../components/Seccion2FA';

const campoInputStyle = {
  width: '100%', height: 40, padding: '0 12px', background: '#E1EBF5',
  border: '1px solid #C9DAEA', borderRadius: 8, color: '#1E3A5F',
  fontSize: 13.5, outline: 'none', boxSizing: 'border-box',
};

function Campo({ label, required, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: '#1E3A5F' }}>{label}{required && <span> *</span>}</label>
      {children}
    </div>
  );
}

function fmtFecha(f) {
  return new Date(f).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}

function FormPassword() {
  const [form, setForm] = useState({ actual: '', nuevo: '' });

  const passwordM = useMutation({
    mutationFn: () => authApi.cambiarPassword({ passwordActual: form.actual, passwordNuevo: form.nuevo }),
    onSuccess: () => { toast.success('Contraseña actualizada'); setForm({ actual: '', nuevo: '' }); },
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo cambiar la contraseña'),
  });

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20, maxWidth: 420 }}>
      <h2 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: 'var(--txt)' }}>Cambiar mi contraseña</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Campo label="Contraseña actual">
          <input type="password" style={campoInputStyle} value={form.actual} onChange={(e) => setForm({ ...form, actual: e.target.value })} />
        </Campo>
        <Campo label="Contraseña nueva">
          <input type="password" style={campoInputStyle} placeholder="Mínimo 6 caracteres" value={form.nuevo} onChange={(e) => setForm({ ...form, nuevo: e.target.value })} />
        </Campo>
        <Btn
          disabled={!form.actual || form.nuevo.length < 6 || passwordM.isPending}
          loading={passwordM.isPending}
          onClick={() => passwordM.mutate()}
          style={{ alignSelf: 'flex-start' }}
        >
          Cambiar contraseña
        </Btn>
      </div>
    </div>
  );
}

function SeccionOtrosSuperAdmins() {
  const qc = useQueryClient();
  const usuarioActual = useAuthStore((s) => s.usuario);
  const [modal, setModal] = useState(null);

  const superAdminsQ = useQuery({
    queryKey: ['superadmin', 'superadmins'],
    queryFn: () => superadminApi.listarSuperAdmins().then((r) => r.data),
  });

  const crearM = useMutation({
    mutationFn: () => superadminApi.crearSuperAdmin(modal),
    onSuccess: () => {
      toast.success('Super-admin creado');
      setModal(null);
      qc.invalidateQueries({ queryKey: ['superadmin', 'superadmins'] });
    },
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo crear el super-admin'),
  });

  const superAdmins = superAdminsQ.data || [];
  const formValido = modal?.nombre?.trim() && modal?.apellido?.trim() && modal?.email?.trim() && modal?.password?.length >= 6;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--txt)' }}>Otros super-admins</h2>
        <Btn variant="ghost" size="sm" icon={<Plus size={13} />} onClick={() => setModal({ nombre: '', apellido: '', email: '', password: '' })}>
          Crear super-admin
        </Btn>
      </div>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <Table headers={['Nombre', 'Email', 'Desde']} loading={superAdminsQ.isLoading}>
          {superAdmins.length === 0 ? (
            <tr><td colSpan={3} style={{ padding: 28, textAlign: 'center', color: 'var(--txt-3)', fontSize: 13 }}>Sin otros super-admins</td></tr>
          ) : superAdmins.map((s) => (
            <Tr key={s.id}>
              <Td style={{ fontWeight: 600 }}>{s.nombre} {s.apellido}{s.id === usuarioActual?.id ? ' (vos)' : ''}</Td>
              <Td style={{ color: 'var(--txt-3)' }}>{s.email}</Td>
              <Td style={{ color: 'var(--txt-3)' }}>{fmtFecha(s.createdAt)}</Td>
            </Tr>
          ))}
        </Table>
      </div>

      <Modal open={Boolean(modal)} onClose={() => setModal(null)} title="Crear super-admin" subtitle="Tendrá acceso total a todas las empresas" width={420}>
        {modal && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="resp-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Campo label="Nombre" required>
                  <input style={campoInputStyle} value={modal.nombre} onChange={(e) => setModal({ ...modal, nombre: e.target.value })} />
                </Campo>
                <Campo label="Apellido" required>
                  <input style={campoInputStyle} value={modal.apellido} onChange={(e) => setModal({ ...modal, apellido: e.target.value })} />
                </Campo>
              </div>
              <Campo label="Email" required>
                <input type="email" style={campoInputStyle} value={modal.email} onChange={(e) => setModal({ ...modal, email: e.target.value })} />
              </Campo>
              <Campo label="Contraseña" required>
                <input style={campoInputStyle} placeholder="Mínimo 6 caracteres" value={modal.password} onChange={(e) => setModal({ ...modal, password: e.target.value })} />
              </Campo>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '18px 24px', borderTop: '1px solid #EEF2F6', marginTop: 20, marginLeft: -24, marginRight: -24, marginBottom: -22 }}>
              <Btn onClick={() => setModal(null)} style={{ background: '#FFFFFF', color: '#1E3A5F', border: '1px solid #C9DAEA', fontWeight: 600 }}>Cancelar</Btn>
              <Btn disabled={!formValido || crearM.isPending} loading={crearM.isPending} onClick={() => crearM.mutate()} style={{ background: '#1E3A8A', fontWeight: 700 }}>Crear</Btn>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

export default function Perfil() {
  return (
    <div className="animate-fade resp-page-padding" style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{ width: 40, height: 40, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'var(--blue-bg)', border: '1px solid var(--border)' }}>
          <UserCircle size={19} color="var(--blue)" />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--txt)' }}>Mi Perfil</h1>
          <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--txt-3)' }}>Tu contraseña y otros super-admins de la plataforma</p>
        </div>
      </div>

      <div style={{ marginBottom: 32, maxWidth: 420 }}>
        <FormPassword />
      </div>

      <div style={{ marginBottom: 32, maxWidth: 480 }}>
        <Seccion2FA />
      </div>

      <SeccionOtrosSuperAdmins />
    </div>
  );
}
