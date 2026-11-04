'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  guardarSesion, 
  obtenerSesiones, 
  cobrarSesion, 
  obtenerPacientes, 
  obtenerProfesionales,
  liquidarSesionesProfesional 
} from '../../lib/servicios';
import { Sesion, Paciente, CuentaDestino, MetodoPago, Modalidad, Profesional } from '../../types';
import { 
  CreditCard, 
  CheckCircle2, 
  Search, 
  Calendar, 
  Clock, 
  Building, 
  Wallet, 
  Banknote, 
  Landmark,
  ChevronDown, 
  ChevronUp, 
  ChevronsDownUp, 
  ChevronsUpDown,
  CalendarDays,
  Check,
  AlertCircle,
  BadgeCheck,
  Receipt,
  X,
  UserCheck
} from 'lucide-react';

export default function CajaModulo() {
  const { user } = useAuth();

  const [sesiones, setSesiones] = useState<Sesion[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroProfesional, setFiltroProfesional] = useState('TODOS');
  const [filtroEstado, setFiltroEstado] = useState<'Todos' | 'Pendiente' | 'Cobrado'>('Todos');
  const [cargando, setCargando] = useState(false);
  const [guardadoExito, setGuardadoExito] = useState(false);

  const [mostrarAgendaRef, setMostrarAgendaRef] = useState(false);
  const [tarjetasColapsadas, setTarjetasColapsadas] = useState<{ [id: string]: boolean }>({});
  const [todasColapsadas, setTodasColapsadas] = useState(false);

  // Cobro manual de sesión pendiente
  const [cobrandoSesionId, setCobrandoSesionId] = useState<string | null>(null);
  const [cuentaCobro, setCuentaCobro] = useState<CuentaDestino>('Santander');
  const [metodoCobro, setMetodoCobro] = useState<MetodoPago>('Transferencia');
  const [comprobanteCobro, setComprobanteCobro] = useState('');
  const [procesandoCobro, setProcesandoCobro] = useState(false);

  // Modal de Liquidación de los Viernes
  const [modalLiquidacionAbierto, setModalLiquidacionAbierto] = useState(false);
  const [cuentaLiquidacionSalida, setCuentaLiquidacionSalida] = useState<CuentaDestino>('Santander');
  const [comprobanteLiquidacion, setComprobanteLiquidacion] = useState('');
  const [procesandoLiquidacion, setProcesandoLiquidacion] = useState(false);
  const [liquidacionExito, setLiquidacionExito] = useState(false);

  // Buscador predictivo de pacientes
  const [textoBusquedaPaciente, setTextoBusquedaPaciente] = useState('');
  const [dropdownPacienteAbierto, setDropdownPacienteAbierto] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const mesActualKey = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }, []);

  const [mesSeleccionado, setMesSeleccionado] = useState<string>(mesActualKey);

  // Formulario Asentar Sesión
  const [pacienteSeleccionadoId, setPacienteSeleccionadoId] = useState('');
  const [profesionalId, setProfesionalId] = useState('');
  const [modalidad, setModalidad] = useState<Modalidad>('Presencial');
  const [fechaTurno, setFechaTurno] = useState(() => new Date().toISOString().slice(0, 10));
  const [horaTurno, setHoraTurno] = useState('16:00');
  const [importe, setImporte] = useState('18000');
  const [cobrarInmediato, setCobrarInmediato] = useState(false);
  const [cuentaInmediata, setCuentaInmediata] = useState<CuentaDestino>('Santander');
  const [comprobanteInmediato, setComprobanteInmediato] = useState('');

  // Detección automática del operador activo
  const operadorActual = useMemo(() => {
    const email = user?.email?.toLowerCase().trim() || '';
    if (email.includes('carolina')) return 'Carolina';
    if (email.includes('nicolas')) return 'Nicolás';
    if (email === 'sandell661@gmail.com' || email.includes('sandra')) return 'Sandra (Dirección)';
    if (email === 'admin@centrociap.com.ar') return 'Administración';
    if (email.includes('recepcion')) return 'Recepción Central';
    return email ? email.split('@')[0] : 'Recepción';
  }, [user]);

  const cargarDatos = async () => {
    try {
      const [dataSesiones, dataPacientes, dataProfesionales] = await Promise.all([
        obtenerSesiones(),
        obtenerPacientes(),
        obtenerProfesionales()
      ]);
      setSesiones(dataSesiones.sort((a, b) => (b.fechaIso || '').localeCompare(a.fechaIso || '')));
      setPacientes(dataPacientes);
      setProfesionales(dataProfesionales);

      if (dataPacientes.length > 0 && !pacienteSeleccionadoId) {
        setPacienteSeleccionadoId(dataPacientes[0].id);
        const profId = dataPacientes[0].profesionalId || (dataProfesionales[0]?.id ?? '');
        setProfesionalId(profId);
        setModalidad(dataPacientes[0].modalidad || 'Presencial');
      } else if (dataProfesionales.length > 0 && !profesionalId) {
        setProfesionalId(dataProfesionales[0].id);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    const handleClickAfuera = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownPacienteAbierto(false);
      }
    };
    document.addEventListener('mousedown', handleClickAfuera);
    return () => document.removeEventListener('mousedown', handleClickAfuera);
  }, []);

  const handleSeleccionarPaciente = (p: Paciente) => {
    setPacienteSeleccionadoId(p.id);
    const idProf = p.profesionalId || (profesionales[0]?.id ?? '');
    setProfesionalId(idProf);
    setModalidad(p.modalidad || 'Presencial');
    setTextoBusquedaPaciente('');
    setDropdownPacienteAbierto(false);
  };

  const pacienteSeleccionadoObj = useMemo(() => {
    return pacientes.find(p => p.id === pacienteSeleccionadoId) || null;
  }, [pacientes, pacienteSeleccionadoId]);

  const pacientesPrediccion = useMemo(() => {
    if (!textoBusquedaPaciente.trim()) return pacientes.slice(0, 10);
    const busq = textoBusquedaPaciente.toLowerCase().trim();
    return pacientes.filter(p => 
      `${p.nombre} ${p.apellido} ${p.dni} ${p.telefono}`.toLowerCase().includes(busq)
    ).slice(0, 10);
  }, [pacientes, textoBusquedaPaciente]);

  const mesesDisponibles = useMemo(() => {
    const setMeses = new Set<string>();
    setMeses.add(mesActualKey);
    sesiones.forEach(s => {
      if (s.fecha) setMeses.add(s.fecha.slice(0, 7));
    });
    return Array.from(setMeses).sort().reverse();
  }, [sesiones, mesActualKey]);

  const formatearNombreMes = (claveMes: string) => {
    const [anio, mes] = claveMes.split('-');
    const fecha = new Date(Number(anio), Number(mes) - 1, 1);
    const nombre = fecha.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
    return nombre.charAt(0).toUpperCase() + nombre.slice(1);
  };

  const profesionalFiltroObj = useMemo(() => {
    if (filtroProfesional === 'TODOS') return null;
    return profesionales.find(p => p.id === filtroProfesional) || null;
  }, [profesionales, filtroProfesional]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importe || isNaN(Number(importe))) return;

    const pacienteObj = pacientes.find(p => p.id === pacienteSeleccionadoId);
    const profObj = profesionales.find(p => p.id === profesionalId) || profesionales[0];

    const nombrePaciente = pacienteObj ? `${pacienteObj.nombre} ${pacienteObj.apellido}` : 'Paciente General';
    const nombreProf = profObj ? profObj.nombre : 'Psicólogo CIAP';

    setCargando(true);
    try {
      const nuevaSesion: any = {
        pacienteId: pacienteSeleccionadoId || 'sin-id',
        pacienteNombre: nombrePaciente,
        profesionalId: profObj ? profObj.id : profesionalId,
        profesionalNombre: nombreProf,
        fecha: fechaTurno,
        hora: horaTurno,
        modalidad,
        importe: Number(importe),
        estadoPago: cobrarInmediato ? 'Cobrado' : 'Pendiente',
        operador: operadorActual
      };

      if (cobrarInmediato) {
        nuevaSesion.cuentaDestino = cuentaInmediata;
        nuevaSesion.metodoPago = 'Transferencia';
        nuevaSesion.numeroComprobante = comprobanteInmediato.trim() || 'Cobro inmediato';
        nuevaSesion.fechaCobro = new Date().toISOString();
      }

      await guardarSesion(nuevaSesion);

      setComprobanteInmediato('');
      setCobrarInmediato(false);
      setGuardadoExito(true);
      setTimeout(() => setGuardadoExito(false), 3000);

      await cargarDatos();
    } catch (error) {
      console.error('Error guardando sesión:', error);
      alert('Error al registrar la sesión.');
    } finally {
      setCargando(false);
    }
  };

  const handleConfirmarCobro = async (sesionId: string) => {
    setProcesandoCobro(true);
    try {
      await cobrarSesion(sesionId, cuentaCobro, metodoCobro, comprobanteCobro);
      setCobrandoSesionId(null);
      setComprobanteCobro('');
      await cargarDatos();
    } catch (error) {
      console.error('Error cobrando sesión:', error);
      alert('No se pudo asentar el cobro.');
    } finally {
      setProcesandoCobro(false);
    }
  };

  const toggleColapsarTarjeta = (id: string) => {
    setTarjetasColapsadas(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const toggleTodas = () => {
    const nuevoEstado = !todasColapsadas;
    setTodasColapsadas(nuevoEstado);
    const mapa: { [id: string]: boolean } = {};
    sesiones.forEach(s => {
      mapa[s.id] = nuevoEstado;
    });
    setTarjetasColapsadas(mapa);
  };

  const sesionesFiltradas = sesiones.filter(s => {
    if (mesSeleccionado !== 'TODOS') {
      const sMes = (s.fecha || '').slice(0, 7);
      if (sMes !== mesSeleccionado) return false;
    }

    if (filtroProfesional !== 'TODOS') {
      const coincideId = s.profesionalId === filtroProfesional;
      const coincideNombre = profesionalFiltroObj && s.profesionalNombre === profesionalFiltroObj.nombre;
      if (!coincideId && !coincideNombre) return false;
    }

    if (filtroEstado !== 'Todos' && s.estadoPago !== filtroEstado) return false;

    const coincideTexto = `${s.pacienteNombre} ${s.profesionalNombre} ${s.numeroComprobante || ''} ${(s as any).operador || ''}`
      .toLowerCase()
      .includes(busqueda.toLowerCase());

    return coincideTexto;
  });

  const sesionesParaMetricas = useMemo(() => {
    return sesiones.filter(s => {
      if (mesSeleccionado !== 'TODOS') {
        const sMes = (s.fecha || '').slice(0, 7);
        if (sMes !== mesSeleccionado) return false;
      }
      if (filtroProfesional !== 'TODOS') {
        const coincideId = s.profesionalId === filtroProfesional;
        const coincideNombre = profesionalFiltroObj && s.profesionalNombre === profesionalFiltroObj.nombre;
        if (!coincideId && !coincideNombre) return false;
      }
      return true;
    });
  }, [sesiones, mesSeleccionado, filtroProfesional, profesionalFiltroObj]);

  const totalCobrado = useMemo(() => {
    return sesionesParaMetricas
      .filter(s => s.estadoPago === 'Cobrado')
      .reduce((acc, curr) => acc + (curr.importe || 0), 0);
  }, [sesionesParaMetricas]);

  const totalPendiente = useMemo(() => {
    return sesionesParaMetricas
      .filter(s => s.estadoPago === 'Pendiente')
      .reduce((acc, curr) => acc + (curr.importe || 0), 0);
  }, [sesionesParaMetricas]);

  const totalSantander = useMemo(() => {
    return sesionesParaMetricas
      .filter(s => s.estadoPago === 'Cobrado' && s.cuentaDestino === 'Santander')
      .reduce((acc, curr) => acc + (curr.importe || 0), 0);
  }, [sesionesParaMetricas]);

  const totalCiudad = useMemo(() => {
    return sesionesParaMetricas
      .filter(s => s.estadoPago === 'Cobrado' && s.cuentaDestino === 'Banco Ciudad')
      .reduce((acc, curr) => acc + (curr.importe || 0), 0);
  }, [sesionesParaMetricas]);

  const totalMercadoPago = useMemo(() => {
    return sesionesParaMetricas
      .filter(s => s.estadoPago === 'Cobrado' && s.cuentaDestino === 'Mercado Pago')
      .reduce((acc, curr) => acc + (curr.importe || 0), 0);
  }, [sesionesParaMetricas]);

  const totalEfectivo = useMemo(() => {
    return sesionesParaMetricas
      .filter(s => s.estadoPago === 'Cobrado' && s.cuentaDestino === 'Efectivo')
      .reduce((acc, curr) => acc + (curr.importe || 0), 0);
  }, [sesionesParaMetricas]);

  const sesionesPendientesLiquidacion = useMemo(() => {
    if (!profesionalFiltroObj) return [];
    return sesiones.filter(s => {
      const esDelProf = s.profesionalId === profesionalFiltroObj.id || s.profesionalNombre === profesionalFiltroObj.nombre;
      return esDelProf && s.estadoPago === 'Cobrado' && !s.liquidada;
    });
  }, [sesiones, profesionalFiltroObj]);

  const totalRecaudadoParaLiquidar = useMemo(() => {
    return sesionesPendientesLiquidacion.reduce((acc, curr) => acc + (curr.importe || 0), 0);
  }, [sesionesPendientesLiquidacion]);

  const porcentajeProf = 60;
  const netoTransferir = Math.round((totalRecaudadoParaLiquidar * porcentajeProf) / 100);
  const retencionCiap = totalRecaudadoParaLiquidar - netoTransferir;

  const handleEjecutarLiquidacion = async () => {
    if (!profesionalFiltroObj || sesionesPendientesLiquidacion.length === 0) return;

    setProcesandoLiquidacion(true);
    try {
      const ids = sesionesPendientesLiquidacion.map(s => s.id);
      await liquidarSesionesProfesional(
        ids,
        {
          id: profesionalFiltroObj.id,
          nombre: profesionalFiltroObj.nombre,
          porcentaje: porcentajeProf
        },
        totalRecaudadoParaLiquidar,
        netoTransferir,
        cuentaLiquidacionSalida,
        comprobanteLiquidacion.trim() || 'Transf. Viernes Honorarios'
      );

      setLiquidacionExito(true);
      setTimeout(async () => {
        setLiquidacionExito(false);
        setModalLiquidacionAbierto(false);
        setComprobanteLiquidacion('');
        await cargarDatos();
      }, 1500);
    } catch (error) {
      console.error('Error al liquidar sesiones:', error);
      alert('Hubo un error al asentar la liquidación.');
    } finally {
      setProcesandoLiquidacion(false);
    }
  };

  const getIconoCuenta = (cuenta?: CuentaDestino) => {
    switch (cuenta) {
      case 'Efectivo':
        return <Banknote className="w-3.5 h-3.5 text-emerald-700" />;
      case 'Mercado Pago':
        return <Wallet className="w-3.5 h-3.5 text-sky-600" />;
      case 'Banco Ciudad':
        return <Landmark className="w-3.5 h-3.5 text-sky-700" />;
      default:
        return <Building className="w-3.5 h-3.5 text-[#A8532F]" />;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* BANNER CIAP CON DESGLOSE MULTICUENTA */}
      <div className="bg-[#223D30] text-white rounded-3xl p-6 sm:p-7 shadow-xs space-y-5">
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-4 border-b border-[#345343]">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-[11px] font-bold tracking-widest text-[#E3A382] uppercase">
                Control de Ingresos y Liquidaciones
              </span>
              <span className="text-[#8C9B91]">•</span>
              <span className="text-xs font-semibold text-emerald-200">
                {mesSeleccionado === 'TODOS' ? 'Histórico General' : formatearNombreMes(mesSeleccionado)}
              </span>
              {profesionalFiltroObj && (
                <>
                  <span className="text-[#8C9B91]">•</span>
                  <span className="text-xs font-bold text-[#E3A382] bg-[#2D4D3D] px-2.5 py-0.5 rounded-lg border border-[#3C614E]">
                    {profesionalFiltroObj.nombre}
                  </span>
                </>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              Caja y Cobranzas Multicuenta
            </h2>
            <p className="text-xs sm:text-sm text-[#C8D6CF] mt-1 max-w-2xl">
              Trazabilidad en tiempo real de ingresos por banco y caja física para auditoría y liquidaciones.
            </p>
          </div>

          {/* Totales Globales y Botón Liquidar Viernes */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="bg-[#2D4D3D] px-4 py-2.5 rounded-2xl border border-[#3C614E]">
              <span className="text-[10px] font-bold tracking-wider uppercase text-amber-200 block">
                Pendiente de Cobro
              </span>
              <span className="text-sm sm:text-base font-bold font-mono text-amber-300">
                $ {totalPendiente.toLocaleString('es-AR')}
              </span>
            </div>

            <div className="bg-[#1A2E24] px-5 py-2.5 rounded-2xl border border-[#2D4D3D]">
              <span className="text-[10px] font-bold tracking-wider uppercase text-[#E3A382] block">
                Total Cobrado Real
              </span>
              <span className="text-lg sm:text-xl font-bold font-mono text-white">
                $ {totalCobrado.toLocaleString('es-AR')}
              </span>
            </div>

            {profesionalFiltroObj && (
              <button
                type="button"
                onClick={() => setModalLiquidacionAbierto(true)}
                disabled={sesionesPendientesLiquidacion.length === 0}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#A8532F] hover:bg-[#914524] text-white rounded-2xl text-xs font-bold tracking-wide transition-all shadow-md hover:shadow-lg disabled:opacity-40 cursor-pointer"
              >
                <Receipt className="w-4 h-4" />
                <span>
                  {sesionesPendientesLiquidacion.length > 0 
                    ? `Liquidar Viernes ($${netoTransferir.toLocaleString('es-AR')})` 
                    : 'Honorarios al Día'}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* CÁPSULAS DE LAS 4 CUENTAS */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#C8D6CF]">
              {profesionalFiltroObj 
                ? `Fondos ingresados de ${profesionalFiltroObj.nombre} por cuenta:` 
                : 'Fondos ingresados por cuenta (Total Centro CIAP):'}
            </span>
            <span className="text-[10px] text-[#A0B5AA] hidden sm:inline">
              Base auditable para transferencias bancarias
            </span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-[#284638] border border-[#385B49] rounded-2xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-5 h-5 rounded-lg bg-[#E20613]/20 flex items-center justify-center text-[#FF6B6B]">
                  <Building className="w-3 h-3" />
                </div>
                <span className="text-[11px] font-semibold text-[#E8F0EC]">Santander</span>
              </div>
              <span className="text-base sm:text-lg font-bold font-mono text-white block">
                $ {totalSantander.toLocaleString('es-AR')}
              </span>
            </div>

            <div className="bg-[#284638] border border-[#385B49] rounded-2xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-5 h-5 rounded-lg bg-sky-500/20 flex items-center justify-center text-sky-300">
                  <Landmark className="w-3 h-3" />
                </div>
                <span className="text-[11px] font-semibold text-[#E8F0EC]">Banco Ciudad</span>
              </div>
              <span className="text-base sm:text-lg font-bold font-mono text-white block">
                $ {totalCiudad.toLocaleString('es-AR')}
              </span>
            </div>

            <div className="bg-[#284638] border border-[#385B49] rounded-2xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-5 h-5 rounded-lg bg-[#009EE3]/20 flex items-center justify-center text-[#55C5FF]">
                  <Wallet className="w-3 h-3" />
                </div>
                <span className="text-[11px] font-semibold text-[#E8F0EC]">Mercado Pago</span>
              </div>
              <span className="text-base sm:text-lg font-bold font-mono text-white block">
                $ {totalMercadoPago.toLocaleString('es-AR')}
              </span>
            </div>

            <div className="bg-[#284638] border border-[#385B49] rounded-2xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-5 h-5 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-300">
                  <Banknote className="w-3 h-3" />
                </div>
                <span className="text-[11px] font-semibold text-[#E8F0EC]">Efectivo (Caja)</span>
              </div>
              <span className="text-base sm:text-lg font-bold font-mono text-emerald-200 block">
                $ {totalEfectivo.toLocaleString('es-AR')}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Grid: Formulario Izquierdo Fijo + Lista Derecha con Scroll */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* Columna Izquierda Fija */}
        <div className="xl:col-span-5 bg-white border border-[#E8E3DA] rounded-3xl p-6 shadow-xs xl:sticky xl:top-24 space-y-4">
          
          <div className="flex items-center justify-between pb-4 border-b border-[#F0EBE3]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-[#A8532F] text-white flex items-center justify-center shrink-0 shadow-xs">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1E2923]">Asentar Sesión</h3>
                <p className="text-[11px] text-[#6F7D74]">Conexión directa paciente-psicólogo</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMostrarAgendaRef(!mostrarAgendaRef)}
              className="text-[11px] font-bold text-[#223D30] hover:text-[#A8532F] flex items-center gap-1 cursor-pointer bg-[#FAF8F5] px-2.5 py-1.5 rounded-xl border border-[#DDD6CC] transition-colors"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{mostrarAgendaRef ? 'Ocultar Disponibilidad' : 'Ver Disponibilidad'}</span>
            </button>
          </div>

          {mostrarAgendaRef && (
            <div className="bg-[#FAF8F5] border border-[#DDD6CC] p-3 rounded-2xl space-y-2 max-h-52 overflow-y-auto text-xs animate-in fade-in duration-100">
              <div className="text-[11px] font-bold text-[#1E2923] flex items-center justify-between pb-1 border-b border-[#E8E3DA]">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#A8532F]" />
                  <span>Días y Franjas de los Profesionales</span>
                </span>
                <span className="text-[10px] text-[#6F7D74]">Consulta de recepción</span>
              </div>
              {profesionales.map(p => (
                <div key={p.id} className="bg-white p-2.5 rounded-xl border border-[#E8E3DA] flex items-center justify-between gap-2 shadow-2xs">
                  <div>
                    <span className="font-bold text-[#1E2923] text-xs block">{p.nombre}</span>
                    <span className="text-[11px] text-[#6F7D74] block mt-0.5">
                      <strong className="text-[#223D30]">{p.diasAtencion}</strong> · {p.horarios}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-[#223D30] bg-[#EBF2EE] border border-[#C5D9CD] px-2 py-0.5 rounded-md shrink-0">
                    {p.modalidad}
                  </span>
                </div>
              ))}
            </div>
          )}

          {guardadoExito && (
            <div className="p-3 bg-[#EAF5EF] border border-[#BCE1CC] text-[#1E5C38] rounded-2xl text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#2E8B57]" />
              <span>¡Sesión registrada en el sistema!</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            
            {/* BUSCADOR PREDICTIVO */}
            <div className="relative" ref={dropdownRef}>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#3C4A42] mb-1">
                Paciente de Admisión
              </label>

              <div
                onClick={() => setDropdownPacienteAbierto(!dropdownPacienteAbierto)}
                className="w-full px-3 py-2 bg-[#FAF8F5] hover:bg-white border border-[#DDD6CC] rounded-xl text-xs cursor-pointer flex items-center justify-between transition-colors shadow-2xs"
              >
                {pacienteSeleccionadoObj ? (
                  <div className="truncate">
                    <span className="font-bold text-[#1E2923]">
                      {pacienteSeleccionadoObj.nombre} {pacienteSeleccionadoObj.apellido}
                    </span>
                    <span className="text-[#6F7D74] ml-2 font-mono text-[11px]">
                      (DNI: {pacienteSeleccionadoObj.dni})
                    </span>
                  </div>
                ) : (
                  <span className="text-zinc-400">Seleccionar o buscar paciente...</span>
                )}
                <div className="flex items-center gap-1 shrink-0 ml-2 text-[#A8532F] font-bold text-[11px]">
                  <span>Buscar</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </div>
              </div>

              {dropdownPacienteAbierto && (
                <div className="absolute top-full left-0 right-0 mt-1 z-40 bg-white border border-[#DDD6CC] rounded-2xl shadow-xl p-2 space-y-2 animate-in fade-in duration-100">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      autoFocus
                      value={textoBusquedaPaciente}
                      onChange={(e) => setTextoBusquedaPaciente(e.target.value)}
                      placeholder="Escribí nombre, apellido o DNI..."
                      className="w-full pl-8 pr-3 py-1.5 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-medium text-[#1E2923] focus:outline-none focus:ring-2 focus:ring-[#223D30] focus:bg-white"
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                    {pacientesPrediccion.length === 0 ? (
                      <div className="p-3 text-center text-xs text-zinc-400">
                        No se encontraron pacientes con ese nombre o DNI.
                      </div>
                    ) : (
                      pacientesPrediccion.map((p) => {
                        const prof = profesionales.find(pr => pr.id === p.profesionalId);
                        const seleccionado = p.id === pacienteSeleccionadoId;

                        return (
                          <div
                            key={p.id}
                            onClick={() => handleSeleccionarPaciente(p)}
                            className={`p-2 rounded-xl text-xs cursor-pointer flex items-center justify-between transition-colors ${
                              seleccionado 
                                ? 'bg-[#223D30] text-white font-bold' 
                                : 'hover:bg-[#F7F5F0] text-[#1E2923]'
                            }`}
                          >
                            <div>
                              <span className="block font-semibold">
                                {p.nombre} {p.apellido}
                              </span>
                              <span className={`text-[10px] font-mono ${seleccionado ? 'text-emerald-200' : 'text-[#6F7D74]'}`}>
                                DNI: {p.dni} · Psic: {prof ? prof.nombre : 'Sin asignar'}
                              </span>
                            </div>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${
                              seleccionado ? 'bg-[#182C22] text-white' : 'bg-[#EFECE6] text-[#4A554E]'
                            }`}>
                              {p.modalidad}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#3C4A42] mb-1">
                  Profesional
                </label>
                <select
                  value={profesionalId}
                  onChange={(e) => setProfesionalId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-semibold text-[#1E2923] focus:outline-none focus:ring-2 focus:ring-[#223D30] focus:bg-white cursor-pointer"
                >
                  {profesionales.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#3C4A42] mb-1">
                  Modalidad de la Sesión
                </label>
                <select
                  value={modalidad}
                  onChange={(e) => setModalidad(e.target.value as Modalidad)}
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-semibold text-[#1E2923] focus:outline-none focus:ring-2 focus:ring-[#223D30] focus:bg-white cursor-pointer"
                >
                  <option value="Presencial">Presencial (Sede CIAP)</option>
                  <option value="Virtual">Virtual (Online)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-bold uppercase text-[#3C4A42] mb-1">
                  Fecha
                </label>
                <input
                  type="date"
                  required
                  value={fechaTurno}
                  onChange={(e) => setFechaTurno(e.target.value)}
                  className="w-full px-2 py-1.5 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[#3C4A42] mb-1">
                  Hora
                </label>
                <input
                  type="time"
                  required
                  value={horaTurno}
                  onChange={(e) => setHoraTurno(e.target.value)}
                  className="w-full px-2 py-1.5 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[#3C4A42] mb-1">
                  Arancel ($)
                </label>
                <input
                  type="number"
                  required
                  value={importe}
                  onChange={(e) => setImporte(e.target.value)}
                  placeholder="18000"
                  className="w-full px-2 py-1.5 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-mono font-bold"
                />
              </div>
            </div>

            {/* ATENDIDO POR: LÍNEA SUTIL DEBAJO DE LOS HORARIOS */}
            <div className="flex items-center justify-between text-[11px] text-[#6F7D74] pt-1 px-1">
              <span className="flex items-center gap-1 font-medium">
                <UserCheck className="w-3.5 h-3.5 text-[#223D30]" />
                <span>Atendido por:</span>
              </span>
              <strong className="text-[#1E2923] font-semibold">{operadorActual}</strong>
            </div>

            <div className="pt-2 border-t border-[#F0EBE3]">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#1E2923]">
                <input
                  type="checkbox"
                  checked={cobrarInmediato}
                  onChange={(e) => setCobrarInmediato(e.target.checked)}
                  className="w-4 h-4 rounded text-[#223D30] focus:ring-0 cursor-pointer"
                />
                <span>¿Ya se encuentra cobrada esta sesión?</span>
              </label>

              {cobrarInmediato && (
                <div className="mt-3 p-3 bg-[#FAF8F5] rounded-xl border border-[#DDD6CC] space-y-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#6F7D74] mb-1">
                      Cuenta donde ingresó el dinero
                    </label>
                    <select
                      value={cuentaInmediata}
                      onChange={(e) => setCuentaInmediata(e.target.value as CuentaDestino)}
                      className="w-full px-2 py-1.5 bg-white border border-[#DDD6CC] rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      <option value="Santander">Banco Santander</option>
                      <option value="Banco Ciudad">Banco Ciudad</option>
                      <option value="Mercado Pago">Mercado Pago</option>
                      <option value="Efectivo">Efectivo (Recepción)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#6F7D74] mb-1">
                      N° de Comprobante / Referencia
                    </label>
                    <input
                      type="text"
                      value={comprobanteInmediato}
                      onChange={(e) => setComprobanteInmediato(e.target.value)}
                      placeholder="Ej: Transf. 984512 o Recibo N° 12"
                      className="w-full px-2 py-1.5 bg-white border border-[#DDD6CC] rounded-xl text-xs"
                    />
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="w-full mt-2 py-3 bg-[#A8532F] hover:bg-[#914524] text-white rounded-xl text-xs font-bold tracking-wide transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer"
            >
              {cargando ? 'Guardando en la nube...' : 'Registrar Sesión'}
            </button>
          </form>
        </div>

        {/* Columna Derecha con Scroll */}
        <div className="xl:col-span-7 bg-white border border-[#E8E3DA] rounded-3xl p-6 shadow-xs">
          
          <div className="space-y-4 mb-5 pb-4 border-b border-[#F0EBE3]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-[#1E2923]">Registro de Sesiones</h3>
                <p className="text-[11px] text-[#6F7D74]">
                  Total del período: <strong className="text-[#1E2923]">{sesionesFiltradas.length}</strong> sesiones
                </p>
              </div>

              <div className="flex items-center gap-2 bg-[#FAF8F5] border border-[#DDD6CC] px-3 py-1.5 rounded-2xl">
                <CalendarDays className="w-4 h-4 text-[#A8532F] shrink-0" />
                <select
                  value={mesSeleccionado}
                  onChange={(e) => setMesSeleccionado(e.target.value)}
                  className="bg-transparent text-xs font-bold text-[#1E2923] focus:outline-none cursor-pointer"
                >
                  {mesesDisponibles.map((clave) => (
                    <option key={clave} value={clave}>
                      {formatearNombreMes(clave)} {clave === mesActualKey ? '(Actual)' : ''}
                    </option>
                  ))}
                  <option value="TODOS">Ver Histórico Completo</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 flex-wrap">
              <select
                value={filtroProfesional}
                onChange={(e) => setFiltroProfesional(e.target.value)}
                className="px-2.5 py-1.5 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-semibold text-[#1E2923] focus:outline-none cursor-pointer"
              >
                <option value="TODOS">Todos los Psicólogos</option>
                {profesionales.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>

              <div className="flex items-center bg-[#FAF8F5] border border-[#DDD6CC] p-1 rounded-xl text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setFiltroEstado('Todos')}
                  className={`px-2 py-1 rounded-lg transition-all ${
                    filtroEstado === 'Todos' ? 'bg-[#223D30] text-white shadow-2xs' : 'text-[#6F7D74]'
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroEstado('Pendiente')}
                  className={`px-2 py-1 rounded-lg transition-all ${
                    filtroEstado === 'Pendiente' ? 'bg-amber-700 text-white shadow-2xs' : 'text-[#6F7D74]'
                  }`}
                >
                  Pendientes
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroEstado('Cobrado')}
                  className={`px-2 py-1 rounded-lg transition-all ${
                    filtroEstado === 'Cobrado' ? 'bg-emerald-800 text-white shadow-2xs' : 'text-[#6F7D74]'
                  }`}
                >
                  Cobrados
                </button>
              </div>

              <button
                type="button"
                onClick={toggleTodas}
                title={todasColapsadas ? "Expandir todas" : "Plegar a cápsula"}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-[#FAF8F5] border border-[#DDD6CC] hover:bg-[#EFECE6] text-[#4A554E] rounded-xl text-xs font-semibold cursor-pointer"
              >
                {todasColapsadas ? (
                  <>
                    <ChevronsUpDown className="w-3.5 h-3.5 text-[#A8532F]" />
                    <span className="hidden sm:inline">Expandir</span>
                  </>
                ) : (
                  <>
                    <ChevronsDownUp className="w-3.5 h-3.5 text-[#223D30]" />
                    <span className="hidden sm:inline">Plegar</span>
                  </>
                )}
              </button>

              <div className="relative w-full sm:w-40">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar..."
                  className="w-full pl-8 pr-2.5 py-1.5 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-medium text-[#1E2923] placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#223D30] focus:bg-white"
                />
              </div>
            </div>
          </div>

          <div className="overflow-y-auto max-h-[calc(100vh-320px)] pr-1 space-y-2.5">
            {sesionesFiltradas.length === 0 ? (
              <div className="py-16 text-center text-[#8C9B91] text-xs">
                No hay sesiones registradas en el período seleccionado.
              </div>
            ) : (
              sesionesFiltradas.map((sesion) => {
                const estaColapsada = tarjetasColapsadas[sesion.id] ?? false;
                const estaCobrando = cobrandoSesionId === sesion.id;
                const esCobrado = sesion.estadoPago === 'Cobrado';
                const yaLiquidada = sesion.liquidada ?? false;
                const operadorSesion = (sesion as any).operador || 'Recepción Central';
                const fechaToma = sesion.fechaRegistro || '';

                return (
                  <div 
                    key={sesion.id} 
                    className="border border-[#EFECE6] bg-[#FCFBF9] hover:bg-white hover:border-[#DDD6CC] rounded-2xl p-3.5 sm:p-4 transition-all duration-150 shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-[#1E2923]">
                            {sesion.pacienteNombre}
                          </h4>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            sesion.modalidad === 'Presencial' 
                              ? 'bg-[#EBF2EE] text-[#223D30] border border-[#C5D9CD]'
                              : 'bg-[#F5EFEA] text-[#A8532F] border border-[#E9D7C9]'
                          }`}>
                            {sesion.modalidad}
                          </span>

                          {esCobrado && (
                            yaLiquidada ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#EAF5EF] text-[#1E5C38] border border-[#BCE1CC] flex items-center gap-1">
                                <BadgeCheck className="w-3 h-3 text-[#2E8B57]" />
                                <span>Liquidada {sesion.fechaLiquidacion ? `· ${sesion.fechaLiquidacion.slice(0, 10)}` : ''}</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                Pendiente de Liquidar
                              </span>
                            )
                          )}
                        </div>

                        {/* LÍNEA DE DETALLE CON PROFESIONAL, FECHA/HORA DEL TURNO, FECHA DE TOMA Y ATENDIDO POR */}
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-[#6F7D74] font-mono flex-wrap">
                          <span>Psic: <strong className="text-[#1E2923] font-sans">{sesion.profesionalNombre}</strong></span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-[#223D30]">
                            <Calendar className="w-3 h-3 text-[#A8532F]" />
                            {sesion.fecha} a las {sesion.hora} hs
                          </span>
                          <span>•</span>
                          <span className="font-sans text-[#4A554E] flex items-center gap-1">
                            <UserCheck className="w-3 h-3 text-[#223D30]" />
                            <span>Atendido por: <strong className="text-[#1E2923]">{operadorSesion}</strong></span>
                          </span>
                          {fechaToma && (
                            <>
                              <span>•</span>
                              <span className="text-[10px] text-zinc-400">
                                (Tomado: {fechaToma})
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <div className="text-right">
                          <span className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold ${
                            esCobrado 
                              ? 'bg-[#EAF5EF] text-[#1E5C38] border border-[#BCE1CC]'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}>
                            {sesion.estadoPago}
                          </span>
                          <span className="block text-sm sm:text-base font-bold font-mono text-[#1E2923] mt-0.5">
                            $ {(sesion.importe || 0).toLocaleString('es-AR')}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleColapsarTarjeta(sesion.id)}
                          className="p-1 rounded-lg hover:bg-[#EFECE6] text-[#6F7D74] hover:text-[#1E2923] transition-colors cursor-pointer"
                        >
                          {estaColapsada ? (
                            <ChevronDown className="w-4 h-4 text-[#A8532F]" />
                          ) : (
                            <ChevronUp className="w-4 h-4 text-[#223D30]" />
                          )}
                        </button>
                      </div>
                    </div>

                    {!estaColapsada && (
                      <div className="mt-3 pt-2.5 border-t border-[#F0EBE3]">
                        {esCobrado ? (
                          <div className="flex items-center justify-between text-xs text-[#5C6B61] flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <span className="flex items-center gap-1 font-semibold text-[#1E2923]">
                                {getIconoCuenta(sesion.cuentaDestino)}
                                {sesion.cuentaDestino}
                              </span>
                              <span>•</span>
                              <span>Comp: <strong className="font-mono text-[#1E2923]">{sesion.numeroComprobante || 'S/N'}</strong></span>
                            </div>
                            <span className="text-[10px] text-[#8C9B91] font-mono">
                              {sesion.fechaCobro || 'Cobrado'}
                            </span>
                          </div>
                        ) : (
                          <div>
                            {!estaCobrando ? (
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-amber-800 font-medium flex items-center gap-1">
                                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                                  Pendiente de ingreso a cuentas del estudio
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setCobrandoSesionId(sesion.id)}
                                  className="px-3 py-1 bg-[#223D30] hover:bg-[#182C22] text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-2xs"
                                >
                                  Asentar Cobro
                                </button>
                              </div>
                            ) : (
                              <div className="bg-[#FAF8F5] border border-[#DDD6CC] p-3 rounded-xl space-y-2.5">
                                <span className="text-xs font-bold text-[#1E2923] block">
                                  Asentar Pago de la Sesión
                                </span>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <div>
                                    <label className="block text-[10px] font-bold uppercase text-[#6F7D74] mb-1">
                                      Cuenta donde ingresó
                                    </label>
                                    <select
                                      value={cuentaCobro}
                                      onChange={(e) => setCuentaCobro(e.target.value as CuentaDestino)}
                                      className="w-full px-2 py-1 bg-white border border-[#DDD6CC] rounded-lg text-xs font-semibold cursor-pointer"
                                    >
                                      <option value="Santander">Banco Santander</option>
                                      <option value="Banco Ciudad">Banco Ciudad</option>
                                      <option value="Mercado Pago">Mercado Pago</option>
                                      <option value="Efectivo">Efectivo (Recepción)</option>
                                    </select>
                                  </div>

                                  <div>
                                    <label className="block text-[10px] font-bold uppercase text-[#6F7D74] mb-1">
                                      N° de Comprobante / Referencia
                                    </label>
                                    <input
                                      type="text"
                                      value={comprobanteCobro}
                                      onChange={(e) => setComprobanteCobro(e.target.value)}
                                      placeholder="Ej: Tr. 45892 o Efectivo"
                                      className="w-full px-2 py-1 bg-white border border-[#DDD6CC] rounded-lg text-xs"
                                    />
                                  </div>
                                </div>

                                <div className="flex justify-end gap-2 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => setCobrandoSesionId(null)}
                                    className="px-2.5 py-1 text-zinc-500 hover:text-zinc-800 text-[11px] font-semibold cursor-pointer"
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    type="button"
                                    disabled={procesandoCobro}
                                    onClick={() => handleConfirmarCobro(sesion.id)}
                                    className="flex items-center gap-1 px-3 py-1 bg-[#A8532F] hover:bg-[#914524] text-white rounded-lg text-[11px] font-bold cursor-pointer disabled:opacity-50"
                                  >
                                    <Check className="w-3 h-3" />
                                    <span>{procesandoCobro ? 'Procesando...' : 'Confirmar Cobro'}</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* MODAL DE LIQUIDACIÓN DE LOS VIERNES */}
      {modalLiquidacionAbierto && profesionalFiltroObj && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-[#E8E3DA] rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-xl space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-[#F0EBE3]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#223D30] text-white flex items-center justify-center">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1E2923]">
                    Liquidación de Honorarios · Viernes
                  </h3>
                  <p className="text-[11px] text-[#6F7D74]">
                    Profesional: <strong className="text-[#1E2923]">{profesionalFiltroObj.nombre}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalLiquidacionAbierto(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-[#F7F5F0] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {liquidacionExito ? (
              <div className="p-6 bg-[#EAF5EF] border border-[#BCE1CC] rounded-2xl text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-[#1E5C38] mx-auto" />
                <h4 className="text-sm font-bold text-[#1E5C38]">¡Liquidación asentada con éxito!</h4>
                <p className="text-xs text-[#2E8B57]">
                  El egreso de ${netoTransferir.toLocaleString('es-AR')} fue registrado automáticamente en Gastos Operativos.
                </p>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                
                {/* Desglose de Cálculo */}
                <div className="bg-[#FAF8F5] border border-[#DDD6CC] rounded-2xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[#6F7D74]">Sesiones Cobradas a Liquidar:</span>
                    <span className="font-bold text-[#1E2923]">{sesionesPendientesLiquidacion.length} sesiones</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#6F7D74]">Total Recaudado en Cuentas:</span>
                    <span className="font-mono font-bold text-[#1E2923]">$ {totalRecaudadoParaLiquidar.toLocaleString('es-AR')}</span>
                  </div>

                  <div className="flex items-center justify-between text-amber-800">
                    <span>Retención Centro CIAP:</span>
                    <span className="font-mono font-bold">$ {retencionCiap.toLocaleString('es-AR')}</span>
                  </div>

                  <div className="pt-2 border-t border-[#DDD6CC] flex items-center justify-between text-sm">
                    <span className="font-bold text-[#1E2923]">Neto a Transferir:</span>
                    <span className="font-mono font-bold text-[#223D30] text-base">
                      $ {netoTransferir.toLocaleString('es-AR')}
                    </span>
                  </div>
                </div>

                {/* Selección de Cuenta de Salida y Comprobante */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-[#3C4A42] mb-1">
                      Cuenta desde donde se transfiere
                    </label>
                    <select
                      value={cuentaLiquidacionSalida}
                      onChange={(e) => setCuentaLiquidacionSalida(e.target.value as CuentaDestino)}
                      className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      <option value="Banco Ciudad">Banco Ciudad</option>
                      <option value="Santander">Banco Santander</option>
                      <option value="Mercado Pago">Mercado Pago</option>
                      <option value="Efectivo">Efectivo (Caja Física)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-[#3C4A42] mb-1">
                      N° Transferencia / Referencia
                    </label>
                    <input
                      type="text"
                      value={comprobanteLiquidacion}
                      onChange={(e) => setComprobanteLiquidacion(e.target.value)}
                      placeholder="Ej: Transf. 984512"
                      className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#F0EBE3]">
                  <button
                    type="button"
                    onClick={() => setModalLiquidacionAbierto(false)}
                    className="px-3.5 py-2 text-[#4A554E] hover:text-[#1E2923] text-xs font-semibold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={procesandoLiquidacion || sesionesPendientesLiquidacion.length === 0}
                    onClick={handleEjecutarLiquidacion}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#223D30] hover:bg-[#182C22] text-white rounded-xl text-xs font-bold transition-all disabled:opacity-40 cursor-pointer shadow-xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{procesandoLiquidacion ? 'Asentando egreso...' : 'Confirmar y Asentar en Gastos'}</span>
                  </button>
                </div>

              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}