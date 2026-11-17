'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  UserCheck,
  AlertCircle,
  UserMinus,
  Pencil, // NUEVO: Ícono para editar
  X // NUEVO: Ícono para cancelar edición
} from 'lucide-react';

export default function AdmisionModulo() {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'Todos' | 'Sin Asignar' | 'Bajas'>('Todos'); 
  const [cargando, setCargando] = useState(false);
  const [guardadoExito, setGuardadoExito] = useState(false);

  // NUEVO ESTADO PARA MODO EDICIÓN
  const [editandoId, setEditandoId] = useState<string | null>(null);

  // Formulario Paciente
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [dni, setDni] = useState('');
  const [edad, setEdad] = useState(''); 
  const [telefono, setTelefono] = useState('');
  const [modalidad, setModalidad] = useState<Modalidad | 'Presencial y Virtual'>('Presencial');
  const [diasAtencion, setDiasAtencion] = useState('');
  const [especialidad, setEspecialidad] = useState('Terapia para adultos'); 
  const [profesionalId, setProfesionalId] = useState(''); 
  const [motivoConsulta, setMotivoConsulta] = useState('');
  const [notaInicial, setNotaInicial] = useState('');

  // Estados interactivos
  const [tarjetasColapsadas, setTarjetasColapsadas] = useState<{ [id: string]: boolean }>({});
  const [todasColapsadas, setTodasColapsadas] = useState(false);
  const [hilosAbiertos, setHilosAbiertos] = useState<{ [id: string]: boolean }>({});
  const [textoNuevaNota, setTextoNuevaNota] = useState<{ [id: string]: string }>({});

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
    } catch (error) {
      console.error('Error cargando datos de admisión:', error);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // NUEVO: Funciones para iniciar y cancelar edición
  const handleIniciarEdicion = (paciente: Paciente) => {
    const pData = paciente as any;
    setEditandoId(paciente.id);
    setNombre(paciente.nombre);
    setApellido(paciente.apellido);
    setDni(paciente.dni || '');
    setEdad(pData.edad || '');
    setTelefono(paciente.telefono || '');
    setModalidad(paciente.modalidad || 'Presencial');
    setDiasAtencion(paciente.diasAtencion || '');
    setEspecialidad(pData.especialidad || 'Terapia para adultos');
    setProfesionalId(paciente.profesionalId || '');
    setMotivoConsulta(paciente.motivoConsulta || '');
    setNotaInicial(''); // La nota inicial la dejamos vacía por si quieren sumar una nota extra al editar
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelarEdicion = () => {
    setEditandoId(null);
    setNombre('');
    setApellido('');
    setDni('');
    setEdad('');
    setTelefono('');
    setModalidad('Presencial');
    setDiasAtencion('');
    setEspecialidad('Terapia para adultos');
    setProfesionalId('');
    setMotivoConsulta('');
    setNotaInicial('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !apellido.trim() || !telefono.trim()) return;

    setCargando(true);
    try {
      const profElegido = profesionales.find(p => p.id === profesionalId);
      
      const payloadPaciente = {
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        dni: dni.trim() || 'S/DNI',
        edad: edad.trim() || 'S/E',
        telefono: telefono.trim(),
        modalidad: modalidad as any,
        diasAtencion: diasAtencion.trim() || 'A coordinar',
        especialidad: especialidad,
        profesionalId: profesionalId || '',
        profesionalNombre: profElegido ? profElegido.nombre : 'Sin asignar',
        motivoConsulta: motivoConsulta.trim() || 'Consulta inicial'
      };

      if (editandoId) {
        // MODO EDICIÓN
        await actualizarPaciente(editandoId, payloadPaciente);
        if (notaInicial.trim() !== '') {
          // Si escribieron algo en nota al editar, lo sumamos al hilo
          await agregarNotaAlHilo(editandoId, notaInicial.trim());
        }
        handleCancelarEdicion(); // Volvemos a modo Nuevo Paciente
      } else {
        // MODO NUEVO PACIENTE
        const nuevoPaciente = {
          ...payloadPaciente,
          estado: 'En Admisión',
        };
        await guardarPaciente(nuevoPaciente, notaInicial.trim() ? notaInicial.trim() : undefined);
        handleCancelarEdicion(); // Limpiamos campos
      }

      setGuardadoExito(true);
      setTimeout(() => setGuardadoExito(false), 3000);

      await cargarDatos();
    } catch (error) {
      console.error('Error guardando paciente:', error);
      alert('Error al procesar el paciente.');
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
    setNuevoProfIdSeleccionado(paciente.profesionalId || (profesionales.length > 0 ? profesionales[0].id : ''));
    setNuevosDiasSeleccionados(paciente.diasAtencion || '');
  };

  const handleConfirmarReasignacion = async (pacienteId: string) => {
    if (!nuevoProfIdSeleccionado) return;
    const nuevoProf = profesionales.find(p => p.id === nuevoProfIdSeleccionado);
    if (!nuevoProf) return;

    setProcesandoReasignacion(true);
    try {
      const diasFinales = nuevosDiasSeleccionados.trim() || 'A coordinar';
      
      await actualizarPaciente(pacienteId, {
        profesionalId: nuevoProf.id,
        profesionalNombre: nuevoProf.nombre,
        diasAtencion: diasFinales
      });

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

  const handleCambiarEstado = async (paciente: Paciente, nuevoEstado: 'De Baja' | 'En Admisión') => {
    const accion = nuevoEstado === 'De Baja' ? 'dar de baja' : 'reactivar';
    if (!window.confirm(`¿Estás seguro de que deseás ${accion} a ${paciente.nombre} ${paciente.apellido}?`)) return;

    try {
      await actualizarPaciente(paciente.id, { estado: nuevoEstado });
      
      const textoNota = nuevoEstado === 'De Baja' 
        ? 'Paciente dado de baja administrativamente.' 
        : 'Paciente reactivado en el sistema.';
        
      await agregarNotaAlHilo(paciente.id, textoNota);
      await cargarDatos();
    } catch (error) {
      console.error(`Error al ${accion} paciente:`, error);
      alert(`No se pudo ${accion} al paciente.`);
    }
  };

  const toggleColapsarTarjeta = (id: string) => {
    setTarjetasColapsadas(prev => ({ ...prev, [id]: !prev[id] }));
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
    setHilosAbiertos(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Filtrado Seguro
  const pacientesFiltrados = useMemo(() => {
    return pacientes.filter(p => {
      const pData = p as any;
      const esBaja = pData.estado === 'De Baja';
      const especialidad = pData.especialidad || '';
      const edadStr = pData.edad || '';

      if (filtroEstado === 'Bajas' && !esBaja) return false;
      if (filtroEstado !== 'Bajas' && esBaja) return false;
      if (filtroEstado === 'Sin Asignar' && p.profesionalNombre !== 'Sin asignar') return false;

      if (busqueda.trim() !== '') {
        const termino = busqueda.toLowerCase();
        const coincideBuscador = `${p.nombre} ${p.apellido} ${p.dni} ${p.telefono} ${edadStr} ${p.profesionalNombre || ''} ${p.diasAtencion || ''} ${p.motivoConsulta || ''} ${especialidad}`
          .toLowerCase()
          .includes(termino);
        if (!coincideBuscador) return false;
      }

      return true;
    });
  }, [pacientes, busqueda, filtroEstado]);

  const cantSinAsignar = pacientes.filter(p => p.profesionalNombre === 'Sin asignar' && (p as any).estado !== 'De Baja').length;
  const cantBajas = pacientes.filter(p => (p as any).estado === 'De Baja').length;
  const cantActivos = pacientes.filter(p => (p as any).estado !== 'De Baja').length;

  return (
    <div className="space-y-6">
      
      {/* Banner */}
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

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* Formulario */}
        <div className={`xl:col-span-5 bg-white border rounded-3xl p-6 shadow-xs xl:sticky xl:top-24 transition-all ${
          editandoId ? 'border-[#223D30] ring-2 ring-[#223D30]/20' : 'border-[#E8E3DA]'
        }`}>
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-[#F0EBE3]">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-2xl text-white flex items-center justify-center shrink-0 shadow-xs ${
                editandoId ? 'bg-[#223D30]' : 'bg-[#A8532F]'
              }`}>
                {editandoId ? <Pencil className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1E2923]">
                  {editandoId ? 'Editar Datos del Paciente' : 'Nuevo Paciente'}
                </h3>
                <p className="text-[11px] text-[#6F7D74]">
                  {editandoId ? 'Modificando ficha clínica' : 'Fecha y hora se registrarán automáticamente'}
                </p>
              </div>
            </div>

            {/* BOTÓN CANCELAR EDICIÓN */}
            {editandoId && (
              <button
                type="button"
                onClick={handleCancelarEdicion}
                className="flex items-center gap-1 text-[11px] font-bold text-zinc-500 hover:text-zinc-800 bg-[#FAF8F5] border border-[#DDD6CC] px-2.5 py-1 rounded-xl cursor-pointer transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cancelar</span>
              </button>
            )}
          </div>

          {guardadoExito && (
            <div className="mb-4 p-3 bg-[#EAF5EF] border border-[#BCE1CC] text-[#1E5C38] rounded-2xl text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#2E8B57]" />
              <span>{editandoId ? '¡Datos actualizados con éxito!' : '¡Paciente derivado e ingresado al sistema!'}</span>
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

            {/* Fila agrupada: DNI, Edad y Teléfono en 3 columnas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                  Edad
                </label>
                <input
                  type="number"
                  value={edad}
                  onChange={(e) => setEdad(e.target.value)}
                  placeholder="Ej: 34"
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
                Especialidad Requerida
              </label>
              <select
                value={especialidad}
                onChange={(e) => setEspecialidad(e.target.value)}
                className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-semibold text-[#1E2923] focus:outline-none focus:ring-2 focus:ring-[#223D30] focus:bg-white cursor-pointer"
              >
                <option value="Terapia para adultos">Terapia para adultos</option>
                <option value="Terapia para niños">Terapia para niños</option>
                <option value="Terapia para adolescentes">Terapia para adolescentes</option>
                <option value="Psicopedagogía">Psicopedagogía</option>
                <option value="Psiquiatría">Psiquiatría</option>
                <option value="TCC">TCC</option>
                <option value="Terapia de parejas">Terapia de parejas</option>
                <option value="Orientación vocacional">Orientación vocacional</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#3C4A42] mb-1">
                Derivar al Profesional
              </label>
              <select
                value={profesionalId}
                onChange={(e) => setProfesionalId(e.target.value)}
                className={`w-full px-3 py-2 bg-[#FAF8F5] border rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#223D30] focus:bg-white cursor-pointer ${
                  profesionalId === '' ? 'border-amber-400 text-amber-900 bg-amber-50' : 'border-[#DDD6CC] text-[#1E2923]'
                }`}
              >
                <option value="">-- Por Asignar / A Confirmar --</option>
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
                {editandoId ? 'Agregar Nota al Historial (Opcional)' : 'Primera Nota de Recepción / Llamado (Opcional)'}
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
              className={`w-full mt-2 py-3 text-white rounded-xl text-xs font-bold tracking-wide transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer ${
                editandoId ? 'bg-[#223D30] hover:bg-[#182C22]' : 'bg-[#A8532F] hover:bg-[#914524]'
              }`}
            >
              {cargando ? 'Procesando...' : editandoId ? 'Guardar Cambios' : 'Registrar y Derivar Paciente'}
            </button>
          </form>
        </div>

        {/* Lista de Pacientes */}
        <div className="xl:col-span-7 bg-white border border-[#E8E3DA] rounded-3xl p-6 shadow-xs">
          
          <div className="flex flex-col gap-4 mb-5 pb-4 border-b border-[#F0EBE3]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#1E2923]">Nómina en Admisión</h3>
                <p className="text-[11px] text-[#6F7D74]">
                  Total activos: <strong className="text-[#1E2923]">{cantActivos}</strong>
                </p>
              </div>

              <button
                type="button"
                onClick={toggleTodas}
                title={todasColapsadas ? "Expandir todas" : "Plegar a cápsula"}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-[#FAF8F5] border border-[#DDD6CC] hover:bg-[#EFECE6] text-[#4A554E] rounded-xl text-xs font-semibold cursor-pointer shrink-0"
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
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex bg-[#FAF8F5] p-1 rounded-xl border border-[#DDD6CC] text-xs font-semibold w-full sm:w-auto shrink-0 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setFiltroEstado('Todos')}
                  className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    filtroEstado === 'Todos' ? 'bg-[#223D30] text-white shadow-2xs font-bold' : 'text-[#4A554E] hover:text-[#1E2923]'
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroEstado('Sin Asignar')}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    filtroEstado === 'Sin Asignar' ? 'bg-amber-100 text-amber-900 shadow-2xs font-bold border border-amber-300' : 'text-[#4A554E] hover:text-[#1E2923]'
                  }`}
                >
                  <span>Sin Asignar</span>
                  {cantSinAsignar > 0 && (
                    <span className="flex items-center justify-center w-4 h-4 bg-amber-500 text-white rounded-full text-[9px] font-bold">
                      {cantSinAsignar}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroEstado('Bajas')}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    filtroEstado === 'Bajas' ? 'bg-zinc-600 text-white shadow-2xs font-bold border border-zinc-700' : 'text-[#4A554E] hover:text-[#1E2923]'
                  }`}
                >
                  <span>Bajas</span>
                  {cantBajas > 0 && (
                    <span className={`flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold ${
                      filtroEstado === 'Bajas' ? 'bg-zinc-800 text-white' : 'bg-zinc-300 text-zinc-700'
                    }`}>
                      {cantBajas}
                    </span>
                  )}
                </button>
              </div>

              <div className="relative w-full">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar paciente, especialidad..."
                  className="w-full pl-8 pr-2.5 py-1.5 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-medium text-[#1E2923] placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#223D30] focus:bg-white h-full"
                />
              </div>
            </div>
          </div>

          <div className="overflow-y-auto max-h-[calc(100vh-270px)] pr-1 space-y-3">
            {pacientesFiltrados.length === 0 ? (
              <div className="py-16 text-center text-[#8C9B91] text-xs">
                {filtroEstado === 'Sin Asignar' 
                  ? 'No hay pacientes pendientes de asignación.' 
                  : filtroEstado === 'Bajas'
                  ? 'No hay pacientes dados de baja en el sistema.'
                  : 'No hay pacientes registrados o no coinciden con la búsqueda.'}
              </div>
            ) : (
              pacientesFiltrados.map((paciente) => {
                const estaColapsada = tarjetasColapsadas[paciente.id] ?? false;
                const estaReasignando = reasignandoPacienteId === paciente.id;
                const hiloAbierto = hilosAbiertos[paciente.id] ?? false;
                const totalNotas = paciente.historialNotas ? paciente.historialNotas.length : 0;
                const ultimaNota = totalNotas > 0 && paciente.historialNotas ? paciente.historialNotas[totalNotas - 1] : null;
                
                const pData = paciente as any;
                const sinAsignar = paciente.profesionalNombre === 'Sin asignar';
                const esBaja = pData.estado === 'De Baja';
                const especialidadPaciente = pData.especialidad; 
                const edadPaciente = pData.edad; 

                const estaEditandoEste = editandoId === paciente.id;

                let cardStyle = 'border-[#EFECE6] bg-[#FCFBF9] hover:bg-white hover:border-[#DDD6CC]';
                if (estaEditandoEste) {
                  cardStyle = 'border-[#223D30] bg-emerald-50/30 ring-1 ring-[#223D30]';
                } else if (esBaja) {
                  cardStyle = 'border-zinc-300 bg-zinc-50 opacity-90 hover:opacity-100 hover:bg-zinc-100';
                } else if (sinAsignar) {
                  cardStyle = 'border-amber-300 bg-amber-50 hover:bg-amber-100/50';
                }

                return (
                  <div 
                    key={paciente.id} 
                    className={`border transition-all duration-150 shadow-2xs space-y-3 rounded-2xl p-4 ${cardStyle}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h4 className={`text-sm font-bold ${esBaja ? 'text-zinc-600 line-through' : 'text-[#1E2923]'}`}>
                            {paciente.nombre} {paciente.apellido}
                          </h4>
                          
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            esBaja 
                              ? 'bg-zinc-200 text-zinc-600 border border-zinc-300'
                              : paciente.modalidad === 'Presencial' 
                              ? 'bg-[#EBF2EE] text-[#223D30] border border-[#C5D9CD]'
                              : paciente.modalidad === 'Virtual'
                              ? 'bg-[#F5EFEA] text-[#A8532F] border border-[#E9D7C9]'
                              : 'bg-[#FAF0E6] text-[#223D30] border border-[#E8D7C8]'
                          }`}>
                            {paciente.modalidad}
                          </span>
                          
                          {especialidadPaciente && !esBaja && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#EFECE6] text-[#4A554E] border border-[#DDD6CC]">
                              {especialidadPaciente}
                            </span>
                          )}

                          {sinAsignar && !esBaja && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-200 text-amber-900 border border-amber-400">
                              <AlertCircle className="w-3 h-3" />
                              Falta Asignar
                            </span>
                          )}

                          {esBaja && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-zinc-700 text-white shadow-2xs">
                              Inactivo / Baja
                            </span>
                          )}
                        </div>

                        <div className={`flex items-center gap-2 mt-1 text-[11px] font-mono flex-wrap ${esBaja ? 'text-zinc-500' : 'text-[#6F7D74]'}`}>
                          <span>DNI: {paciente.dni}</span>
                          <span>•</span>
                          
                          {edadPaciente && (
                            <>
                              <span className="font-semibold">{edadPaciente} años</span>
                              <span>•</span>
                            </>
                          )}

                          <span className="flex items-center gap-1">
                            <Phone className={`w-3 h-3 ${esBaja ? 'text-zinc-400' : 'text-[#223D30]'}`} />
                            <strong className={`text-xs font-sans ${esBaja ? 'text-zinc-500' : 'text-[#1E2923]'}`}>
                              {paciente.telefono}
                            </strong>
                          </span>
                          <span>•</span>
                          <span>
                            Psic: 
                            <strong className={`ml-1 font-sans ${esBaja ? 'text-zinc-500' : sinAsignar ? 'text-amber-700' : 'text-[#1E2923]'}`}>
                              {paciente.profesionalNombre}
                            </strong>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* NUEVO: Botón Editar Paciente (Oculto si está de baja) */}
                        {!esBaja && (
                          <button
                            type="button"
                            onClick={() => handleIniciarEdicion(paciente)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              estaEditandoEste
                                ? 'bg-[#223D30] text-white'
                                : 'hover:bg-[#EFECE6] text-zinc-400 hover:text-[#223D30]'
                            }`}
                            title="Editar ficha del paciente"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}

                        {!esBaja && (
                          <button
                            type="button"
                            onClick={() => iniciarReasignacion(paciente)}
                            className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-xl transition-all cursor-pointer shadow-2xs ${
                              sinAsignar
                                ? 'bg-[#A8532F] text-white hover:bg-[#914524] border-transparent'
                                : 'bg-white hover:bg-[#EFECE6] border border-[#DDD6CC] text-[#223D30]'
                            }`}
                          >
                            <RefreshCw className={`w-3 h-3 ${sinAsignar ? 'text-white' : 'text-[#A8532F]'}`} />
                            <span className="hidden sm:inline">{sinAsignar ? 'Asignar' : 'Reasignar'}</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleCambiarEstado(paciente, esBaja ? 'En Admisión' : 'De Baja')}
                          className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-xl transition-all cursor-pointer shadow-2xs ${
                            esBaja
                              ? 'bg-zinc-800 text-white hover:bg-black border-transparent'
                              : 'bg-white hover:bg-red-50 border border-[#DDD6CC] hover:border-red-200 text-red-600'
                          }`}
                        >
                          {esBaja ? <UserCheck className="w-3 h-3 text-emerald-400" /> : <UserMinus className="w-3 h-3" />}
                          <span className="hidden sm:inline">{esBaja ? 'Reactivar' : 'Baja'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleColapsarTarjeta(paciente.id)}
                          className={`p-1 rounded-lg transition-colors cursor-pointer ${
                            esBaja 
                              ? 'hover:bg-zinc-200 text-zinc-500' 
                              : sinAsignar 
                              ? 'hover:bg-amber-200 text-amber-800' 
                              : 'hover:bg-[#EFECE6] text-[#6F7D74] hover:text-[#1E2923]'
                          }`}
                        >
                          {estaColapsada ? (
                            <ChevronDown className={`w-4 h-4 ${esBaja ? 'text-zinc-600' : sinAsignar ? 'text-amber-900' : 'text-[#A8532F]'}`} />
                          ) : (
                            <ChevronUp className={`w-4 h-4 ${esBaja ? 'text-zinc-600' : sinAsignar ? 'text-amber-900' : 'text-[#223D30]'}`} />
                          )}
                        </button>
                      </div>
                    </div>

                    {estaReasignando && !esBaja && (
                      <div className={`p-3 rounded-xl space-y-2.5 animate-in fade-in duration-100 ${
                        sinAsignar ? 'bg-amber-100/50 border border-amber-300' : 'bg-[#FAF8F5] border border-[#DDD6CC]'
                      }`}>
                        <span className="text-xs font-bold text-[#1E2923] block">
                          {sinAsignar ? 'Asignar Terapeuta Inicial y Horarios:' : 'Reasignar Terapeuta y Actualizar Horarios:'}
                        </span>

                        <div className="space-y-2">
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-[#6F7D74] mb-0.5">
                              Profesional
                            </label>
                            <select
                              value={nuevoProfIdSeleccionado}
                              onChange={(e) => setNuevoProfIdSeleccionado(e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-white border border-[#DDD6CC] rounded-xl text-xs font-semibold text-[#1E2923] cursor-pointer"
                            >
                              {profesionales.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.nombre} ({p.diasAtencion} · {p.modalidad})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase text-[#6F7D74] mb-0.5">
                              Días / Horario acordado con el paciente
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
                            {procesandoReasignacion ? 'Confirmando...' : 'Confirmar Derivación'}
                          </button>
                        </div>
                      </div>
                    )}

                    {!estaColapsada && (
                      <div className={`pt-2 border-t space-y-2.5 text-xs ${
                        esBaja ? 'border-zinc-300' : sinAsignar ? 'border-amber-200' : 'border-[#F0EBE3]'
                      }`}>
                        
                        <div className="flex items-center justify-between text-[#5C6B61] flex-wrap gap-1">
                          <div>
                            <strong className={`${esBaja ? 'text-zinc-500' : 'text-[#1E2923]'}`}>Motivo / Horarios: </strong>
                            <span className={esBaja ? 'text-zinc-500' : ''}>{paciente.motivoConsulta || 'Consulta clínica'}</span>
                            {paciente.diasAtencion && (
                              <span className={`ml-2 font-mono font-bold ${esBaja ? 'text-zinc-500' : 'text-[#A8532F]'}`}>
                                ({paciente.diasAtencion})
                              </span>
                            )}
                          </div>
                        </div>

                        {ultimaNota && (
                          <div className={`p-3 border rounded-xl space-y-1 ${
                            esBaja ? 'bg-zinc-100/50 border-zinc-300' : sinAsignar ? 'bg-amber-100/30 border-amber-200' : 'bg-[#FAF8F5] border-[#DDD6CC]'
                          }`}>
                            <div className={`flex items-center justify-between font-bold ${esBaja ? 'text-zinc-500' : 'text-[#A8532F]'}`}>
                              <span>Último aviso:</span>
                              <span className="text-[10px] text-zinc-400 font-mono">{ultimaNota.fechaHora}</span>
                            </div>
                            <p className="italic text-[#4A554E]">"{ultimaNota.texto}"</p>
                          </div>
                        )}

                        <div>
                          <button
                            type="button"
                            onClick={() => toggleHilo(paciente.id)}
                            className={`font-bold flex items-center gap-1 cursor-pointer ${
                              esBaja ? 'text-zinc-600 hover:text-zinc-800' : 'text-[#223D30] hover:text-[#A8532F]'
                            }`}
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Historial de Notas ({totalNotas})</span>
                            {hiloAbierto ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>

                          {hiloAbierto && (
                            <div className={`mt-2 pl-3 border-l-2 space-y-2 ${esBaja ? 'border-zinc-300' : sinAsignar ? 'border-amber-300' : 'border-[#DDD6CC]'}`}>
                              {paciente.historialNotas?.map((nota) => (
                                <div key={nota.id} className="text-[11px] text-[#4A554E]">
                                  <div className="flex items-center justify-between font-mono text-[10px] text-[#8C9B91]">
                                    <span>Nota</span>
                                    <span>{nota.fechaHora}</span>
                                  </div>
                                  <p className="mt-0.5">{nota.texto}</p>
                                </div>
                              ))}

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
                                  className={`p-1.5 text-white rounded-xl cursor-pointer ${esBaja ? 'bg-zinc-600 hover:bg-zinc-800' : 'bg-[#223D30] hover:bg-[#182C22]'}`}
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