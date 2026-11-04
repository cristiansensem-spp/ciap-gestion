'use client';

import React, { useState, useEffect } from 'react';
import { 
  guardarPaciente, 
  obtenerPacientes, 
  agregarNotaAlHilo, 
  obtenerProfesionales, 
  actualizarPaciente
} from '../../lib/servicios';
import { Paciente, Modalidad, Profesional } from '../../types';
import { 
  UserPlus, 
  Clock, 
  Search, 
  CheckCircle2, 
  Calendar, 
  Phone, 
  FileText, 
  Send, 
  ChevronDown, 
  ChevronUp, 
  ChevronsDownUp, 
  ChevronsUpDown, 
  RefreshCw, 
  UserCheck 
} from 'lucide-react';

export default function AdmisionModulo() {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(false);
  const [guardadoExito, setGuardadoExito] = useState(false);

  // Formulario Nuevo Paciente (Soporte Presencial, Virtual y Híbrido)
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [dni, setDni] = useState('');
  const [telefono, setTelefono] = useState('');
  const [modalidad, setModalidad] = useState<Modalidad | 'Presencial y Virtual'>('Presencial');
  const [diasAtencion, setDiasAtencion] = useState('');
  const [profesionalId, setProfesionalId] = useState('');
  const [motivoConsulta, setMotivoConsulta] = useState('');
  const [notaInicial, setNotaInicial] = useState('');

  // Estados interactivos de lista
  const [tarjetasColapsadas, setTarjetasColapsadas] = useState<{ [id: string]: boolean }>({});
  const [todasColapsadas, setTodasColapsadas] = useState(false);
  const [hilosAbiertos, setHilosAbiertos] = useState<{ [id: string]: boolean }>({});
  const [textoNuevaNota, setTextoNuevaNota] = useState<{ [id: string]: string }>({});

  // Reasignación de Profesional y Actualización de Horarios
  const [reasignandoPacienteId, setReasignandoPacienteId] = useState<string | null>(null);
  const [nuevoProfIdSeleccionado, setNuevoProfIdSeleccionado] = useState('');
  const [nuevosDiasSeleccionados, setNuevosDiasSeleccionados] = useState('');
  const [procesandoReasignacion, setProcesandoReasignacion] = useState(false);

  const cargarDatos = async () => {
    try {
      const [dataPacientes, dataProfesionales] = await Promise.all([
        obtenerPacientes(),
        obtenerProfesionales()
      ]);
      setPacientes(dataPacientes.sort((a, b) => (b.fechaCreacion || '').localeCompare(a.fechaCreacion || '')));
      setProfesionales(dataProfesionales);

      if (dataProfesionales.length > 0 && !profesionalId) {
        setProfesionalId(dataProfesionales[0].id);
      }
    } catch (error) {
      console.error('Error cargando datos de admisión:', error);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !apellido.trim() || !telefono.trim()) return;

    setCargando(true);
    try {
      const profElegido = profesionales.find(p => p.id === profesionalId);
      await guardarPaciente(
        {
          nombre: nombre.trim(),
          apellido: apellido.trim(),
          dni: dni.trim() || 'S/DNI',
          telefono: telefono.trim(),
          modalidad: modalidad as any,
          diasAtencion: diasAtencion.trim() || 'A coordinar',
          profesionalId,
          profesionalNombre: profElegido ? profElegido.nombre : 'Sin asignar',
          estado: 'En Admisión',
          motivoConsulta: motivoConsulta.trim() || 'Consulta inicial'
        },
        notaInicial.trim() ? notaInicial.trim() : undefined
      );

      setNombre('');
      setApellido('');
      setDni('');
      setTelefono('');
      setDiasAtencion('');
      setMotivoConsulta('');
      setNotaInicial('');
      setGuardadoExito(true);
      setTimeout(() => setGuardadoExito(false), 3000);

      await cargarDatos();
    } catch (error) {
      console.error('Error guardando paciente:', error);
      alert('Error al registrar el paciente.');
    } finally {
      setCargando(false);
    }
  };

  const handleAgregarNota = async (pacienteId: string) => {
    const texto = textoNuevaNota[pacienteId];
    if (!texto || texto.trim() === '') return;

    try {
      await agregarNotaAlHilo(pacienteId, texto.trim());
      setTextoNuevaNota(prev => ({ ...prev, [pacienteId]: '' }));
      await cargarDatos();
    } catch (error) {
      console.error('Error agregando nota:', error);
      alert('No se pudo asentar la nota en el hilo.');
    }
  };

  const iniciarReasignacion = (paciente: Paciente) => {
    setReasignandoPacienteId(paciente.id);
    setNuevoProfIdSeleccionado(paciente.profesionalId || (profesionales[0]?.id ?? ''));
    setNuevosDiasSeleccionados(paciente.diasAtencion || '');
  };

  const handleConfirmarReasignacion = async (pacienteId: string) => {
    if (!nuevoProfIdSeleccionado) return;
    const nuevoProf = profesionales.find(p => p.id === nuevoProfIdSeleccionado);
    if (!nuevoProf) return;

    setProcesandoReasignacion(true);
    try {
      const diasFinales = nuevosDiasSeleccionados.trim() || 'A coordinar';
      
      // Actualizar terapeuta y días/horario
      await actualizarPaciente(pacienteId, {
        profesionalId: nuevoProf.id,
        profesionalNombre: nuevoProf.nombre,
        diasAtencion: diasFinales
      });

      // Dejar trazabilidad en el historial clínico
      await agregarNotaAlHilo(
        pacienteId, 
        `Reasignado/a a ${nuevoProf.nombre} por administración. Horarios acordados: ${diasFinales}.`
      );

      setReasignandoPacienteId(null);
      await cargarDatos();
    } catch (error) {
      console.error('Error reasignando paciente:', error);
      alert('No se pudo reasignar al paciente.');
    } finally {
      setProcesandoReasignacion(false);
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
    pacientes.forEach(p => {
      mapa[p.id] = nuevoEstado;
    });
    setTarjetasColapsadas(mapa);
  };

  const toggleHilo = (id: string) => {
    setHilosAbiertos(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const pacientesFiltrados = pacientes.filter(p =>
    `${p.nombre} ${p.apellido} ${p.dni} ${p.telefono} ${p.profesionalNombre || ''} ${p.diasAtencion || ''} ${p.motivoConsulta || ''}`
      .toLowerCase()
      .includes(busqueda.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Banner de Triaje y Admisión */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 bg-[#223D30] text-white rounded-3xl p-6 sm:p-7 shadow-xs">
        <div>
          <span className="inline-block text-[11px] font-bold tracking-widest text-[#E3A382] uppercase mb-1">
            Recepción y Triaje Clínico
          </span>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            Admisión de Pacientes y Derivaciones
          </h2>
          <p className="text-xs sm:text-sm text-[#C8D6CF] mt-1 max-w-2xl">
            Ingreso centralizado, asignación de días y reasignación de terapeutas con historial clínico unificado.
          </p>
        </div>

        <div className="flex items-center gap-2.5 bg-[#2D4D3D] text-[#E8F0EC] px-4 py-2.5 rounded-2xl border border-[#3C614E] text-xs font-semibold shrink-0">
          <UserCheck className="w-4 h-4 text-[#E3A382]" />
          <span>{profesionales.length} Psicólogos en servicio activo</span>
        </div>
      </div>

      {/* Grid: Formulario Izquierdo + Lista Derecha */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* Formulario Fijo de Registro */}
        <div className="xl:col-span-5 bg-white border border-[#E8E3DA] rounded-3xl p-6 shadow-xs xl:sticky xl:top-24">
          <div className="flex items-center gap-3 pb-4 mb-5 border-b border-[#F0EBE3]">
            <div className="w-9 h-9 rounded-2xl bg-[#A8532F] text-white flex items-center justify-center shrink-0 shadow-xs">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1E2923]">Nuevo Paciente</h3>
              <p className="text-[11px] text-[#6F7D74]">Fecha y hora se registrarán automáticamente</p>
            </div>
          </div>

          {guardadoExito && (
            <div className="mb-4 p-3 bg-[#EAF5EF] border border-[#BCE1CC] text-[#1E5C38] rounded-2xl text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#2E8B57]" />
              <span>¡Paciente derivado e ingresado al sistema!</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#3C4A42] mb-1">
                  Nombre
                </label>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Laura"
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-medium text-[#1E2923] focus:outline-none focus:ring-2 focus:ring-[#223D30] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#3C4A42] mb-1">
                  Apellido
                </label>
                <input
                  type="text"
                  required
                  value={apellido}
                  onChange={(e) => setApellido(e.target.value)}
                  placeholder="Ej: Gómez"
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-medium text-[#1E2923] focus:outline-none focus:ring-2 focus:ring-[#223D30] focus:bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#3C4A42] mb-1">
                  DNI (Sin Puntos)
                </label>
                <input
                  type="text"
                  value={dni}
                  onChange={(e) => setDni(e.target.value)}
                  placeholder="Ej: 34125890"
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-mono font-medium text-[#1E2923] focus:outline-none focus:ring-2 focus:ring-[#223D30] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#3C4A42] mb-1">
                  Teléfono / WhatsApp
                </label>
                <input
                  type="tel"
                  required
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="Ej: 11 6337 5870"
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-medium text-[#1E2923] focus:outline-none focus:ring-2 focus:ring-[#223D30] focus:bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#3C4A42] mb-1">
                  Modalidad
                </label>
                <select
                  value={modalidad}
                  onChange={(e) => setModalidad(e.target.value as any)}
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-semibold text-[#1E2923] focus:outline-none focus:ring-2 focus:ring-[#223D30] focus:bg-white cursor-pointer"
                >
                  <option value="Presencial">Presencial (Sede CIAP)</option>
                  <option value="Virtual">Virtual (Online)</option>
                  <option value="Presencial y Virtual">Presencial y Virtual (Híbrido)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#3C4A42] mb-1">
                  Días de Atención / Preferencia
                </label>
                <input
                  type="text"
                  value={diasAtencion}
                  onChange={(e) => setDiasAtencion(e.target.value)}
                  placeholder="Ej: Lunes y Miércoles tardes"
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-medium text-[#1E2923] focus:outline-none focus:ring-2 focus:ring-[#223D30] focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#3C4A42] mb-1">
                Derivar al Profesional
              </label>
              <select
                value={profesionalId}
                onChange={(e) => setProfesionalId(e.target.value)}
                className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-semibold text-[#1E2923] focus:outline-none focus:ring-2 focus:ring-[#223D30] focus:bg-white cursor-pointer"
              >
                {profesionales.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} ({p.diasAtencion} · {p.modalidad})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#3C4A42] mb-1">
                Motivo / Horarios Solicitados
              </label>
              <input
                type="text"
                value={motivoConsulta}
                onChange={(e) => setMotivoConsulta(e.target.value)}
                placeholder="Ej: Duelo reciente, disponibilidad por la tarde..."
                className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-medium text-[#1E2923] focus:outline-none focus:ring-2 focus:ring-[#223D30] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#3C4A42] mb-1">
                Primera Nota de Recepción / Llamado (Opcional)
              </label>
              <input
                type="text"
                value={notaInicial}
                onChange={(e) => setNotaInicial(e.target.value)}
                placeholder="Ej: Llamó para averiguar arancel, avisa que transfiere el lunes..."
                className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-medium text-[#1E2923] focus:outline-none focus:ring-2 focus:ring-[#223D30] focus:bg-white"
              />
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="w-full mt-2 py-3 bg-[#A8532F] hover:bg-[#914524] text-white rounded-xl text-xs font-bold tracking-wide transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer"
            >
              {cargando ? 'Registrando paciente...' : 'Registrar y Derivar Paciente'}
            </button>
          </form>
        </div>

        {/* Lista de Pacientes con Historial y Reasignación */}
        <div className="xl:col-span-7 bg-white border border-[#E8E3DA] rounded-3xl p-6 shadow-xs">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-[#F0EBE3]">
            <div>
              <h3 className="text-sm font-bold text-[#1E2923]">Nómina en Admisión</h3>
              <p className="text-[11px] text-[#6F7D74]">
                Total registrados: <strong className="text-[#1E2923]">{pacientesFiltrados.length}</strong>
              </p>
            </div>

            <div className="flex items-center gap-2">
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

              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar paciente, DNI, psicólogo..."
                  className="w-full pl-8 pr-2.5 py-1.5 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-medium text-[#1E2923] placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#223D30] focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Scroll de la nómina */}
          <div className="overflow-y-auto max-h-[calc(100vh-270px)] pr-1 space-y-3">
            {pacientesFiltrados.length === 0 ? (
              <div className="py-16 text-center text-[#8C9B91] text-xs">
                No hay pacientes registrados o no coinciden con la búsqueda.
              </div>
            ) : (
              pacientesFiltrados.map((paciente) => {
                const estaColapsada = tarjetasColapsadas[paciente.id] ?? false;
                const estaReasignando = reasignandoPacienteId === paciente.id;
                const hiloAbierto = hilosAbiertos[paciente.id] ?? false;
                const totalNotas = paciente.historialNotas?.length || 0;
                const ultimaNota = totalNotas > 0 ? paciente.historialNotas[totalNotas - 1] : null;

                return (
                  <div 
                    key={paciente.id} 
                    className="border border-[#EFECE6] bg-[#FCFBF9] hover:bg-white hover:border-[#DDD6CC] rounded-2xl p-4 transition-all duration-150 shadow-2xs space-y-3"
                  >
                    {/* CÁPSULA PERMANENTE */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-[#1E2923]">
                            {paciente.nombre} {paciente.apellido}
                          </h4>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            paciente.modalidad === 'Presencial' 
                              ? 'bg-[#EBF2EE] text-[#223D30] border border-[#C5D9CD]'
                              : paciente.modalidad === 'Virtual'
                              ? 'bg-[#F5EFEA] text-[#A8532F] border border-[#E9D7C9]'
                              : 'bg-[#FAF0E6] text-[#223D30] border border-[#E8D7C8]'
                          }`}>
                            {paciente.modalidad}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mt-1 text-[11px] text-[#6F7D74] font-mono flex-wrap">
                          <span>DNI: {paciente.dni}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-[#223D30]" />
                            <strong className="text-[#1E2923] text-xs font-sans">{paciente.telefono}</strong>
                          </span>
                          <span>•</span>
                          <span>Psic: <strong className="text-[#1E2923] font-sans">{paciente.profesionalNombre || 'Sin asignar'}</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Botón Reasignar */}
                        <button
                          type="button"
                          onClick={() => iniciarReasignacion(paciente)}
                          className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-[#EFECE6] border border-[#DDD6CC] text-[#223D30] text-[11px] font-bold rounded-xl transition-all cursor-pointer shadow-2xs"
                        >
                          <RefreshCw className="w-3 h-3 text-[#A8532F]" />
                          <span>Reasignar</span>
                        </button>

                        {/* Flecha Plegar / Expandir */}
                        <button
                          type="button"
                          onClick={() => toggleColapsarTarjeta(paciente.id)}
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

                    {/* VISTA DE REASIGNACIÓN (PROFESIONAL + DÍAS / HORARIOS) */}
                    {estaReasignando && (
                      <div className="p-3 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl space-y-2.5 animate-in fade-in duration-100">
                        <span className="text-xs font-bold text-[#1E2923] block">
                          Reasignar Terapeuta y Actualizar Horarios:
                        </span>

                        <div className="space-y-2">
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-[#6F7D74] mb-0.5">
                              Nuevo Profesional
                            </label>
                            <select
                              value={nuevoProfIdSeleccionado}
                              onChange={(e) => setNuevoProfIdSeleccionado(e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-white border border-[#DDD6CC] rounded-xl text-xs font-semibold text-[#1E2923] cursor-pointer"
                            >
                              {profesionales.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.nombre} ({p.diasAtencion} · {p.horarios} · {p.modalidad})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase text-[#6F7D74] mb-0.5">
                              Nuevos días / Horario acordado con el paciente
                            </label>
                            <input
                              type="text"
                              value={nuevosDiasSeleccionados}
                              onChange={(e) => setNuevosDiasSeleccionados(e.target.value)}
                              placeholder="Ej: Miércoles 16:00 hs o Martes y Jueves mañana"
                              className="w-full px-2.5 py-1.5 bg-white border border-[#DDD6CC] rounded-xl text-xs font-medium text-[#1E2923]"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setReasignandoPacienteId(null)}
                            className="px-2.5 py-1 text-zinc-500 hover:text-zinc-800 text-[11px] font-semibold cursor-pointer"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            disabled={procesandoReasignacion}
                            onClick={() => handleConfirmarReasignacion(paciente.id)}
                            className="px-3 py-1 bg-[#223D30] hover:bg-[#182C22] text-white text-[11px] font-bold rounded-xl transition-all cursor-pointer shadow-2xs disabled:opacity-40"
                          >
                            {procesandoReasignacion ? 'Reasignando...' : 'Confirmar Derivación'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* VISTA EXPANDIDA: MOTIVO, ÚLTIMO AVISO E HILO DE NOTAS */}
                    {!estaColapsada && (
                      <div className="pt-2 border-t border-[#F0EBE3] space-y-2.5 text-xs">
                        
                        <div className="flex items-center justify-between text-[#5C6B61] flex-wrap gap-1">
                          <div>
                            <strong className="text-[#1E2923]">Motivo / Horarios: </strong>
                            <span>{paciente.motivoConsulta || 'Consulta clínica'}</span>
                            {paciente.diasAtencion && (
                              <span className="ml-2 font-mono text-[#A8532F] font-bold">
                                ({paciente.diasAtencion})
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Último aviso destacado */}
                        {ultimaNota && (
                          <div className="p-3 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl space-y-1">
                            <div className="flex items-center justify-between text-[#A8532F] font-bold">
                              <span>Último aviso:</span>
                              <span className="text-[10px] text-zinc-400 font-mono">{ultimaNota.fechaHora}</span>
                            </div>
                            <p className="italic text-[#4A554E]">"{ultimaNota.texto}"</p>
                          </div>
                        )}

                        {/* Desplegable del Hilo Completo de Notas */}
                        <div>
                          <button
                            type="button"
                            onClick={() => toggleHilo(paciente.id)}
                            className="text-[#223D30] hover:text-[#A8532F] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Historial de Notas ({totalNotas})</span>
                            {hiloAbierto ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>

                          {hiloAbierto && (
                            <div className="mt-2 pl-3 border-l-2 border-[#DDD6CC] space-y-2">
                              {paciente.historialNotas?.map((nota) => (
                                <div key={nota.id} className="text-[11px] text-[#4A554E]">
                                  <div className="flex items-center justify-between font-mono text-[10px] text-[#8C9B91]">
                                    <span>Nota</span>
                                    <span>{nota.fechaHora}</span>
                                  </div>
                                  <p className="mt-0.5">{nota.texto}</p>
                                </div>
                              ))}

                              {/* Agregar nota al hilo */}
                              <div className="flex items-center gap-2 pt-2">
                                <input
                                  type="text"
                                  value={textoNuevaNota[paciente.id] || ''}
                                  onChange={(e) => setTextoNuevaNota({ ...textoNuevaNota, [paciente.id]: e.target.value })}
                                  placeholder="Escribí una nueva nota de seguimiento..."
                                  className="flex-1 px-2.5 py-1.5 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleAgregarNota(paciente.id)}
                                  className="p-1.5 bg-[#223D30] hover:bg-[#182C22] text-white rounded-xl cursor-pointer"
                                  title="Agregar nota"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                      </div>
                    )}

                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}