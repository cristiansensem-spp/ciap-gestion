'use client';

import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { 
  obtenerProfesionales, 
  registrarProfesionalConAcceso, 
  eliminarProfesional 
} from '../../lib/servicios';
import { Profesional } from '../../types';
import { 
  UserPlus, 
  Trash2, 
  Search, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  Sparkles, 
  Lock, 
  Copy, 
  Check, 
  Send, 
  ChevronDown, 
  ChevronUp, 
  ChevronsDownUp, 
  ChevronsUpDown, 
  Share2, 
  KeyRound, 
  Sun, 
  Moon, 
  Zap,
  Pencil,
  X
} from 'lucide-react';

export default function ProfesionalesModulo() {
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(false);
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);

  // Estado para edición de profesional existente
  const [editandoId, setEditandoId] = useState<string | null>(null);

  // Tarjeta de credenciales generadas para enviar por WhatsApp
  const [credencialGenerada, setCredencialGenerada] = useState<{
    nombre: string;
    email: string;
    pass: string;
    esBlanqueo?: boolean;
  } | null>(null);
  const [copiado, setCopiado] = useState(false);

  // Modo cápsula
  const [tarjetasColapsadas, setTarjetasColapsadas] = useState<{ [id: string]: boolean }>({});
  const [todasColapsadas, setTodasColapsadas] = useState(false);

  // Formulario nuevo o edición
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('ciap2026');
  const [especialidad, setEspecialidad] = useState('');
  const [diasAtencion, setDiasAtencion] = useState('');
  const [horarios, setHorarios] = useState('');
  const [modalidad, setModalidad] = useState<'Presencial y Virtual' | 'Solo Presencial' | 'Solo Virtual'>('Presencial y Virtual');

  const cargarLista = async () => {
    try {
      const data = await obtenerProfesionales();
      setProfesionales(data);
    } catch (error) {
      console.error('Error cargando profesionales:', error);
    }
  };

  useEffect(() => {
    cargarLista();
  }, []);

  // Cargar datos en el formulario para editar
  const handleIniciarEdicion = (prof: Profesional) => {
    setEditandoId(prof.id);
    setNombre(prof.nombre);
    setEmail(prof.email || '');
    setEspecialidad(prof.especialidad);
    setDiasAtencion(prof.diasAtencion);
    setHorarios(prof.horarios);
    setModalidad(prof.modalidad);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelarEdicion = () => {
    setEditandoId(null);
    setNombre('');
    setEmail('');
    setPassword('ciap2026');
    setEspecialidad('');
    setDiasAtencion('');
    setHorarios('');
    setModalidad('Presencial y Virtual');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !especialidad.trim()) return;

    setCargando(true);
    const emailFinal = email.trim().toLowerCase() || `${nombre.toLowerCase().replace(/[^a-z0-9]/g, '')}@centrociap.com.ar`;

    try {
      if (editandoId) {
        // MODO EDICIÓN: Actualiza en Firestore sin tocar contraseña ni cuenta
        const docRef = doc(db, 'profesionales', editandoId);
        await updateDoc(docRef, {
          nombre: nombre.trim(),
          email: emailFinal,
          especialidad: especialidad.trim(),
          diasAtencion: diasAtencion.trim() || 'Lunes a Viernes',
          horarios: horarios.trim() || '14:00 a 20:00 hs',
          modalidad
        });

        handleCancelarEdicion();
        await cargarLista();
      } else {
        // MODO ALTA: Registra con cuenta nueva
        const passFinal = password.trim() || 'ciap2026';
        await registrarProfesionalConAcceso({
          nombre: nombre.trim(),
          email: emailFinal,
          especialidad: especialidad.trim(),
          diasAtencion: diasAtencion.trim() || 'Lunes a Viernes',
          horarios: horarios.trim() || '14:00 a 20:00 hs',
          modalidad,
          porcentajeHonorarios: 60 // 60% fijo
        }, passFinal);

        setCredencialGenerada({
          nombre: nombre.trim(),
          email: emailFinal,
          pass: passFinal,
          esBlanqueo: false
        });

        handleCancelarEdicion();
        await cargarLista();
      }
    } catch (error) {
      console.error('Error guardando profesional:', error);
      alert('Error al procesar el profesional.');
    } finally {
      setCargando(false);
    }
  };

  // Blanqueo rápido de contraseña desde administración
  const handleRestablecerClave = (prof: Profesional) => {
    const seguro = window.confirm(`¿Deseás restablecer la contraseña de acceso para ${prof.nombre} a la clave estándar "ciap2026"?`);
    if (!seguro) return;

    setCredencialGenerada({
      nombre: prof.nombre,
      email: prof.email || `${prof.nombre.toLowerCase().replace(/[^a-z0-9]/g, '')}@centrociap.com.ar`,
      pass: 'ciap2026',
      esBlanqueo: true
    });
  };

  const handleEliminar = async (id: string, nombreProf: string) => {
    const seguro = window.confirm(`¿Estás seguro de que deseás eliminar a "${nombreProf}" del equipo de CIAP?`);
    if (!seguro) return;

    setEliminandoId(id);
    try {
      await eliminarProfesional(id);
      if (editandoId === id) handleCancelarEdicion();
      await cargarLista();
    } catch (error) {
      console.error('Error eliminando profesional:', error);
      alert('No se pudo eliminar el profesional.');
    } finally {
      setEliminandoId(null);
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
    profesionales.forEach(p => {
      mapa[p.id] = nuevoEstado;
    });
    setTarjetasColapsadas(mapa);
  };

  const profesionalesFiltrados = profesionales.filter(p =>
    `${p.nombre} ${p.especialidad} ${p.email || ''} ${p.diasAtencion} ${p.horarios}`
      .toLowerCase()
      .includes(busqueda.toLowerCase())
  );

  const textoMensajeWhatsApp = credencialGenerada
    ? credencialGenerada.esBlanqueo
      ? `*Centro CIAP - Restablecimiento de Acceso*\n\nHola ${credencialGenerada.nombre}, se ha restablecido tu clave de acceso a la plataforma CIAP:\n\n🔗 *Enlace de ingreso:* ${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}\n👤 *Usuario:* ${credencialGenerada.email}\n🔑 *Nueva Clave Provisional:* ${credencialGenerada.pass}\n💼 *Esquema:* 60% honorarios en liquidaciones de los viernes.\n\nYa podés ingresar a consultar tus pacientes y agenda.`
      : `*Centro CIAP - Credenciales de Acceso y Honorarios*\n\nHola ${credencialGenerada.nombre}, te damos la bienvenida al sistema de CIAP.\n\n🔗 *Enlace de ingreso:* ${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}\n👤 *Usuario:* ${credencialGenerada.email}\n🔑 *Contraseña:* ${credencialGenerada.pass}\n💼 *Esquema acordado:* 60% de honorarios en liquidaciones de los viernes (40% retención CIAP).\n\nDesde allí podrás consultar tus pacientes derivados y asentar sesiones virtuales.`
    : '';

  const copiarMensaje = () => {
    navigator.clipboard.writeText(textoMensajeWhatsApp);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  const abrirWhatsAppWeb = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(textoMensajeWhatsApp)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      
      {/* Banner CIAP */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 bg-[#223D30] text-white rounded-3xl p-6 sm:p-7 shadow-xs">
        <div>
          <span className="inline-block text-[11px] font-bold tracking-widest text-[#E3A382] uppercase mb-1">
            Gestión del Staff Profesional
          </span>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            Nómina y Credenciales del Equipo
          </h2>
          <p className="text-xs sm:text-sm text-[#C8D6CF] mt-1 max-w-2xl">
            Alta de terapeutas, generación de accesos al portal y esquema unificado del 60% de honorarios con liquidación los viernes.
          </p>
        </div>

        <div className="flex items-center gap-2.5 bg-[#2D4D3D] text-[#E8F0EC] px-4 py-2.5 rounded-2xl border border-[#3C614E] text-xs font-semibold shrink-0">
          <Sparkles className="w-4 h-4 text-[#E3A382]" />
          <span>{profesionales.length} Psicólogos registrados</span>
        </div>
      </div>

      {/* Tarjeta de Éxito / Envío / Blanqueo de Credenciales */}
      {credencialGenerada && (
        <div className="bg-[#FAF8F5] border-2 border-[#A8532F] rounded-3xl p-6 shadow-sm animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#DDD6CC]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1E2923]">
                  {credencialGenerada.esBlanqueo
                    ? `¡Clave restablecida para ${credencialGenerada.nombre}!`
                    : `¡Cuenta creada para ${credencialGenerada.nombre}!`}
                </h3>
                <p className="text-xs text-[#6F7D74]">
                  {credencialGenerada.esBlanqueo
                    ? 'Reenviá la nueva clave provisional ciap2026 por WhatsApp.'
                    : 'Enviá estos datos al profesional con su esquema fijado en el 60% de honorarios.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={copiarMensaje}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-[#DDD6CC] hover:bg-[#EFECE6] text-[#1E2923] rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
              >
                {copiado ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiado ? '¡Copiado!' : 'Copiar Datos'}</span>
              </button>

              <button
                type="button"
                onClick={abrirWhatsAppWeb}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[#25D366] hover:bg-[#20ba59] text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Enviar por WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => setCredencialGenerada(null)}
                className="px-2.5 py-2 text-xs text-zinc-500 hover:text-zinc-800 cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-4 text-xs font-mono">
            <div className="bg-white p-3 rounded-xl border border-[#DDD6CC]">
              <span className="text-[10px] text-[#6F7D74] uppercase block font-sans font-bold">Usuario / Email</span>
              <span className="font-bold text-[#1E2923] truncate block">{credencialGenerada.email}</span>
            </div>
            <div className="bg-white p-3 rounded-xl border border-[#DDD6CC]">
              <span className="text-[10px] text-[#6F7D74] uppercase block font-sans font-bold">Contraseña</span>
              <span className="font-bold text-[#A8532F]">{credencialGenerada.pass}</span>
            </div>
            <div className="bg-white p-3 rounded-xl border border-[#DDD6CC]">
              <span className="text-[10px] text-[#6F7D74] uppercase block font-sans font-bold">Liquidación Viernes</span>
              <span className="text-[#223D30] font-bold">60% Honorarios (Fijo)</span>
            </div>
            <div className="bg-white p-3 rounded-xl border border-[#DDD6CC]">
              <span className="text-[10px] text-[#6F7D74] uppercase block font-sans font-bold">Portal</span>
              <span className="text-[#223D30] font-bold">Acceso Profesional CIAP</span>
            </div>
          </div>
        </div>
      )}

      {/* Grid: Formulario Izquierdo + Lista Derecha */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* Formulario Fijo: Alta o Edición */}
        <div className={`xl:col-span-5 bg-white border rounded-3xl p-6 shadow-xs xl:sticky xl:top-24 transition-all ${
          editandoId ? 'border-[#A8532F] ring-2 ring-[#A8532F]/20' : 'border-[#E8E3DA]'
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
                  {editandoId ? 'Modificar Días y Horarios' : 'Dar de Alta Profesional'}
                </h3>
                <p className="text-[11px] text-[#6F7D74]">
                  {editandoId ? 'Editando disponibilidad en tiempo real' : 'Credenciales y esquema fijo del 60%'}
                </p>
              </div>
            </div>

            {editandoId && (
              <button
                type="button"
                onClick={handleCancelarEdicion}
                className="flex items-center gap-1 text-[11px] font-bold text-zinc-500 hover:text-zinc-800 bg-[#FAF8F5] border border-[#DDD6CC] px-2.5 py-1 rounded-xl cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancelar</span>
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#3C4A42] mb-1">
                Nombre Completo y Título
              </label>
              <input
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Lic. Martín Ramos"
                className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-medium text-[#1E2923] focus:outline-none focus:ring-2 focus:ring-[#223D30] focus:bg-white"
              />
            </div>

            {/* Credenciales de Acceso */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#3C4A42] mb-1">
                  Usuario / Correo
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="martin.ramos@centrociap.com.ar"
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-medium text-[#1E2923] focus:outline-none focus:ring-2 focus:ring-[#223D30] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#3C4A42] mb-1">
                  {editandoId ? 'Contraseña (Sin cambios)' : 'Contraseña Inicial'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    disabled={!!editandoId}
                    required={!editandoId}
                    value={editandoId ? '••••••••' : password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-mono font-bold text-[#1E2923] focus:outline-none focus:ring-2 focus:ring-[#223D30] focus:bg-white disabled:opacity-60"
                  />
                  <Lock className="w-3.5 h-3.5 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Especialidad y Esquema Fijo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#3C4A42] mb-1">
                  Especialidad / Perfil
                </label>
                <input
                  type="text"
                  required
                  value={especialidad}
                  onChange={(e) => setEspecialidad(e.target.value)}
                  placeholder="Ej: Adultos - TCC"
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-medium text-[#1E2923] focus:outline-none focus:ring-2 focus:ring-[#223D30] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#3C4A42] mb-1">
                  Esquema Honorarios
                </label>
                <div className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-mono font-bold text-[#223D30] flex items-center justify-between">
                  <span>60% Fijo</span>
                  <span className="text-[10px] text-[#A8532F] font-sans font-bold">CIAP 40%</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#3C4A42] mb-1">
                Modalidad de Atención
              </label>
              <select
                value={modalidad}
                onChange={(e) => setModalidad(e.target.value as any)}
                className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-semibold text-[#1E2923] focus:outline-none focus:ring-2 focus:ring-[#223D30] focus:bg-white cursor-pointer"
              >
                <option value="Presencial y Virtual">Presencial y Virtual</option>
                <option value="Solo Presencial">Solo Presencial</option>
                <option value="Solo Virtual">Solo Virtual</option>
              </select>
            </div>

            {/* DÍAS Y HORARIOS CON ATAJOS INTELIGENTES */}
            <div className="space-y-3 pt-1">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#3C4A42]">
                    Días de Atención
                  </label>
                  <span className="text-[10px] text-[#A8532F] font-bold">Atajos rápidos:</span>
                </div>
                <input
                  type="text"
                  required
                  value={diasAtencion}
                  onChange={(e) => setDiasAtencion(e.target.value)}
                  placeholder="Ej: Lunes, Miércoles y Viernes"
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-medium text-[#1E2923] focus:outline-none focus:ring-2 focus:ring-[#223D30] focus:bg-white"
                />
                <div className="grid grid-cols-3 gap-1.5 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setDiasAtencion('Lunes a Viernes')}
                    className="px-2 py-1 bg-[#FAF8F5] hover:bg-[#EFECE6] border border-[#DDD6CC] rounded-lg text-[10px] font-bold text-[#223D30] transition-colors cursor-pointer text-center truncate"
                  >
                    Lun a Vie
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiasAtencion('Martes y Jueves')}
                    className="px-2 py-1 bg-[#FAF8F5] hover:bg-[#EFECE6] border border-[#DDD6CC] rounded-lg text-[10px] font-bold text-[#223D30] transition-colors cursor-pointer text-center truncate"
                  >
                    Mar y Jue
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiasAtencion('Lunes, Miércoles y Viernes')}
                    className="px-2 py-1 bg-[#FAF8F5] hover:bg-[#EFECE6] border border-[#DDD6CC] rounded-lg text-[10px] font-bold text-[#223D30] transition-colors cursor-pointer text-center truncate"
                  >
                    Lun, Mié y Vie
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#3C4A42]">
                    Franja Horaria
                  </label>
                  <span className="text-[10px] text-[#A8532F] font-bold">Turnos sugeridos:</span>
                </div>
                <input
                  type="text"
                  required
                  value={horarios}
                  onChange={(e) => setHorarios(e.target.value)}
                  placeholder="Ej: Lun 09 a 13 · Mié 14 a 18 · Vie 16 a 20 hs"
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-medium text-[#1E2923] focus:outline-none focus:ring-2 focus:ring-[#223D30] focus:bg-white"
                />
                <div className="grid grid-cols-4 gap-1.5 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setHorarios('09:00 a 13:00 hs')}
                    className="flex items-center justify-center gap-1 px-1.5 py-1 bg-[#FAF8F5] hover:bg-[#EFECE6] border border-[#DDD6CC] rounded-lg text-[10px] font-bold text-[#223D30] transition-colors cursor-pointer text-center truncate"
                    title="Turno Mañana: 09:00 a 13:00 hs"
                  >
                    <Sun className="w-3 h-3 text-amber-500 shrink-0" />
                    <span>Mañana</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setHorarios('14:00 a 20:00 hs')}
                    className="flex items-center justify-center gap-1 px-1.5 py-1 bg-[#FAF8F5] hover:bg-[#EFECE6] border border-[#DDD6CC] rounded-lg text-[10px] font-bold text-[#223D30] transition-colors cursor-pointer text-center truncate"
                    title="Turno Tarde: 14:00 a 20:00 hs"
                  >
                    <Moon className="w-3 h-3 text-indigo-500 shrink-0" />
                    <span>Tarde</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setHorarios('09:00 a 13:00 y 16:00 a 20:00 hs')}
                    className="flex items-center justify-center gap-1 px-1.5 py-1 bg-[#FAF8F5] hover:bg-[#EFECE6] border border-[#DDD6CC] rounded-lg text-[10px] font-bold text-[#A8532F] transition-colors cursor-pointer text-center truncate"
                    title="Doble Turno: 09:00 a 13:00 y 16:00 a 20:00 hs"
                  >
                    <Zap className="w-3 h-3 text-amber-600 shrink-0" />
                    <span>Doble</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setHorarios('Lun 09 a 13 · Mié 14 a 18 · Vie 16 a 20 hs')}
                    className="flex items-center justify-center gap-1 px-1.5 py-1 bg-[#FAF8F5] hover:bg-[#EFECE6] border border-[#DDD6CC] rounded-lg text-[10px] font-bold text-[#223D30] transition-colors cursor-pointer text-center truncate"
                    title="Horarios Mixtos: Lun 09 a 13 · Mié 14 a 18 · Vie 16 a 20 hs"
                  >
                    <span>Mixtos</span>
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={cargando}
              className={`w-full mt-2 py-3 text-white rounded-xl text-xs font-bold tracking-wide transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer ${
                editandoId ? 'bg-[#223D30] hover:bg-[#182C22]' : 'bg-[#A8532F] hover:bg-[#914524]'
              }`}
            >
              {cargando 
                ? 'Guardando...' 
                : editandoId 
                ? 'Guardar Cambios de Disponibilidad' 
                : 'Registrar Profesional y Generar Acceso'}
            </button>
          </form>
        </div>

        {/* Lista de Profesionales */}
        <div className="xl:col-span-7 bg-white border border-[#E8E3DA] rounded-3xl p-6 shadow-xs">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-[#F0EBE3]">
            <div>
              <h3 className="text-sm font-bold text-[#1E2923]">Equipo Profesional Activo</h3>
              <p className="text-[11px] text-[#6F7D74]">
                Total: <strong className="text-[#1E2923]">{profesionalesFiltrados.length}</strong> psicólogos
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

              <div className="relative w-full sm:w-52">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar profesional..."
                  className="w-full pl-8 pr-2.5 py-1.5 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-medium text-[#1E2923] placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#223D30] focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Scroll de la nómina */}
          <div className="overflow-y-auto max-h-[calc(100vh-270px)] pr-1 space-y-2.5">
            {profesionalesFiltrados.length === 0 ? (
              <div className="py-16 text-center text-[#8C9B91] text-xs">
                No hay profesionales registrados o no coinciden con la búsqueda.
              </div>
            ) : (
              profesionalesFiltrados.map((prof) => {
                const estaColapsada = tarjetasColapsadas[prof.id] ?? false;
                const estaEliminando = eliminandoId === prof.id;
                const estaEditandoEste = editandoId === prof.id;

                const mensajeRapidoWhatsApp = `*Centro CIAP - Acceso Profesional*\n\nHola ${prof.nombre}, tu usuario registrado en la plataforma es:\n👤 *Usuario:* ${prof.email || 'Consulta en recepción'}\n💼 *Esquema:* 60% honorarios (liquidación los viernes)\n🔗 *Portal:* ${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}`;

                const esDobleTurno = prof.horarios && prof.horarios.includes(' y ');

                return (
                  <div 
                    key={prof.id} 
                    className={`border rounded-2xl p-3.5 sm:p-4 transition-all duration-150 shadow-2xs ${
                      estaEditandoEste
                        ? 'border-[#A8532F] bg-amber-50/40 ring-1 ring-[#A8532F]'
                        : 'border-[#EFECE6] bg-[#FCFBF9] hover:bg-white hover:border-[#DDD6CC]'
                    }`}
                  >
                    {/* CÁPSULA PERMANENTE */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-[#1E2923]">
                            {prof.nombre}
                          </h4>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#EBF2EE] text-[#223D30] border border-[#C5D9CD]">
                            {prof.modalidad}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#FAF0E6] text-[#A8532F] border border-[#F0D5C3]">
                            60% Honorarios
                          </span>
                          {esDobleTurno && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                              <Zap className="w-3 h-3 text-amber-600" />
                              <span>Doble Turno</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-1 text-[11px] text-[#6F7D74]">
                          <span className="font-semibold text-[#A8532F]">{prof.especialidad}</span>
                          {prof.email && (
                            <>
                              <span>•</span>
                              <span className="font-mono text-[11px] text-zinc-700 font-semibold">{prof.email}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {/* Botón Editar Días y Horarios */}
                        <button
                          type="button"
                          onClick={() => handleIniciarEdicion(prof)}
                          title="Modificar días y horarios de atención"
                          className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                            estaEditandoEste
                              ? 'bg-[#223D30] text-white'
                              : 'hover:bg-[#EFECE6] text-zinc-400 hover:text-[#223D30]'
                          }`}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>

                        {/* Botón Restablecer Clave */}
                        <button
                          type="button"
                          onClick={() => handleRestablecerClave(prof)}
                          title="Restablecer clave a ciap2026 y notificar"
                          className="p-1.5 rounded-xl hover:bg-amber-50 text-zinc-400 hover:text-amber-700 transition-colors cursor-pointer"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>

                        {/* Botón Compartir Usuario por WhatsApp */}
                        <button
                          type="button"
                          onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(mensajeRapidoWhatsApp)}`, '_blank')}
                          title="Enviar credenciales por WhatsApp"
                          className="p-1.5 rounded-xl hover:bg-emerald-50 text-zinc-400 hover:text-emerald-700 transition-colors cursor-pointer"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>

                        {/* Botón Eliminar Profesional */}
                        <button
                          type="button"
                          disabled={estaEliminando}
                          onClick={() => handleEliminar(prof.id, prof.nombre)}
                          title="Eliminar este profesional de la base de datos"
                          className="p-1.5 rounded-xl hover:bg-red-50 text-zinc-400 hover:text-red-600 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        {/* Flecha Plegar / Expandir */}
                        <button
                          type="button"
                          onClick={() => toggleColapsarTarjeta(prof.id)}
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

                    {/* VISTA EXPANDIDA: DÍAS Y HORARIOS */}
                    {!estaColapsada && (
                      <div className="mt-3 pt-2.5 border-t border-[#F0EBE3] flex items-center justify-between text-xs text-[#5C6B61] flex-wrap gap-2">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="flex items-center gap-1 font-semibold text-[#1E2923]">
                            <Calendar className="w-3.5 h-3.5 text-[#223D30]" />
                            {prof.diasAtencion}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1.5 font-semibold text-[#1E2923] bg-white px-2 py-0.5 rounded-lg border border-[#DDD6CC]">
                            <Clock className="w-3 h-3 text-[#A8532F]" />
                            {prof.horarios}
                          </span>
                        </div>
                        <span className="text-[10px] text-[#223D30] font-semibold bg-[#EAF5EF] px-2 py-0.5 rounded-md">
                          Retención CIAP: 40%
                        </span>
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