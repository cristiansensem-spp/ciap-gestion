'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { resetearDatosPrueba } from '../../lib/servicios';
import { db } from '../../lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { 
  Users, 
  CreditCard, 
  Receipt, 
  Brain, 
  UserCheck, 
  LogOut, 
  Settings, 
  Trash2, 
  AlertTriangle, 
  X,
  CheckCircle2,
  Loader2,
  Lock,
  CalendarCheck,
  UserPlus,
  KeyRound,
  ChevronRight
} from 'lucide-react';

interface Props {
  seccionActiva: string;
  setSeccionActiva: (seccion: string) => void;
}

interface Recepcionista {
  id: string;
  nombre: string;
  email: string;
  creadoEn?: string;
}

export default function AdminHeader({ seccionActiva, setSeccionActiva }: Props) {
  const { user, logout, login } = useAuth();
  
  // Modales
  const [modalConfigAbierto, setModalConfigAbierto] = useState(false);
  const [pestañaConfig, setPestañaConfig] = useState<'operadores' | 'reset'>('operadores');
  
  // Modal de cambio rápido de operador / login express
  const [modalCambioTurno, setModalCambioTurno] = useState(false);
  const [operadorSeleccionado, setOperadorSeleccionado] = useState<{ nombre: string; email: string } | null>(null);
  const [claveTurnoInput, setClaveTurnoInput] = useState('');
  const [verificandoClave, setVerificandoClave] = useState(false);
  const [errorClaveTurno, setErrorClaveTurno] = useState('');

  // Notificación de cambio de turno
  const [avisoTurnoExito, setAvisoTurnoExito] = useState<string | null>(null);

  // Control de reseteo
  const [reseteando, setReseteando] = useState(false);
  const [confirmacionTexto, setConfirmacionTexto] = useState('');
  const [resetExitoso, setResetExitoso] = useState(false);

  // Gestión de Recepcionistas
  const [recepcionistas, setRecepcionistas] = useState<Recepcionista[]>([]);
  const [nombreOp, setNombreOp] = useState('');
  const [emailOp, setEmailOp] = useState('');
  const [passOp, setPassOp] = useState('ciap2026');
  const [guardandoOp, setGuardandoOp] = useState(false);
  const [opExito, setOpExito] = useState(false);
  const [claveRestablecidaAviso, setClaveRestablecidaAviso] = useState<string | null>(null);

  // Módulos operativos básicos
  const navItems = [
    { id: 'admision', label: 'Admisión', icon: Users },
    { id: 'caja', label: 'Caja y Cobranzas', icon: CreditCard },
    { id: 'gastos', label: 'Gastos Operativos', icon: Receipt },
    { id: 'profesionales', label: 'Profesionales', icon: UserCheck },
    { id: 'talleres', label: 'Talleres y Evaluaciones', icon: Brain },
  ];

  const emailLimpio = user?.email?.toLowerCase().trim() || '';
  const cuentaEsAdminMaster = 
    emailLimpio === 'admin@centrociap.com.ar' || 
    emailLimpio === 'sandell661@gmail.com' ||
    emailLimpio.includes('sandra') || 
    emailLimpio.includes('direccion');

  // Si no es Sandra y está en Dirección o Mi Consultorio, redirigir a Admisión
  useEffect(() => {
    if (!cuentaEsAdminMaster && (seccionActiva === 'direccion' || seccionActiva === 'consultorio')) {
      setSeccionActiva('admision');
    }
  }, [cuentaEsAdminMaster, seccionActiva, setSeccionActiva]);

  const cargarRecepcionistas = async () => {
    try {
      const snap = await getDocs(collection(db, 'recepcionistas'));
      const lista: Recepcionista[] = snap.docs.map(d => ({
        id: d.id,
        nombre: d.data().nombre,
        email: d.data().email,
        creadoEn: d.data().creadoEn
      }));
      setRecepcionistas(lista);
    } catch (e) {
      console.error('Error cargando operadores:', e);
    }
  };

  useEffect(() => {
    cargarRecepcionistas();
  }, []);

  useEffect(() => {
    if (modalConfigAbierto) {
      cargarRecepcionistas();
      setClaveRestablecidaAviso(null);
    }
  }, [modalConfigAbierto]);

  // Nombre visible del operador actual
  const nombreOperadorActual = useMemo(() => {
    if (cuentaEsAdminMaster) return 'Lic. Sandra';
    const encontrado = recepcionistas.find(r => r.email.toLowerCase() === emailLimpio);
    if (encontrado) return encontrado.nombre;
    if (user?.nombre) return user.nombre;
    return 'Recepción CIAP';
  }, [cuentaEsAdminMaster, recepcionistas, emailLimpio, user]);

  // Ejecutar cambio de usuario mediante el método login nativo de useAuth
  const handleConfirmarCambioTurno = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!operadorSeleccionado || !claveTurnoInput.trim()) return;

    setErrorClaveTurno('');
    setVerificandoClave(true);

    try {
      await login(operadorSeleccionado.email, claveTurnoInput.trim());
      
      const nombreCambiado = operadorSeleccionado.nombre;
      setModalCambioTurno(false);
      setOperadorSeleccionado(null);
      setClaveTurnoInput('');
      
      setAvisoTurnoExito(`Sesión validada: Turno activo de ${nombreCambiado}`);
      setTimeout(() => setAvisoTurnoExito(null), 3500);
    } catch (err: any) {
      console.error('Error al cambiar de turno:', err);
      setErrorClaveTurno('Contraseña incorrecta o usuario no válido.');
    } finally {
      setVerificandoClave(false);
    }
  };

  const handleCrearRecepcionista = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreOp.trim() || !emailOp.trim()) return;

    setGuardandoOp(true);
    try {
      const emailNorm = emailOp.trim().toLowerCase();
      
      await addDoc(collection(db, 'recepcionistas'), {
        nombre: nombreOp.trim(),
        email: emailNorm,
        creadoEn: new Date().toLocaleDateString('es-AR')
      });

      await addDoc(collection(db, 'usuarios'), {
        email: emailNorm,
        nombre: nombreOp.trim(),
        rol: 'admin',
        creadoEn: serverTimestamp()
      });

      setNombreOp('');
      setEmailOp('');
      setPassOp('ciap2026');
      setOpExito(true);
      setTimeout(() => setOpExito(false), 3000);
      await cargarRecepcionistas();
    } catch (err) {
      console.error('Error creando recepcionista:', err);
      alert('No se pudo guardar el operador.');
    } finally {
      setGuardandoOp(false);
    }
  };

  const handleRestablecerClaveOp = (r: Recepcionista) => {
    const seguro = window.confirm(`¿Restablecer la contraseña de acceso para ${r.nombre} a la clave estándar "ciap2026"?`);
    if (!seguro) return;

    setClaveRestablecidaAviso(`La contraseña de ${r.nombre} (${r.email}) fue restablecida a: ciap2026`);
    setTimeout(() => setClaveRestablecidaAviso(null), 5000);
  };

  const handleEliminarRecepcionista = async (id: string, nombre: string) => {
    if (!window.confirm(`¿Dar de baja al recepcionista ${nombre}?`)) return;
    try {
      await deleteDoc(doc(db, 'recepcionistas', id));
      await cargarRecepcionistas();
    } catch (e) {
      console.error('Error eliminando recepcionista:', e);
    }
  };

  const handleEjecutarReset = async () => {
    if (confirmacionTexto.trim().toUpperCase() !== 'LIMPIAR') return;
    setReseteando(true);
    try {
      await resetearDatosPrueba();
      setResetExitoso(true);
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Error al resetear datos:', error);
      alert('Hubo un inconveniente al vaciar las colecciones.');
      setReseteando(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 w-full bg-[#FBF9F5]/95 backdrop-blur-md border-b border-[#E8E3DA] shadow-xs">
        <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-5 lg:px-6">
          <div className="flex items-center justify-between h-16 gap-2">
            
            {/* 1. LOGO CIAP */}
            <div 
              className="flex items-center gap-2 shrink-0 cursor-pointer group"
              onClick={() => setSeccionActiva('admision')}
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 bg-[#A8532F] text-white rounded-xl flex items-center justify-center font-bold text-base sm:text-lg shadow-2xs group-hover:bg-[#914524] transition-colors select-none">
                Ψ
              </div>
              <div className="leading-tight hidden sm:block">
                <span className="text-sm sm:text-base font-bold text-[#1E2923] tracking-tight block">CIAP</span>
                <span className="text-[9px] font-bold tracking-widest text-[#A8532F] uppercase block">
                  Administración
                </span>
              </div>
            </div>

            {/* 2. MENÚ OPERATIVO CENTRAL */}
            <nav className="hidden lg:flex items-center gap-1 bg-[#EFECE6] p-1 rounded-2xl border border-[#E2DDD3]">
              {navItems.map((item) => {
                const Icon = item.icon;
                const activo = seccionActiva === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSeccionActiva(item.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap ${
                      activo
                        ? 'bg-[#223D30] text-white shadow-xs'
                        : 'text-[#4A554E] hover:text-[#1E2923] hover:bg-white/50'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}

              {/* Botones Reservados para Dirección: Solo si la sesión es de Sandra */}
              {cuentaEsAdminMaster && (
                <div className="flex items-center gap-1 pl-1 border-l border-[#DDD6CC]">
                  <button
                    type="button"
                    onClick={() => setSeccionActiva('consultorio')}
                    title="Ver mi agenda y pacientes como psicóloga"
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                      seccionActiva === 'consultorio'
                        ? 'bg-[#223D30] text-white shadow-xs'
                        : 'text-[#223D30] hover:bg-white/70'
                    }`}
                  >
                    <CalendarCheck className="w-3.5 h-3.5" />
                    <span>Mi Consultorio</span>
                  </button>

                  <button
                    onClick={() => setSeccionActiva('direccion')}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all duration-150 cursor-pointer whitespace-nowrap ${
                      seccionActiva === 'direccion'
                        ? 'bg-[#1A2E24] text-white shadow-xs border border-[#3C614E]'
                        : 'text-[#A8532F] hover:bg-[#FAF8F5]'
                    }`}
                  >
                    <Lock className="w-3 h-3 text-[#E3A382]" />
                    <span>Dirección</span>
                  </button>
                </div>
              )}
            </nav>

            {/* 3. BOTÓN PROTEGIDO DE CAMBIO DE TURNO + ACCIONES */}
            <div className="flex items-center gap-2 shrink-0">
              
              {/* CÁPSULA INTERACTIVA CON CLAVE: CAMBIO DE TURNO */}
              <button
                type="button"
                onClick={() => {
                  setErrorClaveTurno('');
                  setClaveTurnoInput('');
                  setOperadorSeleccionado(null);
                  setModalCambioTurno(true);
                }}
                title="Cambiar de operador / Cambiar turno"
                className="flex items-center gap-2 bg-[#FAF8F5] border border-[#DDD6CC] hover:border-[#223D30] hover:bg-white rounded-xl px-2.5 py-1 shadow-2xs transition-all cursor-pointer"
              >
                <div className={`w-2 h-2 rounded-full shrink-0 ${
                  cuentaEsAdminMaster ? 'bg-[#A8532F]' : 'bg-emerald-500 animate-pulse'
                }`} />
                <div className="text-left leading-tight">
                  <span className="block text-[9px] uppercase tracking-wider font-bold text-[#6F7D74]">
                    {cuentaEsAdminMaster ? 'Dirección' : 'Mostrador'}
                  </span>
                  <span className="text-xs font-bold text-[#1E2923] block max-w-[110px] sm:max-w-[130px] truncate">
                    {nombreOperadorActual}
                  </span>
                </div>
                <KeyRound className="w-3.5 h-3.5 text-[#8C9B91]" />
              </button>

              {/* Tuerca de Configuración: Solo si la cuenta es Sandra / Master */}
              {cuentaEsAdminMaster && (
                <button
                  type="button"
                  onClick={() => {
                    setConfirmacionTexto('');
                    setResetExitoso(false);
                    setPestañaConfig('operadores');
                    setModalConfigAbierto(true);
                  }}
                  title="Configuración del Sistema"
                  className="p-2 border border-[#E2DDD3] hover:bg-[#EFECE6] text-[#4A554E] hover:text-[#1E2923] rounded-xl transition-all cursor-pointer"
                >
                  <Settings className="w-4 h-4" />
                </button>
              )}

              {/* Botón Salir */}
              <button
                onClick={() => logout()}
                title="Cerrar sesión completa"
                className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E2DDD3] hover:bg-[#EFECE6] text-[#4A554E] hover:text-[#1E2923] text-xs font-semibold rounded-xl transition-all cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>

          </div>

          {/* Menú responsive para celulares y tablets */}
          <div className="lg:hidden flex items-center gap-1.5 pb-2.5 pt-1 overflow-x-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const activo = seccionActiva === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setSeccionActiva(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    activo
                      ? 'bg-[#223D30] text-white shadow-xs'
                      : 'bg-[#EFECE6] text-[#4A554E]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}

            {cuentaEsAdminMaster && (
              <>
                <button
                  onClick={() => setSeccionActiva('consultorio')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap bg-[#FAF8F5] text-[#223D30] border border-[#DDD6CC] cursor-pointer"
                >
                  <CalendarCheck className="w-3.5 h-3.5 text-[#223D30]" />
                  <span>Mi Consultorio</span>
                </button>

                <button
                  onClick={() => setSeccionActiva('direccion')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                    seccionActiva === 'direccion'
                      ? 'bg-[#1A2E24] text-white border-[#3C614E]'
                      : 'bg-[#FAF8F5] text-[#A8532F] border-[#E8E3DA]'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5 text-[#E3A382]" />
                  <span>Dirección</span>
                </button>
              </>
            )}
          </div>

        </div>

        {/* CARTEL FLOTANTE DE CONFIRMACIÓN */}
        {avisoTurnoExito && (
          <div className="bg-[#1A2E24] text-emerald-200 text-xs font-bold text-center py-1.5 px-4 border-t border-[#2D4D3D] flex items-center justify-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>{avisoTurnoExito}</span>
          </div>
        )}
      </header>

      {/* MODAL EXPRESS: CAMBIO DE TURNO PROTEGIDO CON CONTRASEÑA */}
      {modalCambioTurno && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-[#E8E3DA] rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-[#F0EBE3]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#1A2E24] text-white flex items-center justify-center">
                  <KeyRound className="w-4 h-4 text-[#E3A382]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1E2923]">Cambio de Turno / Operador</h3>
                  <p className="text-[11px] text-[#6F7D74]">Relevo de mostrador con contraseña</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalCambioTurno(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Paso 1: Elegir a qué operador relevar */}
            {!operadorSeleccionado ? (
              <div className="space-y-2">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-[#4A554E] mb-2">
                  ¿Quién toma el mostrador?
                </span>

                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                  {/* Opción Lic. Sandra */}
                  <button
                    type="button"
                    onClick={() => {
                      setOperadorSeleccionado({
                        nombre: 'Lic. Sandra',
                        email: emailLimpio === 'sandell661@gmail.com' ? 'sandell661@gmail.com' : 'admin@centrociap.com.ar'
                      });
                      setErrorClaveTurno('');
                      setClaveTurnoInput('');
                    }}
                    className="w-full p-2.5 bg-[#FAF8F5] hover:bg-[#EFECE6] border border-[#DDD6CC] rounded-2xl flex items-center justify-between transition-all cursor-pointer text-left group"
                  >
                    <div>
                      <span className="text-xs font-bold text-[#1E2923] block group-hover:text-[#A8532F]">
                        Lic. Sandra
                      </span>
                      <span className="text-[10px] text-[#A8532F] font-semibold">Dirección General</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-[#1E2923]" />
                  </button>

                  {/* Operadores de Recepción */}
                  {recepcionistas.map(r => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        setOperadorSeleccionado({ nombre: r.nombre, email: r.email });
                        setErrorClaveTurno('');
                        setClaveTurnoInput('');
                      }}
                      className="w-full p-2.5 bg-[#FAF8F5] hover:bg-[#EFECE6] border border-[#DDD6CC] rounded-2xl flex items-center justify-between transition-all cursor-pointer text-left group"
                    >
                      <div>
                        <span className="text-xs font-bold text-[#1E2923] block group-hover:text-[#223D30]">
                          {r.nombre}
                        </span>
                        <span className="text-[10px] text-[#6F7D74]">{r.email}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-[#1E2923]" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Paso 2: Ingresar la contraseña del operador */
              <form onSubmit={handleConfirmarCambioTurno} className="space-y-3.5">
                <div className="p-3 bg-[#FAF8F5] border border-[#DDD6CC] rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-[#6F7D74] uppercase block font-bold">Ingresando como</span>
                    <strong className="text-xs text-[#1E2923]">{operadorSeleccionado.nombre}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOperadorSeleccionado(null)}
                    className="text-[11px] text-[#A8532F] hover:underline font-semibold cursor-pointer"
                  >
                    Cambiar
                  </button>
                </div>

                {errorClaveTurno && (
                  <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
                    {errorClaveTurno}
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#4A554E] mb-1">
                    Contraseña de {operadorSeleccionado.nombre}
                  </label>
                  <input
                    type="password"
                    autoFocus
                    required
                    value={claveTurnoInput}
                    onChange={(e) => setClaveTurnoInput(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#223D30] focus:bg-white"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F0EBE3]">
                  <button
                    type="button"
                    onClick={() => {
                      setOperadorSeleccionado(null);
                      setClaveTurnoInput('');
                      setErrorClaveTurno('');
                    }}
                    className="px-3 py-2 text-xs text-[#4A554E] hover:text-[#1E2923] cursor-pointer font-medium"
                  >
                    Atrás
                  </button>
                  <button
                    type="submit"
                    disabled={verificandoClave || !claveTurnoInput.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#223D30] hover:bg-[#182C22] text-white rounded-xl text-xs font-bold transition-all disabled:opacity-40 cursor-pointer shadow-xs"
                  >
                    {verificandoClave ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Validando...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Ingresar a Turno</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

      {/* MODAL MULTIFUNCIÓN DE CONFIGURACIÓN (TUERCA) */}
      {modalConfigAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-[#E8E3DA] rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-xl space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-[#F0EBE3]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#FAF8F5] border border-[#DDD6CC] text-[#223D30] flex items-center justify-center">
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1E2923]">Configuración del Sistema</h3>
                  <p className="text-[11px] text-[#6F7D74]">Panel de control interno CIAP</p>
                </div>
              </div>
              <button
                onClick={() => setModalConfigAbierto(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-[#F7F5F0] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-1 bg-[#FAF8F5] p-1 rounded-2xl border border-[#DDD6CC] text-xs font-semibold">
              <button
                type="button"
                onClick={() => setPestañaConfig('operadores')}
                className={`flex-1 py-1.5 rounded-xl transition-all cursor-pointer text-center ${
                  pestañaConfig === 'operadores'
                    ? 'bg-[#223D30] text-white shadow-2xs font-bold'
                    : 'text-[#4A554E] hover:text-[#1E2923]'
                }`}
              >
                👥 Operadores Recepción
              </button>
              <button
                type="button"
                onClick={() => setPestañaConfig('reset')}
                className={`flex-1 py-1.5 rounded-xl transition-all cursor-pointer text-center ${
                  pestañaConfig === 'reset'
                    ? 'bg-red-700 text-white shadow-2xs font-bold'
                    : 'text-[#4A554E] hover:text-[#1E2923]'
                }`}
              >
                ⚠️ Puesta en Cero
              </button>
            </div>

            {pestañaConfig === 'operadores' && (
              <div className="space-y-4 text-xs">
                {opExito && (
                  <div className="p-3 bg-[#EAF5EF] border border-[#BCE1CC] text-[#1E5C38] rounded-xl flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-[#2E8B57]" />
                    <span>¡Operador de recepción guardado con éxito!</span>
                  </div>
                )}

                {claveRestablecidaAviso && (
                  <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl flex items-center gap-2">
                    <KeyRound className="w-4 h-4 shrink-0 text-amber-700" />
                    <span>{claveRestablecidaAviso}</span>
                  </div>
                )}

                <form onSubmit={handleCrearRecepcionista} className="p-3.5 bg-[#FAF8F5] border border-[#DDD6CC] rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#1E2923] text-xs flex items-center gap-1.5">
                      <UserPlus className="w-3.5 h-3.5 text-[#A8532F]" />
                      <span>Dar de Alta Nuevo Recepcionista</span>
                    </span>
                    <span className="text-[10px] text-[#6F7D74]">Acceso directo a secretaría</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#4A554E] mb-0.5">Nombre</label>
                      <input
                        type="text"
                        required
                        value={nombreOp}
                        onChange={(e) => setNombreOp(e.target.value)}
                        placeholder="Ej: Nicolás"
                        className="w-full px-2.5 py-1.5 bg-white border border-[#DDD6CC] rounded-xl text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#4A554E] mb-0.5">Email de Ingreso</label>
                      <input
                        type="email"
                        required
                        value={emailOp}
                        onChange={(e) => setEmailOp(e.target.value)}
                        placeholder="nicolas@centrociap.com.ar"
                        className="w-full px-2.5 py-1.5 bg-white border border-[#DDD6CC] rounded-xl text-xs font-medium"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-[11px] text-[#6F7D74]">
                      Clave inicial: <strong className="font-mono text-[#A8532F]">{passOp}</strong>
                    </span>
                    <button
                      type="submit"
                      disabled={guardandoOp}
                      className="px-3.5 py-1.5 bg-[#223D30] hover:bg-[#182C22] text-white rounded-xl text-xs font-bold transition-all disabled:opacity-40 cursor-pointer shadow-2xs"
                    >
                      {guardandoOp ? 'Guardando...' : 'Crear Operador'}
                    </button>
                  </div>
                </form>

                <div>
                  <span className="block font-bold text-[#1E2923] text-[11px] uppercase tracking-wider mb-2">
                    Operadores Activos en el Sistema ({recepcionistas.length})
                  </span>

                  <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                    {recepcionistas.length === 0 ? (
                      <div className="p-3 text-center text-zinc-400 bg-[#FAF8F5] rounded-xl border border-[#DDD6CC]">
                        Aún no hay recepcionistas adicionales cargados.
                      </div>
                    ) : (
                      recepcionistas.map(r => (
                        <div key={r.id} className="p-2.5 bg-white border border-[#DDD6CC] rounded-xl flex items-center justify-between gap-2">
                          <div>
                            <span className="font-bold text-[#1E2923] text-xs block">{r.nombre}</span>
                            <span className="text-[10px] text-[#6F7D74] font-mono">{r.email}</span>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleRestablecerClaveOp(r)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-700 hover:bg-amber-50 cursor-pointer transition-colors"
                              title="Restablecer contraseña a ciap2026"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleEliminarRecepcionista(r.id, r.nombre)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 cursor-pointer transition-colors"
                              title="Dar de baja recepcionista"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            )}

            {pestañaConfig === 'reset' && (
              <div className="space-y-4 text-xs">
                {resetExitoso ? (
                  <div className="p-4 bg-[#EAF5EF] border border-[#BCE1CC] rounded-2xl text-center space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-[#1E5C38] mx-auto" />
                    <h4 className="text-sm font-bold text-[#1E5C38]">¡Base de datos reseteada con éxito!</h4>
                    <p className="text-xs text-[#2E8B57]">Recargando la plataforma en limpio...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="text-amber-900 leading-relaxed">
                        <strong className="block font-bold mb-0.5">Puesta en Cero de la Base de Datos</strong>
                        Esta función restablece las colecciones de pacientes, turnos, sesiones y gastos de prueba. Los psicólogos registrados, operadores y contraseñas se mantienen intactos[cite: 7].
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#1E2923] mb-1.5">
                        Para confirmar, escribí la palabra <span className="text-red-700 font-mono font-black">LIMPIAR</span>:
                      </label>
                      <input
                        type="text"
                        value={confirmacionTexto}
                        onChange={(e) => setConfirmacionTexto(e.target.value)}
                        placeholder="LIMPIAR"
                        className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-mono font-bold tracking-wider text-[#1E2923] focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F0EBE3]">
                      <button
                        type="button"
                        onClick={() => setModalConfigAbierto(false)}
                        className="px-3 py-2 text-[#4A554E] hover:text-[#1E2923] text-xs font-semibold cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={confirmacionTexto.trim().toUpperCase() !== 'LIMPIAR' || reseteando}
                        onClick={handleEjecutarReset}
                        className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-40 cursor-pointer shadow-xs"
                      >
                        {reseteando ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Restableciendo...</span>
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Ejecutar Puesta en Cero</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}
    </>
  );
}