import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeft, Building2, Pencil, KeyRound, CircleDollarSign } from 'lucide-react';
import { superadminApi } from '../../services/api';
import { Btn, Badge, Modal, Table, Tr, Td, Spinner } from '../../components/ui';

const BADGE_ESTADO = { ACTIVO: 'green', SUSPENDIDO: 'red', MOROSO: 'yellow' };
const ESTADOS = ['ACTIVO', 'SUSPENDIDO', 'MOROSO'];
const fmt = (n) => `S/ ${Number(n).toFixed(2)}`;

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

function fmtFecha(f) {
  if (!f) return '—';
  return new Date(f).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}

function periodoActual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function TenantDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [modalEditar, setModalEditar] = useState(null);
  const [modalPassword, setModalPassword] = useState(null);
  const [modalPago, setModalPago] = useState(null);

  const tenantQ = useQuery({
    queryKey: ['superadmin', 'tenants', id],
    queryFn: () => superadminApi.obtenerTenant(id).then((r) => r.data),
  });

  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ['superadmin', 'tenants', id] });
    qc.invalidateQueries({ queryKey: ['superadmin', 'tenants'] });
    qc.invalidateQueries({ queryKey: ['superadmin', 'pagos'] });
    qc.invalidateQueries({ queryKey: ['superadmin', 'resumen'] });
  };

  const estadoM = useMutation({
    mutationFn: (estado) => superadminApi.actualizarEstado(id, estado),
    onSuccess: () => { toast.success('Estado actualizado'); invalidar(); },
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo actualizar el estado'),
  });

  const editarM = useMutation({
    mutationFn: () => superadminApi.actualizarTenant(id, {
      nombre: modalEditar.nombre.trim(),
      ruc: modalEditar.ruc.trim() || null,
      direccion: modalEditar.direccion.trim() || null,
      telefono: modalEditar.telefono.trim() || null,
      agencia: modalEditar.agencia.trim() || null,
      montoMensual: modalEditar.montoMensual !== '' ? modalEditar.montoMensual : null,
    }),
    onSuccess: () => { toast.success('Empresa actualizada'); setModalEditar(null); invalidar(); },
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo actualizar la empresa'),
  });

  const pagoM = useMutation({
    mutationFn: () => superadminApi.registrarPago({
      empresaId: id, monto: Number(modalPago.monto), periodo: modalPago.periodo, notas: modalPago.notas.trim() || undefined,
    }),
    onSuccess: () => { toast.success('Pago registrado'); setModalPago(null); invalidar(); },
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo registrar el pago'),
  });

  const passwordM = useMutation({
    mutationFn: () => superadminApi.resetearPassword(modalPassword.usuarioId, modalPassword.password),
    onSuccess: () => { toast.success('Contraseña actualizada — comunicásela al cliente'); setModalPassword(null); },
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo resetear la contraseña'),
  });

  if (tenantQ.isLoading) {
    return <div style={{ display: 'grid', placeItems: 'center', padding: 60 }}><Spinner /></div>;
  }
  const tenant = tenantQ.data;
  if (!tenant) return <p style={{ padding: 24 }}>Empresa no encontrada</p>;

  const abrirEditar = () => setModalEditar({
    nombre: tenant.nombre || '', ruc: tenant.ruc || '', direccion: tenant.direccion || '',
    telefono: tenant.telefono || '', agencia: tenant.agencia || '',
    montoMensual: tenant.montoMensual != null ? String(tenant.montoMensual) : '',
  });

  const abrirPago = () => setModalPago({
    monto: tenant.montoMensual != null ? String(tenant.montoMensual) : '',
    periodo: periodoActual(),
    notas: '',
  });

  const ultimoPago = tenant.pagosSuscripcion?.[0];
  const formPagoValido = Number(modalPago?.monto) > 0 && /^\d{4}-\d{2}$/.test(modalPago?.periodo || '');

  return (
    <div className="animate-fade resp-page-padding" style={{ padding: 24 }}>
      <button
        onClick={() => navigate('/admin/empresas')}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--txt-3)', fontSize: 13, cursor: 'pointer', marginBottom: 16, padding: 0 }}
      >
        <ArrowLeft size={14} /> Volver a empresas
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'var(--blue-bg)', border: '1px solid var(--border)' }}>
            <Building2 size={19} color="var(--blue)" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--txt)' }}>{tenant.nombre || '(sin nombre)'}</h1>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--txt-3)' }}>{tenant.ruc || 'Sin RUC registrado'}</p>
          </div>
        </div>
        <Btn variant="ghost" size="sm" icon={<Pencil size={13} />} onClick={abrirEditar}>Editar empresa</Btn>
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>Estado de la cuenta</div>
            <Badge color={BADGE_ESTADO[tenant.estado] || 'blue'}>{tenant.estado}</Badge>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {ESTADOS.filter((e) => e !== tenant.estado).map((e) => (
              <Btn
                key={e}
                variant={e === 'ACTIVO' ? 'primary' : 'danger'}
                size="sm"
                disabled={estadoM.isPending}
                onClick={() => {
                  if (confirm(`¿Cambiar el estado de ${tenant.nombre || 'esta empresa'} a ${e}?`)) estadoM.mutate(e);
                }}
              >
                Marcar {e}
              </Btn>
            ))}
          </div>
        </div>
        <p style={{ margin: '14px 0 0', fontSize: 12, color: 'var(--txt-3)' }}>
          Suspender o marcar como morosa bloquea el acceso de todos los usuarios de esta empresa de inmediato, sin esperar a que expire su sesión.
        </p>
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>Cuota mensual</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--txt)' }}>{tenant.montoMensual != null ? fmt(tenant.montoMensual) : 'Sin definir'}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>Este mes</div>
              <Badge color={tenant.alDia ? 'green' : 'yellow'}>{tenant.alDia ? 'Al día' : 'Pendiente'}</Badge>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>Último pago</div>
              <div style={{ fontSize: 13, color: 'var(--txt)' }}>
                {ultimoPago ? <>{fmt(ultimoPago.monto)} · {ultimoPago.periodo} · {fmtFecha(ultimoPago.fechaPago)}</> : 'Sin pagos registrados'}
              </div>
            </div>
          </div>
          <Btn variant="primary" size="sm" icon={<CircleDollarSign size={14} />} onClick={abrirPago}>Registrar pago</Btn>
        </div>

        {tenant.pagosSuscripcion?.length > 0 && (
          <>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--txt-3)', margin: '14px 0 8px' }}>Últimos pagos</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {tenant.pagosSuscripcion.map((p) => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--txt-3)' }}>
                  <span>{p.periodo} {p.notas ? `· ${p.notas}` : ''}</span>
                  <span style={{ fontWeight: 700, color: 'var(--green)' }}>{fmt(p.monto)}</span>
                </div>
              ))}
            </div>
            <Link to="/admin/pagos" style={{ display: 'inline-block', marginTop: 10, fontSize: 12, color: 'var(--blue)' }}>Ver historial completo →</Link>
          </>
        )}
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 700, color: 'var(--txt)' }}>
          Usuarios ({tenant.usuarios?.length ?? 0})
        </div>
        <Table headers={['Nombre', 'Email', 'Rol', 'Estado', '']}>
          {(tenant.usuarios || []).length === 0 ? (
            <tr><td colSpan={5} style={{ padding: 28, textAlign: 'center', color: 'var(--txt-3)', fontSize: 13 }}>Sin usuarios</td></tr>
          ) : tenant.usuarios.map((u) => (
            <Tr key={u.id}>
              <Td style={{ fontWeight: 600 }}>{u.nombre} {u.apellido}</Td>
              <Td style={{ color: 'var(--txt-3)' }}>{u.email}</Td>
              <Td>{u.rol}</Td>
              <Td><Badge color={u.activo ? 'green' : 'red'}>{u.activo ? 'Activo' : 'Inactivo'}</Badge></Td>
              <Td>
                <Btn variant="ghost" size="sm" icon={<KeyRound size={13} />} onClick={() => setModalPassword({ usuarioId: u.id, email: u.email, password: '' })}>
                  Resetear contraseña
                </Btn>
              </Td>
            </Tr>
          ))}
        </Table>
      </div>

      <Modal open={Boolean(modalEditar)} onClose={() => setModalEditar(null)} title="Editar empresa" width={520}>
        {modalEditar && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Campo label="Nombre" required>
                <input style={campoInputStyle} value={modalEditar.nombre} onChange={(e) => setModalEditar({ ...modalEditar, nombre: e.target.value })} />
              </Campo>
              <div className="resp-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Campo label="RUC">
                  <input style={campoInputStyle} value={modalEditar.ruc} onChange={(e) => setModalEditar({ ...modalEditar, ruc: e.target.value })} />
                </Campo>
                <Campo label="Teléfono">
                  <input style={campoInputStyle} value={modalEditar.telefono} onChange={(e) => setModalEditar({ ...modalEditar, telefono: e.target.value })} />
                </Campo>
              </div>
              <Campo label="Dirección">
                <input style={campoInputStyle} value={modalEditar.direccion} onChange={(e) => setModalEditar({ ...modalEditar, direccion: e.target.value })} />
              </Campo>
              <Campo label="Agencia">
                <input style={campoInputStyle} value={modalEditar.agencia} onChange={(e) => setModalEditar({ ...modalEditar, agencia: e.target.value })} />
              </Campo>
              <Campo label="Monto mensual acordado (S/)">
                <input type="number" min="0" step="0.01" style={campoInputStyle} placeholder="150.00" value={modalEditar.montoMensual} onChange={(e) => setModalEditar({ ...modalEditar, montoMensual: e.target.value })} />
              </Campo>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '18px 24px', borderTop: '1px solid #EEF2F6', marginTop: 20, marginLeft: -24, marginRight: -24, marginBottom: -22 }}>
              <Btn onClick={() => setModalEditar(null)} style={{ background: '#FFFFFF', color: '#1E3A5F', border: '1px solid #C9DAEA', fontWeight: 600 }}>Cancelar</Btn>
              <Btn disabled={!modalEditar.nombre.trim() || editarM.isPending} loading={editarM.isPending} onClick={() => editarM.mutate()} style={{ background: '#1E3A8A', fontWeight: 700 }}>Guardar cambios</Btn>
            </div>
          </>
        )}
      </Modal>

      <Modal open={Boolean(modalPago)} onClose={() => setModalPago(null)} title="Registrar pago" subtitle={tenant.nombre} width={400}>
        {modalPago && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Campo label="Período (año-mes)" required>
                <input type="month" style={campoInputStyle} value={modalPago.periodo} onChange={(e) => setModalPago({ ...modalPago, periodo: e.target.value })} />
              </Campo>
              <Campo label="Monto" required>
                <input type="number" min="0" step="0.10" style={campoInputStyle} placeholder="150.00" value={modalPago.monto} onChange={(e) => setModalPago({ ...modalPago, monto: e.target.value })} />
              </Campo>
              <Campo label="Notas (opcional)">
                <input style={campoInputStyle} placeholder="Yape, transferencia..." value={modalPago.notas} onChange={(e) => setModalPago({ ...modalPago, notas: e.target.value })} />
              </Campo>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '18px 24px', borderTop: '1px solid #EEF2F6', marginTop: 20, marginLeft: -24, marginRight: -24, marginBottom: -22 }}>
              <Btn onClick={() => setModalPago(null)} style={{ background: '#FFFFFF', color: '#1E3A5F', border: '1px solid #C9DAEA', fontWeight: 600 }}>Cancelar</Btn>
              <Btn disabled={!formPagoValido || pagoM.isPending} loading={pagoM.isPending} onClick={() => pagoM.mutate()} style={{ background: '#1E3A8A', fontWeight: 700 }}>Registrar</Btn>
            </div>
          </>
        )}
      </Modal>

      <Modal open={Boolean(modalPassword)} onClose={() => setModalPassword(null)} title="Resetear contraseña" subtitle={modalPassword?.email} width={420}>
        {modalPassword && (
          <>
            <Campo label="Contraseña nueva" required>
              <input style={campoInputStyle} placeholder="Mínimo 6 caracteres" value={modalPassword.password} onChange={(e) => setModalPassword({ ...modalPassword, password: e.target.value })} />
            </Campo>
            <p style={{ margin: '12px 0 0', fontSize: 12, color: '#5A7A9A' }}>
              Comunicá la contraseña nueva al cliente por fuera del sistema — esto cierra cualquier sesión abierta de esa cuenta.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '18px 24px', borderTop: '1px solid #EEF2F6', marginTop: 20, marginLeft: -24, marginRight: -24, marginBottom: -22 }}>
              <Btn onClick={() => setModalPassword(null)} style={{ background: '#FFFFFF', color: '#1E3A5F', border: '1px solid #C9DAEA', fontWeight: 600 }}>Cancelar</Btn>
              <Btn disabled={modalPassword.password.length < 6 || passwordM.isPending} loading={passwordM.isPending} onClick={() => passwordM.mutate()} style={{ background: '#1E3A8A', fontWeight: 700 }}>Resetear</Btn>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
