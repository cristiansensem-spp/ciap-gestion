'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../../lib/firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { 
  guardarMovimientoDireccion, 
  obtenerMovimientosDireccion, 
  eliminarMovimientoDireccion,
  MovimientoDireccion 
} from '../../lib/servicios';
import { 
  Lock, 
  ShieldCheck, 
  Plus, 
  Trash2, 
  DollarSign, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownRight, 
  Wallet, 
  CheckCircle2, 
  Search, 
  Tag, 
  X,
  KeyRound,
  Check,
  CalendarDays,
  Clock,
  UserCheck,
  Sparkles
} from 'lucide-react';

interface TurnoPrivado {
  id: string;
  pacienteNombre: string;
  fecha: string;
  hora: string;
  modalidad: 'Presencial' | 'Virtual';
  arancel: number;
  estado: 'Pendiente' | 'Cobrado';
  cuentaDestino?: string;
  creadoEn?: string;
}

const CATEGORIAS_EGRESO_DEFAULT = [
  'Madre',
  'CIAP Personal',
  'Cochera',
  'Deportes',
  'Supermercado',
  'Salud',
  'Salidas',
  'Varios'
];

const CATEGORIAS_INGRESO_DEFAULT = [
  'Paciente Propio',
  'Retiro Utilidades CIAP'
];

