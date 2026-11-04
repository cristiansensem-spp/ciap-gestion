'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  obtenerProfesionales, 
  guardarTallerMemoria, 
  obtenerTalleresMemoria, 
  cobrarTallerMemoria,
  guardarSesion,
  obtenerPacientes
} from '../../lib/servicios';
import { 
  TallerMemoria, 
  Profesional, 
  Paciente, 
  CuentaDestino, 
  MetodoPago, 
  EstadoPago 
} from '../../types';
import { 
  Brain, 
  FileCheck2, 
  Calendar, 
  Clock, 
  UserPlus, 
  CheckCircle2, 
  Search, 
  Check, 
  Building, 
  Wallet, 
  Banknote, 
  Landmark, 
  ChevronDown, 
  ChevronUp, 
  AlertCircle,
  Sparkles,
  Phone,
  Hourglass,
  Layers
} from 'lucide-react';

// Estructura local para seguimiento de Evaluaciones y Psicodiagnósticos (1 mes / 50% y 50%)
interface EvaluacionClinica {
  id: string;
  pacienteNombre: string;
  dni: string;
  telefono: string;
  tipoEvaluacion: 'Psicodiagnóstico Clínico' | 'Evaluación Neurocognitiva' | 'Evaluación Coeficiente Intelectual (CI)';
  profesionalId: string;
  profesionalNombre: string;
  fechaInicio: string;
  fechaEntregaEstimada: string;
  importeTotal: number;
  cuota1: {
    monto: number;
    estado: EstadoPago;
    cuenta?: CuentaDestino;
    comprobante?: string;
    fechaCobro?: string;
  };
  cuota2: {
    monto: number;
    estado: EstadoPago;
    cuenta?: CuentaDestino;
    comprobante?: string;
    fechaCobro?: string;
  };
  estadoInforme: 'En Proceso' | 'Informe Listo para Entrega' | 'Finalizado';
}

