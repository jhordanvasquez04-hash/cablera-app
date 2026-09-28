import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Building2, Plus, Eye, Search } from 'lucide-react';
import { superadminApi } from '../../services/api';
import { Btn, Badge, Modal, Table, Tr, Td } from '../../components/ui';

const campoInputStyle = {
  width: '100%', height: 40, padding: '0 12px', background: '#E1EBF5',
  border: '1px solid #C9DAEA', borderRadius: 8, color: '#1E3A5F',
  fontSize: 13.5, outline: 'none', boxSizing: 'border-box',
};

function Campo({ label, required, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <label style={{ fontSize: 13, fontWeight: 600, color: '#1E3A5F' }}>
          {label}{required && <span> *</span>}
        </label>
      )}
      {children}
    </div>
  );
}

function SeccionLabel({ children }) {
  return (
    <div style={{
      fontSize: 11.5, fontWeight: 700, color: '#2563EB',
      textTransform: 'uppercase', letterSpacing: '0.05em',
      paddingBottom: 8, borderBottom: '1px solid #E2ECF4', marginBottom: 2,
    }}>
      {children}
    </div>
  );
}

const BADGE_ESTADO = { ACTIVO: 'green', SUSPENDIDO: 'red', MOROSO: 'yellow' };

const emptyForm = {
  nombre: '', ruc: '', direccion: '', telefono: '', agencia: '',
  adminNombre: '', adminApellido: '', adminEmail: '', adminPassword: '',
};