export default function DireccionPrivadaModulo() {
  // Manejo del PIN (Inicia en 2026 y es editable por Sandra)
  const [pinCorrecto, setPinCorrecto] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const guardado = localStorage.getItem('ciap_pin_direccion');
      if (guardado && guardado.length === 4) return guardado;
    }
    return '2026';
  });

  // Estado de desbloqueo con PIN de 4 dígitos
  const [desbloqueado, setDesbloqueado] = useState(false);
  const [pinIngresado, setPinIngresado] = useState('');
  const [errorPin, setErrorPin] = useState(false);

  // Selector de Solapa Principal dentro de Dirección
  const [solapaActiva, setSolapaActiva] = useState<'agenda' | 'finanzas'>('agenda');

  // Modal para cambiar PIN
  const [modalCambiarPin, setModalCambiarPin] = useState(false);
  const [pinActualInput, setPinActualInput] = useState('');
  const [pinNuevoInput, setPinNuevoInput] = useState('');
  const [pinConfirmarInput, setPinConfirmarInput] = useState('');
  const [errorCambioPin, setErrorCambioPin] = useState('');
  const [exitoCambioPin, setExitoCambioPin] = useState(false);

  // Movimientos financieros privados
  const [movimientos, setMovimientos] = useState<MovimientoDireccion[]>([]);
  const [cargando, setCargando] = useState(false);
  const [guardadoExito, setGuardadoExito] = useState(false);

  // Agenda de Pacientes Particulares
  const [turnosPrivados, setTurnosPrivados] = useState<TurnoPrivado[]>([]);
  const [cargandoTurnos, setCargandoTurnos] = useState(false);
  const [turnoExito, setTurnoExito] = useState(false);

  // Formulario Nuevo Turno Privado
  const [pacienteTurnoNombre, setPacienteTurnoNombre] = useState('');
  const [fechaTurnoPrivado, setFechaTurnoPrivado] = useState(() => new Date().toISOString().slice(0, 10));
  const [horaTurnoPrivado, setHoraTurnoPrivado] = useState('17:00');
  const [modalidadTurnoPrivado, setModalidadTurnoPrivado] = useState<'Presencial' | 'Virtual'>('Presencial');
  const [arancelTurnoPrivado, setArancelTurnoPrivado] = useState('20000');

  // Formulario de Finanzas (Movimiento manual)
  const [tipo, setTipo] = useState<'Ingreso' | 'Egreso'>('Egreso');
  const [categoria, setCategoria] = useState('Supermercado');
  const [detalle, setDetalle] = useState('');
  const [importe, setImporte] = useState('');
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [cuenta, setCuenta] = useState('Mercado Pago');

  // Categorías dinámicas administrables
  const [categoriasEgreso, setCategoriasEgreso] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const cache = localStorage.getItem('ciap_cat_egreso_dir');
      if (cache) {
        try { return JSON.parse(cache); } catch (e) {}
      }
    }
    return CATEGORIAS_EGRESO_DEFAULT;
  });

  const [categoriasIngreso, setCategoriasIngreso] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const cache = localStorage.getItem('ciap_cat_ingreso_dir');
      if (cache) {
        try { return JSON.parse(cache); } catch (e) {}
      }
    }
    return CATEGORIAS_INGRESO_DEFAULT;
  });

  const [modalNuevaCat, setModalNuevaCat] = useState(false);
  const [nombreNuevaCat, setNombreNuevaCat] = useState('');

  // Filtros Finanzas
  const [filtroTipo, setFiltroTipo] = useState<'Todos' | 'Ingreso' | 'Egreso'>('Todos');
  const [busqueda, setBusqueda] = useState('');
  const [mesSeleccionado, setMesSeleccionado] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // Cargar Movimientos
  const cargarDatosFinanzas = async () => {
    setCargando(true);
    try {
      const data = await obtenerMovimientosDireccion();
      setMovimientos(data.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')));
    } catch (e) {
      console.error('Error cargando movimientos de dirección:', e);
    } finally {
      setCargando(false);
    }
  };

  // Cargar Agenda de Turnos Privados
  const cargarTurnosPrivados = async () => {
    setCargandoTurnos(true);
    try {
      const snap = await getDocs(collection(db, 'turnos_privados_direccion'));
      const lista: TurnoPrivado[] = snap.docs.map(d => ({
        id: d.id,
        pacienteNombre: d.data().pacienteNombre,
        fecha: d.data().fecha,
        hora: d.data().hora,
        modalidad: d.data().modalidad,
        arancel: d.data().arancel || 0,
        estado: d.data().estado || 'Pendiente',
        cuentaDestino: d.data().cuentaDestino,
        creadoEn: d.data().creadoEn
      }));
      // Ordenar por fecha y hora descendente
      lista.sort((a, b) => `${b.fecha} ${b.hora}`.localeCompare(`${a.fecha} ${a.hora}`));
      setTurnosPrivados(lista);
    } catch (e) {
      console.error('Error cargando turnos privados:', e);
    } finally {
      setCargandoTurnos(false);
    }
  };

  useEffect(() => {
    if (desbloqueado) {
      cargarDatosFinanzas();
      cargarTurnosPrivados();
    }
  }, [desbloqueado]);

  // Guardar categorías personalizadas en localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ciap_cat_egreso_dir', JSON.stringify(categoriasEgreso));
    }
  }, [categoriasEgreso]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ciap_cat_ingreso_dir', JSON.stringify(categoriasIngreso));
    }
  }, [categoriasIngreso]);

  // Lógica del PIN con teclado físico y táctil
  const handleAgregarDigito = useCallback((digito: string) => {
    setErrorPin(false);
    setPinIngresado((prev) => {
      if (prev.length >= 4) return prev;
      const nuevo = prev + digito;
      if (nuevo.length === 4) {
        if (nuevo === pinCorrecto) {
          setTimeout(() => {
            setDesbloqueado(true);
            setErrorPin(false);
            setPinIngresado('');
          }, 100);
        } else {
          setErrorPin(true);
          setTimeout(() => {
            setPinIngresado('');
            setErrorPin(false);
          }, 900);
        }
      }
      return nuevo;
    });
  }, [pinCorrecto]);

  const handleBorrarDigito = useCallback(() => {
    setErrorPin(false);
    setPinIngresado((prev) => prev.slice(0, -1));
  }, []);

  useEffect(() => {
    if (desbloqueado) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(e.key)) {
        e.preventDefault();
        handleAgregarDigito(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBorrarDigito();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setPinIngresado('');
        setErrorPin(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [desbloqueado, handleAgregarDigito, handleBorrarDigito]);

  const handleBloquear = () => {
    setDesbloqueado(false);
    setPinIngresado('');
    setErrorPin(false);
  };

  // Cambio de PIN
  const handleCambiarPinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorCambioPin('');

    if (pinActualInput !== pinCorrecto) {
      setErrorCambioPin('El PIN actual no es correcto.');
      return;
    }

    if (!/^\d{4}$/.test(pinNuevoInput)) {
      setErrorCambioPin('El nuevo PIN debe tener exactamente 4 números.');
      return;
    }

    if (pinNuevoInput !== pinConfirmarInput) {
      setErrorCambioPin('La confirmación del nuevo PIN no coincide.');
      return;
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('ciap_pin_direccion', pinNuevoInput);
    }
    setPinCorrecto(pinNuevoInput);
    setExitoCambioPin(true);

    setTimeout(() => {
      setExitoCambioPin(false);
      setModalCambiarPin(false);
      setPinActualInput('');
      setPinNuevoInput('');
      setPinConfirmarInput('');
    }, 1500);
  };

  // Guardar Turno Privado de Sandra
  const handleCrearTurnoPrivado = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pacienteTurnoNombre.trim()) return;

    const monto = Number(arancelTurnoPrivado) || 0;
    setCargandoTurnos(true);
    try {
      await addDoc(collection(db, 'turnos_privados_direccion'), {
        pacienteNombre: pacienteTurnoNombre.trim(),
        fecha: fechaTurnoPrivado,
        hora: horaTurnoPrivado,
        modalidad: modalidadTurnoPrivado,
        arancel: monto,
        estado: 'Pendiente',
        creadoEn: serverTimestamp()
      });

      setPacienteTurnoNombre('');
      setTurnoExito(true);
      setTimeout(() => setTurnoExito(false), 3000);
      await cargarTurnosPrivados();
    } catch (e) {
      console.error('Error agendando turno particular:', e);
      alert('No se pudo agendar el turno.');
    } finally {
      setCargandoTurnos(false);
    }
  };

  // Asentar Cobro de Turno Privado (Pasa a Cobrado y crea el Ingreso en Finanzas)
  const handleAsentarCobroTurno = async (turno: TurnoPrivado) => {
    try {
      // 1. Actualizar estado del turno a Cobrado
      await updateDoc(doc(db, 'turnos_privados_direccion', turno.id), {
        estado: 'Cobrado',
        cuentaDestino: 'Mercado Pago'
      });

      // 2. Registrar automáticamente el ingreso en el libro contable de Sandra
      await guardarMovimientoDireccion({
        tipo: 'Ingreso',
        subtipo: 'Paciente Propio',
        detalle: `${turno.pacienteNombre} (Sesión particular ${turno.modalidad})`,
        importe: turno.arancel,
        fecha: turno.fecha,
        cuenta: 'Mercado Pago'
      });

      await Promise.all([cargarTurnosPrivados(), cargarDatosFinanzas()]);
    } catch (e) {
      console.error('Error cobrando turno privado:', e);
      alert('No se pudo asentar el cobro.');
    }
  };

  // Eliminar Turno Privado
  const handleEliminarTurnoPrivado = async (id: string) => {
    if (!confirm('¿Eliminar esta cita de tu agenda particular?')) return;
    try {
      await deleteDoc(doc(db, 'turnos_privados_direccion', id));
      await cargarTurnosPrivados();
    } catch (e) {
      console.error('Error eliminando turno:', e);
    }
  };

  // Guardar Categoría de Finanzas
  const handleGuardarNuevaCategoria = (e: React.FormEvent) => {
    e.preventDefault();
    const limpia = nombreNuevaCat.trim();
    if (!limpia) return;

    if (tipo === 'Egreso') {
      if (!categoriasEgreso.includes(limpia)) {
        setCategoriasEgreso(prev => [...prev, limpia]);
        setCategoria(limpia);
      }
    } else {
      if (!categoriasIngreso.includes(limpia)) {
        setCategoriasIngreso(prev => [...prev, limpia]);
        setCategoria(limpia);
      }
    }

    setNombreNuevaCat('');
    setModalNuevaCat(false);
  };

  // Guardar Movimiento Manual en Finanzas
  const handleSubmitMovimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    const monto = Number(importe);
    if (!monto || isNaN(monto) || !detalle.trim()) return;

    setCargando(true);
    try {
      await guardarMovimientoDireccion({
        tipo,
        subtipo: categoria as any,
        detalle: detalle.trim(),
        importe: monto,
        fecha,
        cuenta
      });

      setDetalle('');
      setImporte('');
      setGuardadoExito(true);
      setTimeout(() => setGuardadoExito(false), 3000);

      await cargarDatosFinanzas();
    } catch (e) {
      console.error('Error guardando movimiento:', e);
      alert('No se pudo guardar el registro.');
    } finally {
      setCargando(false);
    }
  };

  const handleEliminarMovimiento = async (id: string) => {
    if (!confirm('¿Eliminar este registro privado?')) return;
    try {
      await eliminarMovimientoDireccion(id);
      await cargarDatosFinanzas();
    } catch (e) {
      console.error('Error al eliminar registro:', e);
    }
  };

  // Cálculos Finanzas
  const movimientosFiltrados = useMemo(() => {
    return movimientos.filter(m => {
      if (mesSeleccionado !== 'TODOS') {
        const mMes = (m.fecha || '').slice(0, 7);
        if (mMes !== mesSeleccionado) return false;
      }
      if (filtroTipo !== 'Todos' && m.tipo !== filtroTipo) return false;
      return `${m.detalle} ${m.subtipo} ${m.cuenta || ''}`.toLowerCase().includes(busqueda.toLowerCase());
    });
  }, [movimientos, mesSeleccionado, filtroTipo, busqueda]);

  const totalIngresos = useMemo(() => {
    return movimientos
      .filter(m => (mesSeleccionado === 'TODOS' || (m.fecha || '').slice(0, 7) === mesSeleccionado) && m.tipo === 'Ingreso')
      .reduce((acc, curr) => acc + (curr.importe || 0), 0);
  }, [movimientos, mesSeleccionado]);

  const totalEgresos = useMemo(() => {
    return movimientos
      .filter(m => (mesSeleccionado === 'TODOS' || (m.fecha || '').slice(0, 7) === mesSeleccionado) && m.tipo === 'Egreso')
      .reduce((acc, curr) => acc + (curr.importe || 0), 0);
  }, [movimientos, mesSeleccionado]);

  const balanceNeto = totalIngresos - totalEgresos;

  // PANTALLA DE BLOQUEO POR PIN
  if (!desbloqueado) {
    return (
      <div className="min-h-[520px] flex items-center justify-center p-4">
        <div className="bg-white border border-[#E8E3DA] rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-lg text-center space-y-6">
          
          <div className="w-14 h-14 bg-[#1A2E24] text-white rounded-2xl flex items-center justify-center mx-auto shadow-md">
            <Lock className="w-7 h-7 text-[#E3A382]" />
          </div>

          <div>
            <span className="text-[10px] font-bold tracking-widest text-[#A8532F] uppercase block">
              Acceso Exclusivo Dirección
            </span>
            <h3 className="text-lg font-bold text-[#1E2923] mt-1">
              Libro Privado de Sandra
            </h3>
            <p className="text-xs text-[#6F7D74] mt-1">
              Ingresá el PIN de seguridad de 4 dígitos para ver los pacientes y gastos personales.
            </p>
          </div>

          {/* Círculos del PIN */}
          <div className="flex items-center justify-center gap-3">
            {[0, 1, 2, 3].map(idx => (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                  pinIngresado.length > idx 
                    ? 'bg-[#223D30] border-[#223D30] scale-110' 
                    : errorPin 
                    ? 'border-red-500 bg-red-100 animate-pulse' 
                    : 'border-[#DDD6CC] bg-[#FAF8F5]'
                }`}
              />
            ))}
          </div>

          {errorPin ? (
            <p className="text-xs font-bold text-red-600">
              PIN incorrecto. Intentá nuevamente.
            </p>
          ) : (
            <p className="text-[11px] text-[#8C9B91]">
              Podés usar el teclado físico o hacer clic en los números.
            </p>
          )}

          {/* Teclado Numérico */}
          <div className="grid grid-cols-3 gap-2.5 max-w-[240px] mx-auto pt-1">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(n => (
              <button
                key={n}
                type="button"
                onClick={() => handleAgregarDigito(n)}
                className="h-12 rounded-2xl bg-[#FAF8F5] hover:bg-[#EFECE6] border border-[#E8E3DA] text-base font-bold text-[#1E2923] transition-colors cursor-pointer active:scale-95 shadow-2xs"
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setPinIngresado('');
                setErrorPin(false);
              }}
              className="h-12 rounded-2xl bg-[#FAF8F5] hover:bg-[#EFECE6] border border-[#E8E3DA] text-xs font-semibold text-[#6F7D74] cursor-pointer"
            >
              C
            </button>
            <button
              type="button"
              onClick={() => handleAgregarDigito('0')}
              className="h-12 rounded-2xl bg-[#FAF8F5] hover:bg-[#EFECE6] border border-[#E8E3DA] text-base font-bold text-[#1E2923] cursor-pointer active:scale-95 shadow-2xs"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBorrarDigito}
              className="h-12 rounded-2xl bg-[#FAF8F5] hover:bg-[#EFECE6] border border-[#E8E3DA] text-xs font-bold text-[#A8532F] cursor-pointer"
            >
              ←
            </button>
          </div>

        </div>
      </div>
    );
  }

  // VISTA PRIVADA DESBLOQUEADA
  return (
    <div className="space-y-6">
      
      {/* BANNER PRIVADO DE SANDRA CON SUBTÍTULO LIMPIO */}
      <div className="bg-[#1A2E24] text-white rounded-3xl p-6 sm:p-7 shadow-xs space-y-5 border border-[#2D4D3D]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-4 border-b border-[#284638]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold tracking-widest text-[#E3A382] uppercase flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Libro Privado de Sandra</span>
              </span>
              <span className="text-[#8C9B91]">•</span>
              <span className="text-xs font-semibold text-emerald-200">100% Confidencial</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              Control Privado de Finanzas & Pacientes
            </h2>
            <p className="text-xs sm:text-sm text-[#C8D6CF] mt-1 max-w-2xl">
              Pacientes particulares, retiros del centro y gastos personales.
            </p>
          </div>

          {/* Botones de Seguridad: Cambiar PIN y Bloquear */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setErrorCambioPin('');
                setExitoCambioPin(false);
                setPinActualInput('');
                setPinNuevoInput('');
                setPinConfirmarInput('');
                setModalCambiarPin(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#243E31] hover:bg-[#2F5241] text-emerald-200 hover:text-white rounded-2xl text-xs font-bold transition-all border border-[#3C614E] cursor-pointer shadow-xs"
              title="Cambiar PIN de 4 dígitos"
            >
              <KeyRound className="w-3.5 h-3.5 text-[#E3A382]" />
              <span>Cambiar PIN</span>
            </button>

            <button
              type="button"
              onClick={handleBloquear}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#284638] hover:bg-[#345B49] text-white rounded-2xl text-xs font-bold transition-all border border-[#3C614E] cursor-pointer shadow-xs"
            >
              <Lock className="w-3.5 h-3.5 text-[#E3A382]" />
              <span>Bloquear y Salir</span>
            </button>
          </div>
        </div>

        {/* MÉTRICAS FINANCIERAS PERSONALES */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          
          <div className="bg-[#243E31] border border-[#385B49] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-200 flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-300" />
                Ingresos Personales
              </span>
            </div>
            <span className="text-xl sm:text-2xl font-bold font-mono text-white block">
              $ {totalIngresos.toLocaleString('es-AR')}
            </span>
            <span className="text-[10px] text-[#A0B5AA] mt-0.5 block">Pacientes propios + Ganancias CIAP</span>
          </div>

          <div className="bg-[#243E31] border border-[#385B49] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-200 flex items-center gap-1">
                <ArrowDownRight className="w-3.5 h-3.5 text-rose-300" />
                Gastos Personales / Madre
              </span>
            </div>
            <span className="text-xl sm:text-2xl font-bold font-mono text-rose-200 block">
              $ {totalEgresos.toLocaleString('es-AR')}
            </span>
            <span className="text-[10px] text-[#A0B5AA] mt-0.5 block">Madre, Cochera, Deportes, Super, etc.</span>
          </div>

          <div className="bg-[#15251D] border border-[#2D4D3D] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#E3A382] flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5 text-[#E3A382]" />
                Balance Limpio de Bolsillo
              </span>
            </div>
            <span className={`text-xl sm:text-2xl font-bold font-mono block ${balanceNeto >= 0 ? 'text-white' : 'text-rose-300'}`}>
              $ {balanceNeto.toLocaleString('es-AR')}
            </span>
            <span className="text-[10px] text-[#A0B5AA] mt-0.5 block">Lo que te queda disponible neto</span>
          </div>

        </div>
      </div>

      {/* PESTAÑAS DE NAVEGACIÓN PRIVADA: AGENDA VS FINANZAS */}
      <div className="flex items-center gap-2 bg-white border border-[#E8E3DA] p-1.5 rounded-2xl shadow-xs">
        <button
          type="button"
          onClick={() => setSolapaActiva('agenda')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            solapaActiva === 'agenda'
              ? 'bg-[#223D30] text-white shadow-2xs'
              : 'text-[#4A554E] hover:text-[#1E2923] hover:bg-[#FAF8F5]'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          <span>Agenda y Pacientes Particulares</span>
          <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-md bg-[#385B49] text-white">
            {turnosPrivados.filter(t => t.estado === 'Pendiente').length} pendientes
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSolapaActiva('finanzas')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            solapaActiva === 'finanzas'
              ? 'bg-[#223D30] text-white shadow-2xs'
              : 'text-[#4A554E] hover:text-[#1E2923] hover:bg-[#FAF8F5]'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Control Financiero y Movimientos</span>
        </button>
      </div>

      {/* VISTA 1: AGENDA DE PACIENTES PARTICULARES */}
      {solapaActiva === 'agenda' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start animate-in fade-in duration-150">
          
          {/* Formulario para Agendar Turno Privado */}
          <div className="xl:col-span-5 bg-white border border-[#E8E3DA] rounded-3xl p-6 shadow-xs xl:sticky xl:top-24 space-y-4">
            <div className="flex items-center gap-3 pb-4 border-b border-[#F0EBE3]">
              <div className="w-9 h-9 rounded-2xl bg-[#A8532F] text-white flex items-center justify-center shrink-0 shadow-xs">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1E2923]">Agendar Paciente Propio</h3>
                <p className="text-[11px] text-[#6F7D74]">Solo visible para vos (Dirección)</p>
              </div>
            </div>

            {turnoExito && (
              <div className="p-3 bg-[#EAF5EF] border border-[#BCE1CC] text-[#1E5C38] rounded-2xl text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-[#2E8B57]" />
                <span>¡Turno guardado en tu agenda privada!</span>
              </div>
            )}

            <form onSubmit={handleCrearTurnoPrivado} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#3C4A42] mb-1">
                  Nombre Completo del Paciente
                </label>
                <input
                  type="text"
                  required
                  value={pacienteTurnoNombre}
                  onChange={(e) => setPacienteTurnoNombre(e.target.value)}
                  placeholder="Ej: Camila Gómez"
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-medium text-[#1E2923] focus:outline-none focus:ring-2 focus:ring-[#223D30] focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-[#3C4A42] mb-1">
                    Fecha de la Cita
                  </label>
                  <input
                    type="date"
                    required
                    value={fechaTurnoPrivado}
                    onChange={(e) => setFechaTurnoPrivado(e.target.value)}
                    className="w-full px-2.5 py-2 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-[#3C4A42] mb-1">
                    Horario
                  </label>
                  <input
                    type="time"
                    required
                    value={horaTurnoPrivado}
                    onChange={(e) => setHoraTurnoPrivado(e.target.value)}
                    className="w-full px-2.5 py-2 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-[#3C4A42] mb-1">
                    Modalidad
                  </label>
                  <select
                    value={modalidadTurnoPrivado}
                    onChange={(e) => setModalidadTurnoPrivado(e.target.value as any)}
                    className="w-full px-2.5 py-2 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    <option value="Presencial">Presencial (Consultorio)</option>
                    <option value="Virtual">Virtual (Online)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-[#3C4A42] mb-1">
                    Arancel Pactado ($)
                  </label>
                  <input
                    type="number"
                    required
                    value={arancelTurnoPrivado}
                    onChange={(e) => setArancelTurnoPrivado(e.target.value)}
                    placeholder="20000"
                    className="w-full px-2.5 py-2 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={cargandoTurnos}
                className="w-full mt-2 py-3 bg-[#223D30] hover:bg-[#182C22] text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                {cargandoTurnos ? 'Agendando...' : 'Guardar Cita en Mi Agenda'}
              </button>
            </form>
          </div>

          {/* Lista de Turnos Agendados de Sandra */}
          <div className="xl:col-span-7 bg-white border border-[#E8E3DA] rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-[#F0EBE3]">
              <div>
                <h3 className="text-sm font-bold text-[#1E2923]">Turnos Particulares Agendados</h3>
                <p className="text-[11px] text-[#6F7D74]">
                  Total: <strong className="text-[#1E2923]">{turnosPrivados.length}</strong> citas particulares
                </p>
              </div>

              <span className="text-[11px] font-bold text-[#A8532F] bg-[#FAF8F5] border border-[#DDD6CC] px-2.5 py-1 rounded-xl">
                Sandra · Particulares
              </span>
            </div>

            <div className="overflow-y-auto max-h-[calc(100vh-320px)] pr-1 space-y-2.5">
              {turnosPrivados.length === 0 ? (
                <div className="py-16 text-center text-[#8C9B91] text-xs">
                  No tenés turnos particulares agendados. Podés cargar el primero con el formulario.
                </div>
              ) : (
                turnosPrivados.map((turno) => {
                  const yaCobrado = turno.estado === 'Cobrado';

                  return (
                    <div
                      key={turno.id}
                      className="border border-[#EFECE6] bg-[#FCFBF9] hover:bg-white rounded-2xl p-4 transition-all shadow-2xs space-y-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-[#1E2923]">{turno.pacienteNombre}</h4>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              turno.modalidad === 'Presencial' 
                                ? 'bg-[#EBF2EE] text-[#223D30] border border-[#C5D9CD]'
                                : 'bg-[#F5EFEA] text-[#A8532F] border border-[#E9D7C9]'
                            }`}>
                              {turno.modalidad}
                            </span>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              yaCobrado 
                                ? 'bg-[#EAF5EF] text-[#1E5C38] border border-[#BCE1CC]'
                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}>
                              {turno.estado}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 mt-1 text-xs text-[#6F7D74] font-mono">
                            <Calendar className="w-3.5 h-3.5 text-[#A8532F]" />
                            <span>{turno.fecha} a las {turno.hora} hs</span>
                            <span>•</span>
                            <strong className="text-[#1E2923] font-sans">$ {turno.arancel.toLocaleString('es-AR')}</strong>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {!yaCobrado ? (
                            <button
                              type="button"
                              onClick={() => handleAsentarCobroTurno(turno)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-[#223D30] hover:bg-[#182C22] text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-2xs"
                              title="Marcar como cobrado y pasar a mis ingresos"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>✓ Asentar Cobro</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-emerald-700 font-bold bg-[#EAF5EF] px-2 py-1 rounded-lg border border-[#BCE1CC] flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              <span>Asentado en Finanzas</span>
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => handleEliminarTurnoPrivado(turno.id)}
                            title="Eliminar turno"
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-zinc-400 hover:text-rose-600 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      )}

      {/* VISTA 2: FINANZAS PERSONALES Y MOVIMIENTOS */}
      {solapaActiva === 'finanzas' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start animate-in fade-in duration-150">
          
          {/* FORMULARIO DE REGISTRO FINANCIERO */}
          <div className="xl:col-span-5 bg-white border border-[#E8E3DA] rounded-3xl p-6 shadow-xs xl:sticky xl:top-24 space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-[#F0EBE3]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-[#A8532F] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1E2923]">Asentar Movimiento</h3>
                  <p className="text-[11px] text-[#6F7D74]">Podés cargar en el día o al cierre de semana</p>
                </div>
              </div>

              {/* Selector Rápido: Ingreso vs Egreso */}
              <div className="flex items-center bg-[#FAF8F5] border border-[#DDD6CC] p-1 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setTipo('Ingreso');
                    setCategoria(categoriasIngreso[0] || 'Paciente Propio');
                  }}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    tipo === 'Ingreso' ? 'bg-[#223D30] text-white shadow-2xs' : 'text-[#6F7D74]'
                  }`}
                >
                  + Ingreso
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTipo('Egreso');
                    setCategoria(categoriasEgreso[0] || 'Madre');
                  }}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    tipo === 'Egreso' ? 'bg-rose-700 text-white shadow-2xs' : 'text-[#6F7D74]'
                  }`}
                >
                  - Gasto
                </button>
              </div>
            </div>

            {guardadoExito && (
              <div className="p-3 bg-[#EAF5EF] border border-[#BCE1CC] text-[#1E5C38] rounded-2xl text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-[#2E8B57]" />
                <span>¡Registro guardado en tu libro privado!</span>
              </div>
            )}

            <form onSubmit={handleSubmitMovimiento} className="space-y-3.5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#3C4A42]">
                    {tipo === 'Ingreso' ? 'Tipo de Ingreso' : 'Categoría del Gasto'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setModalNuevaCat(true)}
                    className="text-[10px] font-bold text-[#A8532F] hover:text-[#914524] flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Crear Categoría</span>
                  </button>
                </div>

                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-bold text-[#1E2923] focus:outline-none focus:ring-2 focus:ring-[#223D30] cursor-pointer"
                >
                  {(tipo === 'Ingreso' ? categoriasIngreso : categoriasEgreso).map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#3C4A42] mb-1">
                  {tipo === 'Ingreso' && categoria.includes('Paciente') 
                    ? 'Nombre del Paciente y Motivo' 
                    : 'Detalle o Concepto'}
                </label>
                <input
                  type="text"
                  required
                  value={detalle}
                  onChange={(e) => setDetalle(e.target.value)}
                  placeholder={
                    tipo === 'Ingreso' 
                      ? 'Ej: Camila Gómez (Sesión particular online)' 
                      : 'Ej: Farmacia mamá, Cuota club pádel, Compra Coto...'
                  }
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#223D30]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-[#3C4A42] mb-1">
                    Monto ($)
                  </label>
                  <input
                    type="number"
                    required
                    value={importe}
                    onChange={(e) => setImporte(e.target.value)}
                    placeholder="20000"
                    className="w-full px-2.5 py-2 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-[#3C4A42] mb-1">
                    Fecha (Día o Fin de Semana)
                  </label>
                  <input
                    type="date"
                    required
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="w-full px-2.5 py-2 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#3C4A42] mb-1">
                  Medio / Cuenta de Manejo
                </label>
                <select
                  value={cuenta}
                  onChange={(e) => setCuenta(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-medium cursor-pointer"
                >
                  <option value="Mercado Pago">Mercado Pago</option>
                  <option value="Santander">Santander</option>
                  <option value="Banco Ciudad">Banco Ciudad</option>
                  <option value="Efectivo en Mano">Efectivo en Mano</option>
                  <option value="Tarjeta de Crédito">Tarjeta de Crédito</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={cargando}
                className={`w-full mt-2 py-3 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50 ${
                  tipo === 'Ingreso' ? 'bg-[#223D30] hover:bg-[#182C22]' : 'bg-[#A8532F] hover:bg-[#914524]'
                }`}
              >
                {cargando ? 'Guardando...' : `Registrar ${tipo} Privado`}
              </button>
            </form>
          </div>

          {/* LISTADO DE MOVIMIENTOS CON FILTROS */}
          <div className="xl:col-span-7 bg-white border border-[#E8E3DA] rounded-3xl p-6 shadow-xs space-y-4">
            
            <div className="space-y-4 pb-4 border-b border-[#F0EBE3]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-[#1E2923]">Historial Privado de Movimientos</h3>
                  <p className="text-[11px] text-[#6F7D74]">
                    Total registros: <strong className="text-[#1E2923]">{movimientosFiltrados.length}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2 bg-[#FAF8F5] border border-[#DDD6CC] px-3 py-1.5 rounded-2xl">
                  <Calendar className="w-3.5 h-3.5 text-[#A8532F]" />
                  <select
                    value={mesSeleccionado}
                    onChange={(e) => setMesSeleccionado(e.target.value)}
                    className="bg-transparent text-xs font-bold text-[#1E2923] focus:outline-none cursor-pointer"
                  >
                    <option value="2026-11">11/2026 (Noviembre)</option>
                    <option value="2026-10">10/2026 (Octubre)</option>
                    <option value="2026-09">09/2026 (Septiembre)</option>
                    <option value="2026-12">12/2026 (Diciembre)</option>
                    <option value="TODOS">Todos los meses</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center bg-[#FAF8F5] border border-[#DDD6CC] p-1 rounded-xl text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setFiltroTipo('Todos')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      filtroTipo === 'Todos' ? 'bg-[#223D30] text-white' : 'text-[#6F7D74]'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroTipo('Ingreso')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      filtroTipo === 'Ingreso' ? 'bg-emerald-800 text-white' : 'text-[#6F7D74]'
                    }`}
                  >
                    Ingresos
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroTipo('Egreso')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      filtroTipo === 'Egreso' ? 'bg-rose-800 text-white' : 'text-[#6F7D74]'
                    }`}
                  >
                    Egresos
                  </button>
                </div>

                <div className="relative w-full sm:w-48">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar..."
                    className="w-full pl-8 pr-2.5 py-1.5 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-y-auto max-h-[calc(100vh-320px)] pr-1 space-y-2.5">
              {movimientosFiltrados.length === 0 ? (
                <div className="py-16 text-center text-[#8C9B91] text-xs">
                  No hay movimientos privados registrados en este período.
                </div>
              ) : (
                movimientosFiltrados.map((mov) => {
                  const esIngreso = mov.tipo === 'Ingreso';

                  return (
                    <div
                      key={mov.id}
                      className="border border-[#EFECE6] bg-[#FCFBF9] hover:bg-white rounded-2xl p-4 transition-all shadow-2xs space-y-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-[#1E2923]">{mov.detalle}</h4>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              esIngreso 
                                ? 'bg-[#EAF5EF] text-[#1E5C38] border border-[#BCE1CC]'
                                : 'bg-rose-50 text-rose-800 border border-rose-200'
                            }`}>
                              {mov.subtipo}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 mt-1 text-xs text-[#6F7D74] font-mono">
                            <Calendar className="w-3.5 h-3.5 text-[#A8532F]" />
                            <span>{mov.fecha}</span>
                            <span>•</span>
                            <span>{mov.cuenta || 'Sin especificar'}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className={`text-base font-bold font-mono ${
                            esIngreso ? 'text-emerald-700' : 'text-rose-700'
                          }`}>
                            {esIngreso ? '+' : '-'} $ {(mov.importe || 0).toLocaleString('es-AR')}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleEliminarMovimiento(mov.id)}
                            title="Eliminar registro"
                            className="p-1 rounded-lg hover:bg-rose-50 text-zinc-400 hover:text-rose-600 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>

        </div>
      )}

      {/* MODAL PARA CAMBIAR PIN PRIVADO */}
      {modalCambiarPin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-[#E8E3DA] rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-xl space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-[#F0EBE3]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#1A2E24] text-white flex items-center justify-center">
                  <KeyRound className="w-4 h-4 text-[#E3A382]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1E2923]">Cambiar PIN de Dirección</h3>
                  <p className="text-[11px] text-[#6F7D74]">Clave personal de 4 dígitos</p>
                </div>
              </div>
              <button
                onClick={() => setModalCambiarPin(false)}
                className="text-zinc-400 hover:text-zinc-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {exitoCambioPin ? (
              <div className="p-4 bg-[#EAF5EF] border border-[#BCE1CC] text-[#1E5C38] rounded-2xl text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 mx-auto text-[#2E8B57]" />
                <h4 className="text-xs font-bold">¡PIN actualizado con éxito!</h4>
                <p className="text-[11px] text-[#2E8B57]">
                  Tu nuevo código de acceso ya se encuentra activo.
                </p>
              </div>
            ) : (
              <form onSubmit={handleCambiarPinSubmit} className="space-y-3">
                {errorCambioPin && (
                  <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
                    {errorCambioPin}
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#3C4A42] mb-1">
                    PIN Actual
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    required
                    value={pinActualInput}
                    onChange={(e) => setPinActualInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-center text-sm font-mono tracking-widest font-bold focus:outline-none focus:ring-2 focus:ring-[#223D30]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#3C4A42] mb-1">
                    Nuevo PIN (4 Números)
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    required
                    value={pinNuevoInput}
                    onChange={(e) => setPinNuevoInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-center text-sm font-mono tracking-widest font-bold focus:outline-none focus:ring-2 focus:ring-[#223D30]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#3C4A42] mb-1">
                    Confirmar Nuevo PIN
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    required
                    value={pinConfirmarInput}
                    onChange={(e) => setPinConfirmarInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-center text-sm font-mono tracking-widest font-bold focus:outline-none focus:ring-2 focus:ring-[#223D30]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F0EBE3]">
                  <button
                    type="button"
                    onClick={() => setModalCambiarPin(false)}
                    className="px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-800 cursor-pointer font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#1A2E24] hover:bg-[#254234] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    Guardar Nuevo PIN
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

      {/* MODAL PARA CREAR NUEVA CATEGORÍA */}
      {modalNuevaCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-[#E8E3DA] rounded-3xl p-6 max-w-sm w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0EBE3]">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-[#A8532F]" />
                <h3 className="text-sm font-bold text-[#1E2923]">Nueva Categoría ({tipo})</h3>
              </div>
              <button
                onClick={() => setModalNuevaCat(false)}
                className="text-zinc-400 hover:text-zinc-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleGuardarNuevaCategoria} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-[#3C4A42] mb-1">
                  Nombre de la Categoría
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  value={nombreNuevaCat}
                  onChange={(e) => setNombreNuevaCat(e.target.value)}
                  placeholder="Ej: Odontólogo, Combustible, Gimnasio..."
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#223D30]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalNuevaCat(false)}
                  className="px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#223D30] hover:bg-[#182C22] text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Guardar Categoría
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}