export default function TalleresEvaluacionesModulo() {
  const [subPestaña, setSubPestaña] = useState<'talleres' | 'evaluaciones'>('talleres');
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);

  // --- ESTADOS: TALLERES DE LA MEMORIA (Viernes, 1:30 hs) ---
  const [talleres, setTalleres] = useState<TallerMemoria[]>([]);
  const [nombreTaller, setNombreTaller] = useState('');
  const [apellidoTaller, setApellidoTaller] = useState('');
  const [edadTaller, setEdadTaller] = useState('');
  const [telefonoTaller, setTelefonoTaller] = useState('');
  const [fechaViernes, setFechaViernes] = useState(() => {
    const d = new Date();
    // Próximo viernes por defecto
    const dia = d.getDay();
    const diff = (5 - dia + 7) % 7;
    d.setDate(d.getDate() + (diff === 0 ? 7 : diff));
    return d.toISOString().slice(0, 10);
  });
  const [importeTaller, setImporteTaller] = useState('15000');
  const [abonaEnElDia, setAbonaEnElDia] = useState(true);
  const [cuentaTaller, setCuentaTaller] = useState<CuentaDestino>('Efectivo');
  const [metodoTaller, setMetodoTaller] = useState<MetodoPago>('Efectivo');
  const [comprobanteTaller, setComprobanteTaller] = useState('');
  const [guardandoTaller, setGuardandoTaller] = useState(false);
  const [exitoTaller, setExitoTaller] = useState(false);
  const [busquedaTaller, setBusquedaTaller] = useState('');

  // Cobro manual de concurrente de taller pendiente
  const [cobrandoTallerId, setCobrandoTallerId] = useState<string | null>(null);
  const [cuentaCobroTaller, setCuentaCobroTaller] = useState<CuentaDestino>('Efectivo');
  const [comprobanteCobroTaller, setComprobanteCobroTaller] = useState('');

  // --- ESTADOS: PSICODIAGNÓSTICOS Y EVALUACIONES (50% y 50%) ---
  const [evaluaciones, setEvaluaciones] = useState<EvaluacionClinica[]>(() => {
    if (typeof window !== 'undefined') {
      const guardado = localStorage.getItem('ciap_evaluaciones_cache');
      if (guardado) {
        try { return JSON.parse(guardado); } catch (e) { }
      }
    }
    // Casos testigo iniciales
    return [
      {
        id: 'eval-1',
        pacienteNombre: 'Lucas Benítez',
        dni: '38450123',
        telefono: '1163375870',
        tipoEvaluacion: 'Evaluación Neurocognitiva',
        profesionalId: 'prof-castro',
        profesionalNombre: 'Lic. Nicolás Castro',
        fechaInicio: '2026-10-15',
        fechaEntregaEstimada: '2026-11-15',
        importeTotal: 80000,
        cuota1: {
          monto: 40000,
          estado: 'Cobrado',
          cuenta: 'Santander',
          comprobante: 'Transf. 883921',
          fechaCobro: '15/10/2026'
        },
        cuota2: {
          monto: 40000,
          estado: 'Pendiente'
        },
        estadoInforme: 'En Proceso'
      }
    ];
  });

  const [nombreEval, setNombreEval] = useState('');
  const [dniEval, setDniEval] = useState('');
  const [telefonoEval, setTelefonoEval] = useState('');
  const [tipoEval, setTipoEval] = useState<'Psicodiagnóstico Clínico' | 'Evaluación Neurocognitiva' | 'Evaluación Coeficiente Intelectual (CI)'>('Evaluación Neurocognitiva');
  const [profesionalEvalId, setProfesionalEvalId] = useState('');
  const [fechaInicioEval, setFechaInicioEval] = useState(() => new Date().toISOString().slice(0, 10));
  const [importeTotalEval, setImporteTotalEval] = useState('70000');
  const [cuota1Cobrada, setCuota1Cobrada] = useState(true);
  const [cuentaCuota1, setCuentaCuota1] = useState<CuentaDestino>('Santander');
  const [comprobanteCuota1, setComprobanteCuota1] = useState('');
  const [guardandoEval, setGuardandoEval] = useState(false);
  const [exitoEval, setExitoEval] = useState(false);
  const [busquedaEval, setBusquedaEval] = useState('');

  // Cobro de la Cuota 2 (Entrega de informe)
  const [cobrandoCuota2Id, setCobrandoCuota2Id] = useState<string | null>(null);
  const [cuentaCuota2, setCuentaCuota2] = useState<CuentaDestino>('Santander');
  const [comprobanteCuota2, setComprobanteCuota2] = useState('');

  const cargarDatos = async () => {
    try {
      const [dataTalleres, dataProfesionales, dataPacientes] = await Promise.all([
        obtenerTalleresMemoria(),
        obtenerProfesionales(),
        obtenerPacientes()
      ]);
      setTalleres(dataTalleres);
      setProfesionales(dataProfesionales);
      setPacientes(dataPacientes);

      if (dataProfesionales.length > 0 && !profesionalEvalId) {
        setProfesionalEvalId(dataProfesionales[0].id);
      }
    } catch (e) {
      console.error('Error cargando talleres y evaluaciones:', e);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ciap_evaluaciones_cache', JSON.stringify(evaluaciones));
    }
  }, [evaluaciones]);

  // Guardar concurrente a Taller de la Memoria
  const handleSubmitTaller = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreTaller.trim() || !apellidoTaller.trim()) return;

    setGuardandoTaller(true);
    try {
      const monto = Number(importeTaller) || 15000;
      await guardarTallerMemoria({
        nombreCompleto: `${nombreTaller.trim()} ${apellidoTaller.trim()}`,
        edad: Number(edadTaller) || 0,
        telefono: telefonoTaller.trim() || 'Sin teléfono',
        fechaViernes,
        duracion: '1:30 hs',
        importe: monto,
        estadoPago: abonaEnElDia ? 'Cobrado' : 'Pendiente',
        cuentaDestino: abonaEnElDia ? cuentaTaller : undefined,
        metodoPago: abonaEnElDia ? metodoTaller : undefined,
        numeroComprobante: abonaEnElDia ? (comprobanteTaller.trim() || 'Abonó en taller') : undefined,
        fechaCobro: abonaEnElDia ? new Date().toLocaleDateString('es-AR') : undefined
      });

      // Si se cobró, impacta también en Caja central como sesión de taller
      if (abonaEnElDia) {
        await guardarSesion({
          pacienteId: 'taller-memoria',
          pacienteNombre: `${nombreTaller.trim()} ${apellidoTaller.trim()} (Taller Memoria)`,
          profesionalId: 'sede-ciap',
          profesionalNombre: 'Sede CIAP (Talleres)',
          fecha: fechaViernes,
          hora: '17:00',
          modalidad: 'Presencial',
          importe: monto,
          estadoPago: 'Cobrado',
          tipoServicio: 'TallerMemoria',
          cuentaDestino: cuentaTaller,
          metodoPago: metodoTaller,
          numeroComprobante: comprobanteTaller.trim() || 'Taller Memoria Viernes',
          fechaCobro: new Date().toLocaleDateString('es-AR')
        });
      }

      setNombreTaller('');
      setApellidoTaller('');
      setEdadTaller('');
      setTelefonoTaller('');
      setComprobanteTaller('');
      setExitoTaller(true);
      setTimeout(() => setExitoTaller(false), 3000);

      await cargarDatos();
    } catch (error) {
      console.error('Error registrando taller:', error);
      alert('No se pudo registrar el concurrente.');
    } finally {
      setGuardandoTaller(false);
    }
  };

  const handleConfirmarCobroTaller = async (id: string) => {
    try {
      await cobrarTallerMemoria(id, cuentaCobroTaller, 'Efectivo', comprobanteCobroTaller);
      setCobrandoTallerId(null);
      setComprobanteCobroTaller('');
      await cargarDatos();
    } catch (e) {
      console.error('Error cobrando taller:', e);
      alert('No se pudo asentar el cobro.');
    }
  };

  // Guardar Evaluación / Psicodiagnóstico (50% y 50%)
  const handleSubmitEvaluacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreEval.trim()) return;

    setGuardandoEval(true);
    try {
      const prof = profesionales.find(p => p.id === profesionalEvalId);
      const montoTotal = Number(importeTotalEval) || 70000;
      const mitad = Math.round(montoTotal / 2);

      // Fecha estimada de entrega: 1 mes después
      const fechaIni = new Date(fechaInicioEval);
      const fechaFin = new Date(fechaIni);
      fechaFin.setMonth(fechaFin.getMonth() + 1);
      const fechaFinIso = fechaFin.toISOString().slice(0, 10);

      const nuevaEvaluacion: EvaluacionClinica = {
        id: `eval-${Date.now()}`,
        pacienteNombre: nombreEval.trim(),
        dni: dniEval.trim() || 'S/DNI',
        telefono: telefonoEval.trim() || 'Sin teléfono',
        tipoEvaluacion: tipoEval,
        profesionalId: profesionalEvalId,
        profesionalNombre: prof ? prof.nombre : 'Lic. Evaluador',
        fechaInicio: fechaInicioEval,
        fechaEntregaEstimada: fechaFinIso,
        importeTotal: montoTotal,
        cuota1: {
          monto: mitad,
          estado: cuota1Cobrada ? 'Cobrado' : 'Pendiente',
          cuenta: cuota1Cobrada ? cuentaCuota1 : undefined,
          comprobante: cuota1Cobrada ? (comprobanteCuota1.trim() || '50% Inicial') : undefined,
          fechaCobro: cuota1Cobrada ? new Date().toLocaleDateString('es-AR') : undefined
        },
        cuota2: {
          monto: mitad,
          estado: 'Pendiente'
        },
        estadoInforme: 'En Proceso'
      };

      setEvaluaciones(prev => [nuevaEvaluacion, ...prev]);

      // Si la Cuota 1 fue cobrada, impacta en Caja
      if (cuota1Cobrada) {
        await guardarSesion({
          pacienteId: `eval-${Date.now()}`,
          pacienteNombre: `${nombreEval.trim()} (${tipoEval} - 50% Inicial)`,
          profesionalId: profesionalEvalId,
          profesionalNombre: prof ? prof.nombre : 'Lic. Evaluador',
          fecha: fechaInicioEval,
          hora: '10:00',
          modalidad: 'Presencial',
          importe: mitad,
          estadoPago: 'Cobrado',
          tipoServicio: 'Psicodiagnostico',
          etapaCobro: '50% Inicial',
          cuentaDestino: cuentaCuota1,
          metodoPago: 'Transferencia',
          numeroComprobante: comprobanteCuota1.trim() || 'Cuota 1 (50% Inicial)',
          fechaCobro: new Date().toLocaleDateString('es-AR')
        });
      }

      setNombreEval('');
      setDniEval('');
      setTelefonoEval('');
      setComprobanteCuota1('');
      setExitoEval(true);
      setTimeout(() => setExitoEval(false), 3000);
    } catch (e) {
      console.error('Error registrando evaluación:', e);
      alert('No se pudo registrar la evaluación.');
    } finally {
      setGuardandoEval(false);
    }
  };

  // Cobrar Cuota 2 (50% Final al entregar informe)
  const handleConfirmarCuota2 = async (evalId: string) => {
    const target = evaluaciones.find(ev => ev.id === evalId);
    if (!target) return;

    try {
      // Impacta en Caja como la segunda mitad cobrada
      await guardarSesion({
        pacienteId: target.id,
        pacienteNombre: `${target.pacienteNombre} (${target.tipoEvaluacion} - 50% Final)`,
        profesionalId: target.profesionalId,
        profesionalNombre: target.profesionalNombre,
        fecha: new Date().toISOString().slice(0, 10),
        hora: '12:00',
        modalidad: 'Presencial',
        importe: target.cuota2.monto,
        estadoPago: 'Cobrado',
        tipoServicio: 'Psicodiagnostico',
        etapaCobro: '50% Final',
        cuentaDestino: cuentaCuota2,
        metodoPago: 'Transferencia',
        numeroComprobante: comprobanteCuota2.trim() || 'Cuota 2 (50% Final / Entrega)',
        fechaCobro: new Date().toLocaleDateString('es-AR')
      });

      setEvaluaciones(prev => prev.map(ev => {
        if (ev.id === evalId) {
          return {
            ...ev,
            cuota2: {
              ...ev.cuota2,
              estado: 'Cobrado',
              cuenta: cuentaCuota2,
              comprobante: comprobanteCuota2.trim() || 'Cuota 2 / Entrega de Informe',
              fechaCobro: new Date().toLocaleDateString('es-AR')
            },
            estadoInforme: 'Finalizado'
          };
        }
        return ev;
      }));

      setCobrandoCuota2Id(null);
      setComprobanteCuota2('');
    } catch (e) {
      console.error('Error cobrando Cuota 2:', e);
      alert('No se pudo registrar el cobro de la Cuota 2.');
    }
  };

  const talleresFiltrados = talleres.filter(t =>
    `${t.nombreCompleto} ${t.telefono} ${t.fechaViernes}`.toLowerCase().includes(busquedaTaller.toLowerCase())
  );

  const evaluacionesFiltradas = evaluaciones.filter(ev =>
    `${ev.pacienteNombre} ${ev.dni} ${ev.profesionalNombre} ${ev.tipoEvaluacion}`.toLowerCase().includes(busquedaEval.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* BANNER INSTITUCIONAL CON SELECTOR DE PRESTACIÓN */}
      <div className="bg-[#223D30] text-white rounded-3xl p-6 sm:p-7 shadow-xs space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold tracking-widest text-[#E3A382] uppercase">
                Servicios Clínicos Especiales
              </span>
              <span className="text-[#8C9B91]">•</span>
              <span className="text-xs font-semibold text-emerald-200">
                Talleres de Memoria y Evaluaciones
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              Talleres Grupales & Psicodiagnósticos
            </h2>
            <p className="text-xs sm:text-sm text-[#C8D6CF] mt-1 max-w-2xl">
              Control de estimulación cognitiva de los viernes (1:30 hs) y seguimiento escalonado en 2 cuotas (50% inicio / 50% final) para baterías de test.
            </p>
          </div>

          {/* CONMUTADOR DE SUB-MÓDULO */}
          <div className="flex items-center bg-[#1A2E24] p-1 rounded-2xl border border-[#2D4D3D] self-start lg:self-auto">
            <button
              type="button"
              onClick={() => setSubPestaña('talleres')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                subPestaña === 'talleres'
                  ? 'bg-[#223D30] text-white shadow-xs border border-[#3C614E]'
                  : 'text-[#C8D6CF] hover:text-white'
              }`}
            >
              <Brain className="w-4 h-4 text-[#E3A382]" />
              <span>Talleres de Memoria (Viernes)</span>
            </button>

            <button
              type="button"
              onClick={() => setSubPestaña('evaluaciones')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                subPestaña === 'evaluaciones'
                  ? 'bg-[#223D30] text-white shadow-xs border border-[#3C614E]'
                  : 'text-[#C8D6CF] hover:text-white'
              }`}
            >
              <FileCheck2 className="w-4 h-4 text-emerald-300" />
              <span>Psicodiagnósticos (50% y 50%)</span>
            </button>
          </div>
        </div>
      </div>

      {/* --- SECCIÓN 1: TALLERES DE LA MEMORIA (Viernes, 1:30 hs, cobro en el día) --- */}
      {subPestaña === 'talleres' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          
          {/* Formulario Concurrente de Taller */}
          <div className="xl:col-span-5 bg-white border border-[#E8E3DA] rounded-3xl p-6 shadow-xs xl:sticky xl:top-24">
            <div className="flex items-center gap-3 pb-4 mb-4 border-b border-[#F0EBE3]">
              <div className="w-9 h-9 rounded-2xl bg-[#A8532F] text-white flex items-center justify-center shrink-0">
                <Brain className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1E2923]">Anotar Asistente a Taller</h3>
                <p className="text-[11px] text-[#6F7D74]">Viernes · 1:30 hs de estimulación cognitiva</p>
              </div>
            </div>

            {exitoTaller && (
              <div className="mb-4 p-3 bg-[#EAF5EF] border border-[#BCE1CC] text-[#1E5C38] rounded-2xl text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-[#2E8B57]" />
                <span>¡Concurrente anotado y cobro registrado en Caja!</span>
              </div>
            )}

            <form onSubmit={handleSubmitTaller} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#3C4A42] mb-1">Nombre</label>
                  <input
                    type="text"
                    required
                    value={nombreTaller}
                    onChange={(e) => setNombreTaller(e.target.value)}
                    placeholder="Ej: Marta"
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#223D30]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#3C4A42] mb-1">Apellido</label>
                  <input
                    type="text"
                    required
                    value={apellidoTaller}
                    onChange={(e) => setApellidoTaller(e.target.value)}
                    placeholder="Ej: Rossi"
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#223D30]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#3C4A42] mb-1">Edad</label>
                  <input
                    type="number"
                    required
                    value={edadTaller}
                    onChange={(e) => setEdadTaller(e.target.value)}
                    placeholder="Ej: 72"
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#223D30]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#3C4A42] mb-1">Teléfono</label>
                  <input
                    type="tel"
                    required
                    value={telefonoTaller}
                    onChange={(e) => setTelefonoTaller(e.target.value)}
                    placeholder="Ej: 11 4455 6677"
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#223D30]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#3C4A42] mb-1">Fecha (Viernes)</label>
                  <input
                    type="date"
                    required
                    value={fechaViernes}
                    onChange={(e) => setFechaViernes(e.target.value)}
                    className="w-full px-2.5 py-2 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#3C4A42] mb-1">Duración</label>
                  <div className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-bold text-[#223D30]">
                    1:30 hs (Fijo)
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#3C4A42] mb-1">Arancel del Taller ($)</label>
                <input
                  type="number"
                  required
                  value={importeTaller}
                  onChange={(e) => setImporteTaller(e.target.value)}
                  placeholder="15000"
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-mono font-bold text-[#1E2923]"
                />
              </div>

              <div className="pt-2 border-t border-[#F0EBE3]">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#1E2923]">
                  <input
                    type="checkbox"
                    checked={abonaEnElDia}
                    onChange={(e) => setAbonaEnElDia(e.target.checked)}
                    className="w-4 h-4 rounded text-[#223D30] focus:ring-0 cursor-pointer"
                  />
                  <span>Abona en el día (Ingreso directo a caja)</span>
                </label>

                {abonaEnElDia && (
                  <div className="mt-3 p-3 bg-[#FAF8F5] rounded-xl border border-[#DDD6CC] space-y-2.5">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#6F7D74] mb-1">
                        Cuenta de Ingreso
                      </label>
                      <select
                        value={cuentaTaller}
                        onChange={(e) => setCuentaTaller(e.target.value as CuentaDestino)}
                        className="w-full px-2 py-1.5 bg-white border border-[#DDD6CC] rounded-xl text-xs font-semibold cursor-pointer"
                      >
                        <option value="Efectivo">Efectivo (Recepción)</option>
                        <option value="Mercado Pago">Mercado Pago</option>
                        <option value="Banco Ciudad">Banco Ciudad</option>
                        <option value="Santander">Banco Santander</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#6F7D74] mb-1">
                        Comprobante / Referencia
                      </label>
                      <input
                        type="text"
                        value={comprobanteTaller}
                        onChange={(e) => setComprobanteTaller(e.target.value)}
                        placeholder="Ej: Efectivo mano o Transf 9912"
                        className="w-full px-2 py-1.5 bg-white border border-[#DDD6CC] rounded-xl text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={guardandoTaller}
                className="w-full mt-2 py-3 bg-[#A8532F] hover:bg-[#914524] text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                {guardandoTaller ? 'Guardando...' : 'Anotar en Taller de la Memoria'}
              </button>
            </form>
          </div>

          {/* Nómina de Concurrentes */}
          <div className="xl:col-span-7 bg-white border border-[#E8E3DA] rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#F0EBE3]">
              <div>
                <h3 className="text-sm font-bold text-[#1E2923]">Nómina de Asistentes al Taller</h3>
                <p className="text-[11px] text-[#6F7D74]">
                  Total inscriptos: <strong className="text-[#1E2923]">{talleresFiltrados.length}</strong> personas
                </p>
              </div>

              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={busquedaTaller}
                  onChange={(e) => setBusquedaTaller(e.target.value)}
                  placeholder="Buscar por nombre, fecha..."
                  className="w-full pl-9 pr-3 py-1.5 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#223D30]"
                />
              </div>
            </div>

            <div className="overflow-y-auto max-h-[calc(100vh-270px)] pr-1 space-y-2.5">
              {talleresFiltrados.length === 0 ? (
                <div className="py-16 text-center text-[#8C9B91] text-xs">
                  No hay asistentes cargados para el taller de la memoria.
                </div>
              ) : (
                talleresFiltrados.map((t) => {
                  const esCobrado = t.estadoPago === 'Cobrado';
                  const estaCobrando = cobrandoTallerId === t.id;

                  return (
                    <div 
                      key={t.id}
                      className="border border-[#EFECE6] bg-[#FCFBF9] hover:bg-white rounded-2xl p-4 transition-all shadow-2xs space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-[#1E2923]">{t.nombreCompleto}</h4>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#FAF0E6] text-[#A8532F] border border-[#F0D5C3]">
                              {t.edad} años
                            </span>
                          </div>

                          <div className="flex items-center gap-2 mt-1 text-xs text-[#6F7D74] font-mono">
                            <span className="flex items-center gap-1 text-[#223D30]">
                              <Calendar className="w-3.5 h-3.5 text-[#A8532F]" />
                              Viernes {t.fechaViernes}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-[#223D30]" />
                              {t.duracion}
                            </span>
                            <span>•</span>
                            <span>Tel: {t.telefono}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold ${
                            esCobrado 
                              ? 'bg-[#EAF5EF] text-[#1E5C38] border border-[#BCE1CC]'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}>
                            {t.estadoPago}
                          </span>
                          <span className="block text-sm sm:text-base font-bold font-mono text-[#1E2923] mt-0.5">
                            $ {(t.importe || 0).toLocaleString('es-AR')}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-[#F0EBE3] flex items-center justify-between text-xs text-[#5C6B61]">
                        {esCobrado ? (
                          <div className="flex items-center gap-2">
                            <span>Ingresó en: <strong className="text-[#1E2923] font-semibold">{t.cuentaDestino}</strong></span>
                            <span>•</span>
                            <span>Comp: <strong className="font-mono text-[#1E2923]">{t.numeroComprobante || 'Abonó en día'}</strong></span>
                          </div>
                        ) : (
                          <div>
                            {!estaCobrando ? (
                              <button
                                type="button"
                                onClick={() => setCobrandoTallerId(t.id)}
                                className="px-3 py-1 bg-[#223D30] hover:bg-[#182C22] text-white rounded-xl text-xs font-bold cursor-pointer"
                              >
                                Asentar Cobro en el Día
                              </button>
                            ) : (
                              <div className="flex items-center gap-2">
                                <select
                                  value={cuentaCobroTaller}
                                  onChange={(e) => setCuentaCobroTaller(e.target.value as CuentaDestino)}
                                  className="px-2 py-1 bg-white border border-[#DDD6CC] rounded-lg text-xs"
                                >
                                  <option value="Efectivo">Efectivo</option>
                                  <option value="Mercado Pago">Mercado Pago</option>
                                  <option value="Santander">Santander</option>
                                  <option value="Banco Ciudad">Ciudad</option>
                                </select>
                                <input
                                  type="text"
                                  value={comprobanteCobroTaller}
                                  onChange={(e) => setComprobanteCobroTaller(e.target.value)}
                                  placeholder="N° comprobante"
                                  className="px-2 py-1 bg-white border border-[#DDD6CC] rounded-lg text-xs w-28"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleConfirmarCobroTaller(t.id)}
                                  className="px-2.5 py-1 bg-[#223D30] text-white rounded-lg text-xs font-bold cursor-pointer"
                                >
                                  OK
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setCobrandoTallerId(null)}
                                  className="text-xs text-zinc-500 cursor-pointer"
                                >
                                  X
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                        <span className="text-[10px] text-[#8C9B91] font-mono">{t.fechaRegistro}</span>
                      </div>

                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      )}

      {/* --- SECCIÓN 2: PSICODIAGNÓSTICOS Y EVALUACIONES (1 Mes / 50% y 50%) --- */}
      {subPestaña === 'evaluaciones' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          
          {/* Formulario Nueva Evaluación */}
          <div className="xl:col-span-5 bg-white border border-[#E8E3DA] rounded-3xl p-6 shadow-xs xl:sticky xl:top-24">
            <div className="flex items-center gap-3 pb-4 mb-4 border-b border-[#F0EBE3]">
              <div className="w-9 h-9 rounded-2xl bg-[#223D30] text-white flex items-center justify-center shrink-0">
                <FileCheck2 className="w-4 h-4 text-emerald-300" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1E2923]">Iniciar Evaluación / Batería</h3>
                <p className="text-[11px] text-[#6F7D74]">Proceso de 1 mes con cobro escalonado (50% y 50%)</p>
              </div>
            </div>

            {exitoEval && (
              <div className="mb-4 p-3 bg-[#EAF5EF] border border-[#BCE1CC] text-[#1E5C38] rounded-2xl text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-[#2E8B57]" />
                <span>¡Evaluación iniciada! 50% Inicial registrado.</span>
              </div>
            )}

            <form onSubmit={handleSubmitEvaluacion} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold uppercase text-[#3C4A42] mb-1">Nombre y Apellido</label>
                <input
                  type="text"
                  required
                  value={nombreEval}
                  onChange={(e) => setNombreEval(e.target.value)}
                  placeholder="Ej: Marcos Varela"
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#223D30]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#3C4A42] mb-1">DNI</label>
                  <input
                    type="text"
                    value={dniEval}
                    onChange={(e) => setDniEval(e.target.value)}
                    placeholder="35123456"
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#223D30]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#3C4A42] mb-1">Teléfono</label>
                  <input
                    type="tel"
                    required
                    value={telefonoEval}
                    onChange={(e) => setTelefonoEval(e.target.value)}
                    placeholder="11 5566 7788"
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#223D30]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#3C4A42] mb-1">Tipo de Evaluación</label>
                <select
                  value={tipoEval}
                  onChange={(e) => setTipoEval(e.target.value as any)}
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-bold text-[#1E2923] cursor-pointer"
                >
                  <option value="Evaluación Neurocognitiva">Evaluación Neurocognitiva</option>
                  <option value="Evaluación Coeficiente Intelectual (CI)">Evaluación Coeficiente Intelectual (CI)</option>
                  <option value="Psicodiagnóstico Clínico">Psicodiagnóstico Clínico</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#3C4A42] mb-1">Profesional a Cargo</label>
                  <select
                    value={profesionalEvalId}
                    onChange={(e) => setProfesionalEvalId(e.target.value)}
                    className="w-full px-2.5 py-2 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-medium cursor-pointer"
                  >
                    {profesionales.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#3C4A42] mb-1">Fecha de Inicio</label>
                  <input
                    type="date"
                    required
                    value={fechaInicioEval}
                    onChange={(e) => setFechaInicioEval(e.target.value)}
                    className="w-full px-2.5 py-2 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#3C4A42] mb-1">Arancel Total del Proceso ($)</label>
                <input
                  type="number"
                  required
                  value={importeTotalEval}
                  onChange={(e) => setImporteTotalEval(e.target.value)}
                  placeholder="70000"
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-mono font-bold text-[#1E2923]"
                />
              </div>

              {/* Esquema 50% y 50% */}
              <div className="p-3 bg-[#FAF8F5] border border-[#DDD6CC] rounded-2xl space-y-2 text-xs">
                <div className="flex items-center justify-between font-bold text-[#1E2923]">
                  <span>Cuota 1 (50% al Iniciar):</span>
                  <span className="font-mono text-[#223D30]">$ {Math.round((Number(importeTotalEval) || 0) / 2).toLocaleString('es-AR')}</span>
                </div>
                <div className="flex items-center justify-between text-[#6F7D74]">
                  <span>Cuota 2 (50% al Entregar Informe - 1 Mes):</span>
                  <span className="font-mono text-[#A8532F] font-bold">$ {Math.round((Number(importeTotalEval) || 0) / 2).toLocaleString('es-AR')}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-[#F0EBE3]">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#1E2923]">
                  <input
                    type="checkbox"
                    checked={cuota1Cobrada}
                    onChange={(e) => setCuota1Cobrada(e.target.checked)}
                    className="w-4 h-4 rounded text-[#223D30] focus:ring-0 cursor-pointer"
                  />
                  <span>¿Ya se cobró el 50% inicial en el centro?</span>
                </label>

                {cuota1Cobrada && (
                  <div className="mt-3 p-3 bg-[#FAF8F5] rounded-xl border border-[#DDD6CC] space-y-2.5">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#6F7D74] mb-1">Cuenta de Ingreso</label>
                      <select
                        value={cuentaCuota1}
                        onChange={(e) => setCuentaCuota1(e.target.value as CuentaDestino)}
                        className="w-full px-2 py-1.5 bg-white border border-[#DDD6CC] rounded-xl text-xs font-semibold cursor-pointer"
                      >
                        <option value="Santander">Banco Santander</option>
                        <option value="Banco Ciudad">Banco Ciudad</option>
                        <option value="Mercado Pago">Mercado Pago</option>
                        <option value="Efectivo">Efectivo</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#6F7D74] mb-1">Comprobante Cuota 1</label>
                      <input
                        type="text"
                        value={comprobanteCuota1}
                        onChange={(e) => setComprobanteCuota1(e.target.value)}
                        placeholder="Ej: Transf. 99312 o Recibo N° 4"
                        className="w-full px-2 py-1.5 bg-white border border-[#DDD6CC] rounded-xl text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={guardandoEval}
                className="w-full mt-2 py-3 bg-[#223D30] hover:bg-[#182C22] text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                {guardandoEval ? 'Iniciando evaluación...' : 'Registrar Evaluación e Iniciar Proceso'}
              </button>
            </form>
          </div>

          {/* Seguimiento de Evaluaciones */}
          <div className="xl:col-span-7 bg-white border border-[#E8E3DA] rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#F0EBE3]">
              <div>
                <h3 className="text-sm font-bold text-[#1E2923]">Seguimiento Clínico y Cobro de Informes</h3>
                <p className="text-[11px] text-[#6F7D74]">
                  Total en curso: <strong className="text-[#1E2923]">{evaluacionesFiltradas.length}</strong> evaluaciones
                </p>
              </div>

              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={busquedaEval}
                  onChange={(e) => setBusquedaEval(e.target.value)}
                  placeholder="Buscar paciente, tipo..."
                  className="w-full pl-9 pr-3 py-1.5 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#223D30]"
                />
              </div>
            </div>

            <div className="overflow-y-auto max-h-[calc(100vh-270px)] pr-1 space-y-3">
              {evaluacionesFiltradas.length === 0 ? (
                <div className="py-16 text-center text-[#8C9B91] text-xs">
                  No hay evaluaciones clínicas registradas.
                </div>
              ) : (
                evaluacionesFiltradas.map((ev) => {
                  const c1Cobrada = ev.cuota1.estado === 'Cobrado';
                  const c2Cobrada = ev.cuota2.estado === 'Cobrado';
                  const estaCobrandoC2 = cobrandoCuota2Id === ev.id;

                  return (
                    <div 
                      key={ev.id}
                      className="border border-[#EFECE6] bg-[#FCFBF9] hover:bg-white rounded-2xl p-4 transition-all shadow-2xs space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-[#1E2923]">{ev.pacienteNombre}</h4>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#EBF2EE] text-[#223D30] border border-[#C5D9CD]">
                              {ev.tipoEvaluacion}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 mt-1 text-xs text-[#6F7D74] font-mono flex-wrap">
                            <span>Evaluador: <strong className="text-[#1E2923] font-sans">{ev.profesionalNombre}</strong></span>
                            <span>•</span>
                            <span>Inicio: {ev.fechaInicio}</span>
                            <span>•</span>
                            <span className="text-[#A8532F] font-semibold">Entrega: {ev.fechaEntregaEstimada}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-[#6F7D74] block">Total Proceso</span>
                          <span className="text-base font-bold font-mono text-[#1E2923]">
                            $ {ev.importeTotal.toLocaleString('es-AR')}
                          </span>
                        </div>
                      </div>

                      {/* SEGUIMIENTO DE LAS 2 CUOTAS (50% Y 50%) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-[#F0EBE3] text-xs">
                        
                        {/* Tarjeta Cuota 1 (50% Inicio) */}
                        <div className={`p-3 rounded-xl border ${
                          c1Cobrada 
                            ? 'bg-[#EAF5EF] border-[#BCE1CC] text-[#1E5C38]' 
                            : 'bg-amber-50 border-amber-200 text-amber-800'
                        }`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-[11px]">1° Cuota (50% Inicial)</span>
                            <span className="font-bold font-mono">$ {ev.cuota1.monto.toLocaleString('es-AR')}</span>
                          </div>
                          <div className="text-[10px]">
                            {c1Cobrada ? (
                              <span>✓ Cobrado en {ev.cuota1.cuenta} ({ev.cuota1.comprobante})</span>
                            ) : (
                              <span>⚠ Pendiente de cobro al iniciar</span>
                            )}
                          </div>
                        </div>

                        {/* Tarjeta Cuota 2 (50% Final / Entrega) */}
                        <div className={`p-3 rounded-xl border ${
                          c2Cobrada 
                            ? 'bg-[#EAF5EF] border-[#BCE1CC] text-[#1E5C38]' 
                            : 'bg-[#FAF8F5] border-[#DDD6CC] text-[#1E2923]'
                        }`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-[11px]">2° Cuota (50% Final / Entrega)</span>
                            <span className="font-bold font-mono text-[#A8532F]">$ {ev.cuota2.monto.toLocaleString('es-AR')}</span>
                          </div>

                          {c2Cobrada ? (
                            <span className="text-[10px] text-[#1E5C38] block">✓ Cobrado ({ev.cuota2.cuenta}) · Informe liberado</span>
                          ) : (
                            <div>
                              {!estaCobrandoC2 ? (
                                <button
                                  type="button"
                                  onClick={() => setCobrandoCuota2Id(ev.id)}
                                  className="mt-1 px-3 py-1 bg-[#A8532F] hover:bg-[#914524] text-white text-[11px] font-bold rounded-lg cursor-pointer transition-all"
                                >
                                  Cobrar 2° Cuota y Entregar
                                </button>
                              ) : (
                                <div className="mt-2 space-y-1.5 p-2 bg-white rounded-lg border border-[#DDD6CC]">
                                  <div className="flex items-center gap-1.5">
                                    <select
                                      value={cuentaCuota2}
                                      onChange={(e) => setCuentaCuota2(e.target.value as CuentaDestino)}
                                      className="px-2 py-1 bg-[#FAF8F5] border border-[#DDD6CC] rounded text-[10px] font-bold"
                                    >
                                      <option value="Santander">Santander</option>
                                      <option value="Banco Ciudad">Ciudad</option>
                                      <option value="Mercado Pago">Mercado Pago</option>
                                      <option value="Efectivo">Efectivo</option>
                                    </select>
                                    <input
                                      type="text"
                                      value={comprobanteCuota2}
                                      onChange={(e) => setComprobanteCuota2(e.target.value)}
                                      placeholder="Comprobante"
                                      className="px-2 py-1 bg-[#FAF8F5] border border-[#DDD6CC] rounded text-[10px] flex-1"
                                    />
                                  </div>
                                  <div className="flex justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => setCobrandoCuota2Id(null)}
                                      className="text-[10px] text-zinc-500 hover:text-zinc-800"
                                    >
                                      Cancelar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleConfirmarCuota2(ev.id)}
                                      className="px-2 py-0.5 bg-[#223D30] text-white rounded text-[10px] font-bold cursor-pointer"
                                    >
                                      Confirmar Cobro
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
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

    </div>
  );
}