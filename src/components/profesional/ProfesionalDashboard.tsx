'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  obtenerPacientes, 
  obtenerSesiones, 
  guardarSesion, 
  obtenerProfesionales,
  obtenerGastos
} from '../../lib/servicios';
import { Paciente, Sesion, Profesional, Gasto } from '../../types';
import { 
  Users, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  LogOut, 
  Search, 
  CreditCard, 
  ChevronDown, 
  ChevronUp, 
  ChevronLeft,
  ChevronRight,
  Video,
  BadgeCheck,
  Receipt,
  FileText,
  CalendarDays,
  RotateCcw,
  Clock,
  XCircle,
  AlertCircle,
  ArrowLeft
} from 'lucide-react';

interface Props {
  onVolverAdmin?: () => void;
}

export default function ProfesionalDashboard({ onVolverAdmin }: Props) {
  const { user, logout } = useAuth();

  // Estados de datos
  const [profesionalActual, setProfesionalActual] = useState<Profesional | null>(null);
  const [misPacientes, setMisPacientes] = useState<Paciente[]>([]);
  const [misSesiones, setMisSesiones] = useState<Sesion[]>([]);
  const [misLiquidaciones, setMisLiquidaciones] = useState<Gasto[]>([]);
  const [cargando, setCargando] = useState(true);

  // Navegación: Sesiones -> Pacientes -> Liquidaciones al final
  const [pestañaActiva, setPestañaActiva] = useState<'sesiones' | 'pacientes' | 'liquidaciones'>('sesiones');
  const [busqueda, setBusqueda] = useState('');

  // Modo cápsula para lista
  const [tarjetasColapsadas, setTarjetasColapsadas] = useState<{ [id: string]: boolean }>({});

  // Control del Calendario Semanal
  const [fechaBaseSemana, setFechaBaseSemana] = useState(() => new Date());
  const [fechaSeleccionadaAgenda, setFechaSeleccionadaAgenda] = useState(() => new Date().toISOString().slice(0, 10));

  // Formulario: Asentar Sesión Virtual Realizada
  const [pacienteSeleccionadoId, setPacienteSeleccionadoId] = useState('');
  const [fechaTurno, setFechaTurno] = useState(() => new Date().toISOString().slice(0, 10));
  const [horaTurno, setHoraTurno] = useState('16:00');
  const [estadoAsistencia, setEstadoAsistencia] = useState<'Atendida' | 'No se conectó' | 'Suspendida'>('Atendida');
  const [guardandoSesion, setGuardandoSesion] = useState(false);
  const [sesionExito, setSesionExito] = useState(false);

  const esSandra = user?.email?.toLowerCase().includes('sandra') || user?.email === 'sandell661@gmail.com';

  const cargarDatos = async () => {
    if (!user?.email) return;

    try {
      const [todosProfesionales, todosPacientes, todasSesiones, todosGastos] = await Promise.all([
        obtenerProfesionales(),
        obtenerPacientes(),
        obtenerSesiones(),
        obtenerGastos()
      ]);

      const prof = todosProfesionales.find(
        p => p.email?.toLowerCase().trim() === user.email?.toLowerCase().trim()
      );

      setProfesionalActual(prof || null);

      if (prof) {
        const filtradosPacientes = todosPacientes.filter(
          p => p.profesionalId === prof.id
        );
        setMisPacientes(filtradosPacientes);

        if (filtradosPacientes.length > 0 && !pacienteSeleccionadoId) {
          setPacienteSeleccionadoId(filtradosPacientes[0].id);
        }

        const filtradasSesiones = todasSesiones
          .filter(s => s.profesionalId === prof.id || s.profesionalNombre === prof.nombre)
          .sort((a, b) => (b.fechaIso || '').localeCompare(a.fechaIso || ''));

        setMisSesiones(filtradasSesiones);

        const liquidacionesProf = todosGastos
          .filter(g => 
            g.concepto === 'Honorarios Profesionales' && 
            (g.profesionalId === prof.id || g.profesionalNombre === prof.nombre || (g.notaDetalle && g.notaDetalle.includes(prof.nombre)))
          )
          .sort((a, b) => (b.fechaIso || '').localeCompare(a.fechaIso || ''));

        setMisLiquidaciones(liquidacionesProf);
      }
    } catch (error) {
      console.error('Error cargando portal profesional:', error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [user]);

  const toggleColapsar = (id: string) => {
    setTarjetasColapsadas(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const nombreMostrar = profesionalActual 
    ? profesionalActual.nombre 
    : esSandra 
    ? 'Lic. Sandra' 
    : user?.email;

  const handleSubmitSesion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pacienteSeleccionadoId) return;

    const pac = misPacientes.find(p => p.id === pacienteSeleccionadoId);
    const nombrePaciente = pac ? `${pac.nombre} ${pac.apellido}` : 'Paciente Virtual';
    const idProf = profesionalActual?.id || 'prof-sandra';
    const nomProf = profesionalActual?.nombre || 'Lic. Sandra';

    setGuardandoSesion(true);
    try {
      const sesionPayload: any = {
        pacienteId: pacienteSeleccionadoId,
        pacienteNombre: nombrePaciente,
        profesionalId: idProf,
        profesionalNombre: nomProf,
        fecha: fechaTurno,
        hora: horaTurno,
        modalidad: 'Virtual',
        importe: 0,
        estadoPago: 'Pendiente',
        estadoAsistencia: estadoAsistencia
      };

      await guardarSesion(sesionPayload);

      setSesionExito(true);
      setTimeout(() => setSesionExito(false), 3000);

      await cargarDatos();
    } catch (error) {
      console.error('Error al guardar sesión virtual:', error);
      alert('No se pudo registrar la sesión.');
    } finally {
      setGuardandoSesion(false);
    }
  };

  const porcHon = 60;

  const sesionesListasParaLiquidar = useMemo(() => {
    return misSesiones.filter(s => {
      const asis = (s as any).estadoAsistencia;
      return s.estadoPago === 'Cobrado' && !s.liquidada && (asis === 'Atendida' || !asis);
    });
  }, [misSesiones]);

  const totalCobradoEnEspera = useMemo(() => {
    return sesionesListasParaLiquidar.reduce((acc, curr) => acc + (curr.importe || 0), 0);
  }, [sesionesListasParaLiquidar]);

  const netoEstimadoViernes = Math.round((totalCobradoEnEspera * porcHon) / 100);

  const totalLiquidadoNeto = useMemo(() => {
    return misLiquidaciones.reduce((acc, curr) => acc + (curr.importe || 0), 0);
  }, [misLiquidaciones]);

  const sesionesDelDiaSeleccionado = useMemo(() => {
    return misSesiones.filter(s => s.fecha === fechaSeleccionadaAgenda);
  }, [misSesiones, fechaSeleccionadaAgenda]);

  const diasSemanaCalculados = useMemo(() => {
    const diaSemana = fechaBaseSemana.getDay();
    const lunes = new Date(fechaBaseSemana);
    lunes.setDate(fechaBaseSemana.getDate() - (diaSemana === 0 ? 6 : diaSemana - 1));

    const lista = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(lunes);
      d.setDate(lunes.getDate() + i);
      const iso = d.toISOString().slice(0, 10);
      const nombreDia = d.toLocaleDateString('es-AR', { weekday: 'short' });
      const nroDia = d.getDate();
      const mesNombre = d.toLocaleDateString('es-AR', { month: 'short' });
      const cantSesiones = misSesiones.filter(s => s.fecha === iso).length;
      lista.push({ iso, nombreDia, nroDia, mesNombre, cantSesiones });
    }
    return lista;
  }, [fechaBaseSemana, misSesiones]);

  const tituloSemanaActual = useMemo(() => {
    if (diasSemanaCalculados.length === 0) return '';
    const primerDia = diasSemanaCalculados[0];
    const ultimoDia = diasSemanaCalculados[diasSemanaCalculados.length - 1];
    return `${primerDia.nroDia} de ${primerDia.mesNombre} al ${ultimoDia.nroDia} de ${ultimoDia.mesNombre}`;
  }, [diasSemanaCalculados]);

  const moverSemana = (delta: number) => {
    const nueva = new Date(fechaBaseSemana);
    nueva.setDate(fechaBaseSemana.getDate() + delta * 7);
    setFechaBaseSemana(nueva);
  };

  const irAHoy = () => {
    const hoy = new Date();
    setFechaBaseSemana(hoy);
    const hoyIso = hoy.toISOString().slice(0, 10);
    setFechaSeleccionadaAgenda(hoyIso);
    setFechaTurno(hoyIso);
  };

  const pacientesFiltrados = misPacientes.filter(p =>
    `${p.nombre} ${p.apellido} ${p.dni} ${p.diasAtencion || ''}`
      .toLowerCase()
      .includes(busqueda.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F7F5F0] text-[#1E2923] pb-12">
      
      {/* Header Adaptable */}
      <header className="sticky top-0 z-30 w-full bg-[#FBF9F5]/95 backdrop-blur-md border-b border-[#E8E3DA] shadow-xs">
        <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2.5 sm:py-0 sm:h-16 gap-3">
            
            {/* Identidad */}
            <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 sm:w-9 sm:h-9 bg-[#223D30] text-white rounded-xl flex items-center justify-center font-bold text-base sm:text-lg select-none shadow-2xs">
                  Ψ
                </div>
                <div className="leading-tight">
                  <span className="text-sm sm:text-base font-bold text-[#1E2923] tracking-tight block truncate max-w-[200px] sm:max-w-none">
                    {nombreMostrar}
                  </span>
                  <span className="text-[10px] font-bold tracking-widest text-[#A8532F] uppercase block">
                    {pestañaActiva === 'liquidaciones' ? 'CIAP • 60% HONORARIOS' : 'CENTRO CIAP • CONSULTORIO DIGITAL'}
                  </span>
                </div>
              </div>

              {/* Botón Volver a Administración si es Sandra / Admin */}
              {onVolverAdmin && (
                <button
                  type="button"
                  onClick={onVolverAdmin}
                  className="sm:hidden flex items-center gap-1 px-2.5 py-1.5 bg-[#223D30] text-white rounded-xl text-xs font-bold"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Admin</span>
                </button>
              )}
            </div>

            {/* Pestañas de Navegación */}
            <nav className="flex items-center justify-between sm:justify-center gap-1 bg-[#EFECE6] p-1 rounded-2xl border border-[#E2DDD3] w-full sm:w-auto overflow-x-auto">
              <button
                type="button"
                onClick={() => setPestañaActiva('sesiones')}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  pestañaActiva === 'sesiones'
                    ? 'bg-[#223D30] text-white shadow-xs'
                    : 'text-[#4A554E] hover:text-[#1E2923]'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Sesiones y Agenda</span>
              </button>

              <button
                type="button"
                onClick={() => setPestañaActiva('pacientes')}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  pestañaActiva === 'pacientes'
                    ? 'bg-[#223D30] text-white shadow-xs'
                    : 'text-[#4A554E] hover:text-[#1E2923]'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Pacientes ({misPacientes.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setPestañaActiva('liquidaciones')}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  pestañaActiva === 'liquidaciones'
                    ? 'bg-[#223D30] text-white shadow-xs'
                    : 'text-[#4A554E] hover:text-[#1E2923]'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Liquidaciones</span>
              </button>
            </nav>

            <div className="hidden sm:flex items-center gap-3 border-l border-[#E2DDD3] pl-4">
              {/* Botón Volver a Administración */}
              {onVolverAdmin && (
                <button
                  type="button"
                  onClick={onVolverAdmin}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#223D30] hover:bg-[#182C22] text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-2xs"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Panel Administración</span>
                </button>
              )}

              <button
                onClick={() => logout()}
                title="Cerrar sesión"
                className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E2DDD3] hover:bg-[#EFECE6] text-[#4A554E] hover:text-[#1E2923] text-xs font-semibold rounded-xl transition-all cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Salir</span>
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-5 sm:space-y-6">
        
        {/* BANNER DE CABECERA */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#223D30] text-white rounded-3xl p-5 sm:p-6 shadow-xs">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold tracking-widest text-[#E3A382] uppercase">
                Consultorio Virtual
              </span>
              <span className="text-[#8C9B91]">•</span>
              <span className="text-xs font-semibold text-emerald-200">
                Atención y Seguimiento Clínico
              </span>
            </div>
            <h2 className="text-lg sm:text-2xl font-bold tracking-tight">
              {esSandra ? 'Bienvenida, Lic. Sandra' : `Bienvenido/a, ${nombreMostrar}`}
            </h2>
            <p className="text-xs sm:text-sm text-[#C8D6CF] mt-1 max-w-xl">
              {pestañaActiva === 'liquidaciones' 
                ? 'Historial de pagos acreditados y fondos en espera de liquidación de los viernes.' 
                : 'Agenda semanal sincronizada con recepción y confirmación de turnos virtuales.'}
            </p>
          </div>

          {pestañaActiva === 'liquidaciones' && (
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2.5 sm:gap-3 animate-in fade-in duration-150">
              <div className="bg-[#284638] p-3 sm:px-4 sm:py-2.5 rounded-2xl border border-[#385B49]">
                <span className="text-[10px] font-bold tracking-wider uppercase text-sky-200 block">
                  A Liquidar Viernes (60%)
                </span>
                <span className="text-sm sm:text-base font-bold font-mono text-sky-300">
                  $ {netoEstimadoViernes.toLocaleString('es-AR')}
                </span>
              </div>

              <div className="bg-[#1A2E24] p-3 sm:px-5 sm:py-2.5 rounded-2xl border border-[#2D4D3D]">
                <span className="text-[10px] font-bold tracking-wider uppercase text-[#E3A382] block">
                  Total Percibido
                </span>
                <span className="text-sm sm:text-xl font-bold font-mono text-white">
                  $ {totalLiquidadoNeto.toLocaleString('es-AR')}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* PESTAÑA 1: SESIONES Y AGENDA (2 COLUMNAS) */}
        {pestañaActiva === 'sesiones' && (
          <div className="space-y-5">
            
            {/* CALENDARIO CON NAVEGACIÓN SEMANAL */}
            <div className="bg-white border border-[#E8E3DA] rounded-3xl p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#3C4A42] flex items-center gap-1.5">
                    <CalendarDays className="w-4 h-4 text-[#A8532F]" />
                    <span>Semana: <strong className="text-[#1E2923] font-mono normal-case">{tituloSemanaActual}</strong></span>
                  </span>

                  <button
                    type="button"
                    onClick={irAHoy}
                    className="flex items-center gap-1 px-2.5 py-1 bg-[#FAF8F5] hover:bg-[#EFECE6] border border-[#DDD6CC] text-[#223D30] rounded-xl text-[11px] font-bold cursor-pointer transition-colors shadow-2xs"
                  >
                    <RotateCcw className="w-3 h-3 text-[#A8532F]" />
                    <span>Hoy</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl p-0.5">
                    <button
                      type="button"
                      onClick={() => moverSemana(-1)}
                      title="Semana anterior"
                      className="p-1.5 hover:bg-white rounded-lg text-[#3C4A42] cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moverSemana(1)}
                      title="Semana siguiente"
                      className="p-1.5 hover:bg-white rounded-lg text-[#3C4A42] cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="relative flex items-center bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl px-2.5 py-1">
                    <CalendarIcon className="w-3.5 h-3.5 text-[#A8532F] mr-1.5 pointer-events-none" />
                    <input
                      type="date"
                      value={fechaSeleccionadaAgenda}
                      onChange={(e) => {
                        const nuevaFecha = e.target.value;
                        if (nuevaFecha) {
                          setFechaSeleccionadaAgenda(nuevaFecha);
                          setFechaTurno(nuevaFecha);
                          setFechaBaseSemana(new Date(`${nuevaFecha}T12:00:00`));
                        }
                      }}
                      className="text-xs font-semibold text-[#1E2923] bg-transparent focus:outline-none cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Botonera de los 6 días de la semana */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {diasSemanaCalculados.map((item) => {
                  const esSeleccionado = item.iso === fechaSeleccionadaAgenda;
                  return (
                    <button
                      key={item.iso}
                      type="button"
                      onClick={() => {
                        setFechaSeleccionadaAgenda(item.iso);
                        setFechaTurno(item.iso);
                      }}
                      className={`p-3 rounded-2xl text-center border transition-all cursor-pointer ${
                        esSeleccionado
                          ? 'bg-[#223D30] text-white border-[#223D30] shadow-sm'
                          : 'bg-[#FAF8F5] text-[#1E2923] border-[#E8E3DA] hover:bg-[#F2EFE9]'
                      }`}
                    >
                      <span className={`block text-[11px] font-bold uppercase ${esSeleccionado ? 'text-[#E3A382]' : 'text-[#6F7D74]'}`}>
                        {item.nombreDia}
                      </span>
                      <span className="block text-lg font-bold font-mono my-0.5">
                        {item.nroDia}
                      </span>
                      <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        esSeleccionado 
                          ? 'bg-[#182C22] text-emerald-200' 
                          : item.cantSesiones > 0 ? 'bg-[#EBF2EE] text-[#223D30]' : 'text-zinc-400'
                      }`}>
                        {item.cantSesiones > 0 ? `${item.cantSesiones} turnos` : 'Sin turnos'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* GRID DE 2 COLUMNAS: FORMULARIO + AGENDA */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
              
              {/* COLUMNA 1: FORMULARIO DE CONFIRMACIÓN */}
              <div className="lg:col-span-5 bg-white border border-[#E8E3DA] rounded-3xl p-5 sm:p-6 shadow-xs">
                <div className="flex items-center gap-3 pb-4 mb-4 border-b border-[#F0EBE3]">
                  <div className="w-9 h-9 rounded-2xl bg-[#223D30] text-white flex items-center justify-center shrink-0">
                    <Video className="w-4 h-4 text-emerald-300" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#1E2923]">Confirmar Asistencia Virtual</h3>
                    <p className="text-[11px] text-[#6F7D74]">Informa a administración con un clic</p>
                  </div>
                </div>

                {sesionExito && (
                  <div className="mb-4 p-3 bg-[#EAF5EF] border border-[#BCE1CC] text-[#1E5C38] rounded-2xl text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-[#2E8B57]" />
                    <span>¡Sesión informada con éxito a administración!</span>
                  </div>
                )}

                <form onSubmit={handleSubmitSesion} className="space-y-3.5">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#3C4A42] mb-1">
                      Paciente Citado
                    </label>
                    {misPacientes.length === 0 ? (
                      <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                        {esSandra 
                          ? 'Para agendarte sesiones, derivate un paciente desde Admisión a "Lic. Sandra".' 
                          : 'Aún no tenés pacientes derivados por recepción.'}
                      </p>
                    ) : (
                      <select
                        value={pacienteSeleccionadoId}
                        onChange={(e) => setPacienteSeleccionadoId(e.target.value)}
                        className="w-full px-3 py-2.5 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-bold text-[#1E2923] focus:outline-none focus:ring-2 focus:ring-[#223D30] cursor-pointer"
                      >
                        {misPacientes.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nombre} {p.apellido} (DNI: {p.dni})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#3C4A42] mb-1">
                        Fecha
                      </label>
                      <input
                        type="date"
                        required
                        value={fechaTurno}
                        onChange={(e) => setFechaTurno(e.target.value)}
                        className="w-full px-2.5 py-2 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-medium"
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
                        className="w-full px-2.5 py-2 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#3C4A42] mb-1">
                      Estado de la Consulta
                    </label>
                    <select
                      value={estadoAsistencia}
                      onChange={(e) => setEstadoAsistencia(e.target.value as any)}
                      className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-bold text-[#1E2923] focus:outline-none focus:ring-2 focus:ring-[#223D30] cursor-pointer"
                    >
                      <option value="Atendida">🟢 Atendida (Sesión realizada)</option>
                      <option value="No se conectó">🔴 No se conectó / Ausente</option>
                      <option value="Suspendida">⚪ Sesión suspendida / Cancelada</option>
                    </select>
                  </div>

                  <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#DDD6CC] text-[11px] text-[#6F7D74] space-y-1">
                    <span className="font-bold text-[#1E2923] block">Modalidad: Online / Virtual</span>
                    <p>
                      Los cobros y aranceles son administrados directamente en recepción central.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={guardandoSesion || misPacientes.length === 0}
                    className="w-full mt-2 py-3 bg-[#223D30] hover:bg-[#182C22] text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {guardandoSesion ? 'Guardando...' : 'Asentar Turno en Agenda'}
                  </button>
                </form>
              </div>

              {/* COLUMNA 2: AGENDA DEL DÍA SELECCIONADO */}
              <div className="lg:col-span-7 bg-white border border-[#E8E3DA] rounded-3xl p-5 sm:p-6 shadow-xs">
                <div className="pb-4 mb-4 border-b border-[#F0EBE3] flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-[#1E2923]">Agenda del Día</h3>
                    <p className="text-[11px] text-[#6F7D74]">
                      Fecha seleccionada: <strong className="text-[#1E2923] font-mono">{fechaSeleccionadaAgenda}</strong>
                    </p>
                  </div>
                  <span className="text-xs font-bold font-mono bg-[#EBF2EE] text-[#223D30] px-3 py-1 rounded-xl">
                    {sesionesDelDiaSeleccionado.length} turnos
                  </span>
                </div>

                <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                  {sesionesDelDiaSeleccionado.length === 0 ? (
                    <div className="py-20 text-center text-[#8C9B91] text-xs">
                      No tenés turnos asentados para este día.
                    </div>
                  ) : (
                    sesionesDelDiaSeleccionado.map((sesion) => {
                      const asistencia = (sesion as any).estadoAsistencia || 'Atendida';

                      return (
                        <div
                          key={sesion.id}
                          className="p-4 bg-[#FAF8F5] hover:bg-white border border-[#DDD6CC] rounded-2xl transition-all shadow-2xs space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-[#1E2923]">{sesion.pacienteNombre}</span>
                            <span className="text-xs font-mono font-bold bg-white px-2.5 py-1 rounded-lg border border-[#DDD6CC] text-[#A8532F] flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {sesion.hora} hs
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs text-[#6F7D74] pt-1">
                            <div className="flex items-center gap-2">
                              {asistencia === 'Atendida' && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#EAF5EF] text-[#1E5C38] border border-[#BCE1CC] flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-[#2E8B57]" />
                                  <span>Atendida</span>
                                </span>
                              )}
                              {asistencia === 'No se conectó' && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200 flex items-center gap-1">
                                  <XCircle className="w-3 h-3 text-rose-600" />
                                  <span>No se conectó</span>
                                </span>
                              )}
                              {asistencia === 'Suspendida' && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-zinc-100 text-zinc-700 border border-zinc-300 flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3 text-zinc-500" />
                                  <span>Suspendida</span>
                                </span>
                              )}

                              <span className="flex items-center gap-1 text-[11px]">
                                <Video className="w-3.5 h-3.5 text-[#223D30]" />
                                {sesion.modalidad}
                              </span>
                            </div>

                            <span className={`font-semibold ${sesion.estadoPago === 'Cobrado' ? 'text-emerald-700' : 'text-amber-700'}`}>
                              {sesion.estadoPago === 'Cobrado' ? '✓ Cobrado CIAP' : 'Pendiente cobro'}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* PESTAÑA 2: PACIENTES ASIGNADOS (SIN TELÉFONO - PRIVACIDAD TOTAL) */}
        {pestañaActiva === 'pacientes' && (
          <div className="bg-white border border-[#E8E3DA] rounded-3xl p-5 sm:p-7 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#F0EBE3]">
              <div>
                <h3 className="text-base font-bold text-[#1E2923]">Pacientes Asignados por Recepción</h3>
                <p className="text-xs text-[#6F7D74]">
                  Fichas clínicas derivadas para tu atención con horarios acordados (comunicación centralizada en sede).
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar paciente por nombre o DNI..."
                  className="w-full pl-9 pr-3 py-2 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#223D30]"
                />
              </div>
            </div>

            <div className="space-y-3">
              {pacientesFiltrados.length === 0 ? (
                <div className="py-16 text-center text-[#8C9B91] text-xs">
                  No tenés pacientes asignados o no coinciden con la búsqueda.
                </div>
              ) : (
                pacientesFiltrados.map((paciente) => {
                  const estaColapsada = tarjetasColapsadas[paciente.id] ?? false;
                  const totalNotas = paciente.historialNotas?.length || 0;
                  const ultimaNota = totalNotas > 0 ? paciente.historialNotas[totalNotas - 1] : null;

                  return (
                    <div 
                      key={paciente.id} 
                      className="border border-[#EFECE6] bg-[#FCFBF9] hover:bg-white rounded-2xl p-4 transition-all shadow-2xs space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm sm:text-base font-bold text-[#1E2923]">
                              {paciente.nombre} {paciente.apellido}
                            </h4>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#EBF2EE] text-[#223D30] border border-[#C5D9CD]">
                              {paciente.modalidad}
                            </span>
                            {paciente.diasAtencion && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#FAF8F5] text-zinc-700 border border-[#DDD6CC] flex items-center gap-1">
                                <CalendarIcon className="w-3 h-3 text-[#A8532F]" />
                                {paciente.diasAtencion}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 mt-1.5 text-xs text-[#6F7D74] font-mono">
                            <span>DNI: <strong className="text-[#1E2923]">{paciente.dni}</strong></span>
                            <span>•</span>
                            <span className="text-[#223D30] font-sans font-semibold">Canal de contacto: Recepción CIAP</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleColapsar(paciente.id)}
                          className="p-1 rounded-lg hover:bg-[#EFECE6] text-[#6F7D74] cursor-pointer"
                        >
                          {estaColapsada ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                        </button>
                      </div>

                      {!estaColapsada && (
                        <div className="pt-2 border-t border-[#F0EBE3] space-y-2 text-xs">
                          <div className="text-[#6F7D74]">
                            <span className="font-bold text-[#1E2923]">Motivo de Derivación: </span>
                            <span>{paciente.motivoConsulta || 'Consulta clínica general'}</span>
                          </div>

                          {ultimaNota && (
                            <div className="p-3 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs">
                              <div className="flex items-center justify-between text-[#A8532F] font-bold mb-1">
                                <span className="flex items-center gap-1">
                                  <FileText className="w-3.5 h-3.5" />
                                  Última indicación de recepción:
                                </span>
                                <span className="text-[10px] text-zinc-400 font-mono">{ultimaNota.fechaHora}</span>
                              </div>
                              <p className="italic text-[#4A554E]">"{ultimaNota.texto}"</p>
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
        )}

        {/* PESTAÑA 3: MIS LIQUIDACIONES Y AUDITORÍA DE SESIONES */}
        {pestañaActiva === 'liquidaciones' && (
          <div className="space-y-6">
            
            {/* 1. TRANSFERENCIAS REALIZADAS POR ADMINISTRACIÓN */}
            <div className="bg-white border border-[#E8E3DA] rounded-3xl p-5 sm:p-7 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#F0EBE3]">
                <div>
                  <h3 className="text-base font-bold text-[#1E2923]">Historial de Liquidaciones de Honorarios</h3>
                  <p className="text-xs text-[#6F7D74]">
                    Comprobantes y transferencias enviadas por Administración de Centro CIAP los viernes (60% honorarios).
                  </p>
                </div>

                <div className="bg-[#FAF8F5] border border-[#DDD6CC] px-4 py-2 rounded-2xl flex items-center gap-2 text-xs font-semibold text-[#1E2923]">
                  <Receipt className="w-4 h-4 text-[#A8532F]" />
                  <span>Total recibido: <strong className="font-mono text-base text-[#223D30]">$ {totalLiquidadoNeto.toLocaleString('es-AR')}</strong></span>
                </div>
              </div>

              {misLiquidaciones.length === 0 ? (
                <div className="py-12 text-center text-[#8C9B91] text-xs">
                  Aún no se han registrado liquidaciones de honorarios para tu consultorio.
                </div>
              ) : (
                <div className="space-y-3">
                  {misLiquidaciones.map((liq) => (
                    <div 
                      key={liq.id}
                      className="border border-[#EFECE6] bg-[#FCFBF9] hover:bg-white rounded-2xl p-4 transition-all shadow-2xs space-y-2.5"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-2xl bg-[#EAF5EF] border border-[#BCE1CC] text-[#1E5C38] flex items-center justify-center shrink-0">
                            <BadgeCheck className="w-5 h-5 text-[#2E8B57]" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-[#1E2923]">Liquidación de Honorarios · Viernes</h4>
                            <span className="text-[11px] text-[#6F7D74] font-mono">{liq.fechaRegistro}</span>
                          </div>
                        </div>

                        <div className="text-left sm:text-right">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-[#EAF5EF] px-2 py-0.5 rounded-md border border-[#BCE1CC]">
                            Transferido a tu cuenta
                          </span>
                          <span className="block text-base sm:text-lg font-bold font-mono text-[#223D30] mt-0.5">
                            $ {(liq.importe || 0).toLocaleString('es-AR')}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-[#F0EBE3] text-xs text-[#5C6B61] flex items-center justify-between flex-wrap gap-2">
                        <span className="font-semibold text-[#1E2923]">
                          Cuenta de salida: {liq.cuentaSalida}
                        </span>
                        <span className="text-[#6F7D74] italic">
                          {liq.notaDetalle}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2. HISTORIAL DE SESIONES AUDITADAS Y SU ESTADO PARA EL VIERNES */}
            <div className="bg-white border border-[#E8E3DA] rounded-3xl p-5 sm:p-7 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#F0EBE3]">
                <div>
                  <h3 className="text-base font-bold text-[#1E2923]">Sesiones Registradas y Estado de Liquidación</h3>
                  <p className="text-xs text-[#6F7D74]">
                    Seguimiento detallado de turnos realizados y su cómputo para la liquidación semanal del 60%.
                  </p>
                </div>

                <span className="text-xs font-bold font-mono bg-[#EBF2EE] text-[#223D30] px-3 py-1.5 rounded-xl">
                  {misSesiones.length} sesiones en total
                </span>
              </div>

              {misSesiones.length === 0 ? (
                <div className="py-12 text-center text-[#8C9B91] text-xs">
                  Sin sesiones registradas en el historial.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
                  {misSesiones.map((sesion) => {
                    const yaLiquidada = sesion.liquidada ?? false;
                    const esCobrado = sesion.estadoPago === 'Cobrado';
                    const asistencia = (sesion as any).estadoAsistencia || 'Atendida';

                    return (
                      <div
                        key={sesion.id}
                        className="p-3.5 bg-[#FCFBF9] hover:bg-white border border-[#EFECE6] hover:border-[#DDD6CC] rounded-2xl transition-all shadow-2xs space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#1E2923] text-sm">
                            {sesion.pacienteNombre}
                          </span>
                          <span className="font-mono text-[11px] text-[#A8532F] font-bold">
                            {sesion.hora} hs
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-[#6F7D74]">
                          <span className="flex items-center gap-1 font-mono">
                            <CalendarIcon className="w-3 h-3 text-[#223D30]" />
                            {sesion.fecha}
                          </span>

                          <div className="flex items-center gap-1.5">
                            {asistencia === 'No se conectó' && (
                              <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded-md border border-rose-200">
                                Ausente
                              </span>
                            )}
                            {asistencia === 'Suspendida' && (
                              <span className="text-[10px] font-bold text-zinc-600 bg-zinc-100 px-1.5 py-0.5 rounded-md border border-zinc-200">
                                Suspendida
                              </span>
                            )}

                            {asistencia === 'Atendida' && (
                              esCobrado ? (
                                yaLiquidada ? (
                                  <span className="text-[10px] font-bold text-emerald-800 bg-[#EAF5EF] px-1.5 py-0.5 rounded-md border border-[#BCE1CC] flex items-center gap-1">
                                    <BadgeCheck className="w-3 h-3 text-[#2E8B57]" />
                                    <span>Liquidada</span>
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200">
                                    A liquidar viernes
                                  </span>
                                )
                              ) : (
                                <span className="text-[10px] font-semibold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-md">
                                  Pendiente cobro CIAP
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

      </main>
    </div>
  );
}