export default function TenantsList() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [modal, setModal] = useState(null);
  const [q, setQ] = useState('');

  const tenantsQ = useQuery({
    queryKey: ['superadmin', 'tenants'],
    queryFn: () => superadminApi.listarTenants().then((r) => r.data),
  });

  const crearM = useMutation({
    mutationFn: () => superadminApi.crearTenant({
      nombre: modal.nombre.trim(),
      ruc: modal.ruc.trim() || null,
      direccion: modal.direccion.trim() || null,
      telefono: modal.telefono.trim() || null,
      agencia: modal.agencia.trim() || null,
      adminNombre: modal.adminNombre.trim(),
      adminApellido: modal.adminApellido.trim(),
      adminEmail: modal.adminEmail.trim(),
      adminPassword: modal.adminPassword,
    }),
    onSuccess: () => {
      toast.success('Empresa creada. Comparte las credenciales del administrador con el cliente.');
      setModal(null);
      qc.invalidateQueries({ queryKey: ['superadmin', 'tenants'] });
      qc.invalidateQueries({ queryKey: ['superadmin', 'resumen'] });
    },
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo crear la empresa'),
  });

  const tenants = tenantsQ.data || [];

  const tenantsFiltrados = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return tenants;
    return tenants.filter((t) =>
      (t.nombre || '').toLowerCase().includes(term) || (t.ruc || '').toLowerCase().includes(term)
    );
  }, [tenants, q]);

  const formValido = modal?.nombre?.trim() && modal?.adminNombre?.trim() && modal?.adminApellido?.trim()
    && modal?.adminEmail?.trim() && modal?.adminPassword?.trim()?.length >= 6;

  return (
    <div className="animate-fade resp-page-padding" style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'var(--blue-bg)', border: '1px solid var(--border)' }}>
            <Building2 size={19} color="var(--blue)" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--txt)' }}>Empresas</h1>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--txt-3)' }}>{tenants.length} empresa{tenants.length === 1 ? '' : 's'} registrada{tenants.length === 1 ? '' : 's'}</p>
          </div>
        </div>
        <Btn variant="primary" icon={<Plus size={14} />} onClick={() => setModal(emptyForm)}>Nueva empresa</Btn>
      </div>

      <div style={{ position: 'relative', marginBottom: 14, maxWidth: 340 }}>
        <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--txt-3)' }} />
        <input
          value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre o RUC..."
          style={{
            width: '100%', height: 36, padding: '0 12px 0 32px', background: 'var(--bg-3)',
            border: '1px solid var(--border-2)', borderRadius: 6, color: 'var(--txt)',
            fontSize: 13, outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <Table loading={tenantsQ.isLoading} headers={['Empresa', 'RUC', 'Estado', 'Pago', 'Usuarios', 'Clientes', 'Contratos', '']}>
          {tenantsFiltrados.length === 0 ? (
            <tr><td colSpan={8} style={{ padding: 28, textAlign: 'center', color: 'var(--txt-3)', fontSize: 13 }}>{q ? 'Sin resultados para tu búsqueda' : 'Sin empresas registradas'}</td></tr>
          ) : tenantsFiltrados.map((t) => (
            <Tr key={t.id}>
              <Td style={{ fontWeight: 600 }}>{t.nombre || '(sin nombre)'}</Td>
              <Td style={{ color: 'var(--txt-3)' }}>{t.ruc || '—'}</Td>
              <Td><Badge color={BADGE_ESTADO[t.estado] || 'blue'}>{t.estado}</Badge></Td>
              <Td><Badge color={t.alDia ? 'green' : 'yellow'}>{t.alDia ? 'Al día' : 'Pendiente'}</Badge></Td>
              <Td>{t._count?.usuarios ?? 0}</Td>
              <Td>{t._count?.clientes ?? 0}</Td>
              <Td>{t._count?.contratos ?? 0}</Td>
              <Td>
                <Btn variant="ghost" size="sm" icon={<Eye size={13} />} onClick={() => navigate(`/admin/empresas/${t.id}`)} />
              </Td>
            </Tr>
          ))}
        </Table>
      </div>

      <Modal open={Boolean(modal)} onClose={() => setModal(null)} title="Nueva empresa" width={560}>
        {modal && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <SeccionLabel>Datos de la empresa</SeccionLabel>
              <Campo label="Nombre" required>
                <input style={campoInputStyle} placeholder="Nombre comercial de la empresa" value={modal.nombre} onChange={(e) => setModal({ ...modal, nombre: e.target.value })} />
              </Campo>
              <div className="resp-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Campo label="RUC">
                  <input style={campoInputStyle} value={modal.ruc} onChange={(e) => setModal({ ...modal, ruc: e.target.value })} />
                </Campo>
                <Campo label="Teléfono">
                  <input style={campoInputStyle} value={modal.telefono} onChange={(e) => setModal({ ...modal, telefono: e.target.value })} />
                </Campo>
              </div>
              <Campo label="Dirección">
                <input style={campoInputStyle} value={modal.direccion} onChange={(e) => setModal({ ...modal, direccion: e.target.value })} />
              </Campo>

              <SeccionLabel>Primer usuario administrador</SeccionLabel>
              <p style={{ margin: 0, fontSize: 12, color: '#5A7A9A' }}>
                No se envía correo automático — comunica estas credenciales al cliente por tu cuenta.
              </p>
              <div className="resp-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Campo label="Nombre" required>
                  <input style={campoInputStyle} value={modal.adminNombre} onChange={(e) => setModal({ ...modal, adminNombre: e.target.value })} />
                </Campo>
                <Campo label="Apellido" required>
                  <input style={campoInputStyle} value={modal.adminApellido} onChange={(e) => setModal({ ...modal, adminApellido: e.target.value })} />
                </Campo>
              </div>
              <Campo label="Email" required>
                <input type="email" style={campoInputStyle} placeholder="admin@empresa.com" value={modal.adminEmail} onChange={(e) => setModal({ ...modal, adminEmail: e.target.value })} />
              </Campo>
              <Campo label="Contraseña inicial" required>
                <input style={campoInputStyle} placeholder="Mínimo 6 caracteres" value={modal.adminPassword} onChange={(e) => setModal({ ...modal, adminPassword: e.target.value })} />
              </Campo>
            </div>

            <div style={{
              display: 'flex', justifyContent: 'flex-end', gap: 10,
              padding: '18px 24px', borderTop: '1px solid #EEF2F6',
              marginTop: 20, marginLeft: -24, marginRight: -24, marginBottom: -22,
            }}>
              <Btn onClick={() => setModal(null)} style={{ background: '#FFFFFF', color: '#1E3A5F', border: '1px solid #C9DAEA', fontWeight: 600 }}>
                Cancelar
              </Btn>
              <Btn disabled={!formValido || crearM.isPending} loading={crearM.isPending} onClick={() => crearM.mutate()} style={{ background: '#1E3A8A', fontWeight: 700 }}>
                Crear empresa
              </Btn>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
