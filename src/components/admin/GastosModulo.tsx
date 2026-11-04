'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  guardarGasto, 
  obtenerGastos, 
  actualizarGasto,
  CONCEPTOS_DEFAULT 
} from '../../lib/servicios';
import { Gasto, CuentaDestino } from '../../types';
import { 
  Receipt, 
  CheckCircle2, 
  Search, 
  Wallet, 
  Calendar, 
  Building, 
  Banknote,
  ChevronDown,
  ChevronUp,
  ChevronsDownUp,
  ChevronsUpDown,
  Edit2,
  Check,
  X,
  CalendarDays
} from 'lucide-react';

export default function GastosModulo() {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroCuenta, setFiltroCuenta] = useState<'Todos' | 'Efectivo' | 'Bancos'>('Todos');
  const [cargando, setCargando] = useState(false);
  const [guardadoExito, setGuardadoExito] = useState(false);

  // Clave del mes actual en formato "YYYY-MM" (ej: "2026-10")
  const mesActualKey = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }, []);

  const [mesSeleccionado, setMesSeleccionado] = useState<string>(mesActualKey);

  // Modo cápsula (plegar / expandir)
  const [tarjetasColapsadas, setTarjetasColapsadas] = useState<{ [id: string]: boolean }>({});
  const [todasColapsadas, setTodasColapsadas] = useState(false);

  // Edición directa
  const [gastoEditandoId, setGastoEditandoId] = useState<string | null>(null);
  const [editConcepto, setEditConcepto] = useState('');
  const [editImporte, setEditImporte] = useState('');
  const [editCuenta, setEditCuenta] = useState<CuentaDestino>('Efectivo');
  const [editNota, setEditNota] = useState('');
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);

  // Formulario nuevo gasto
  const [concepto, setConcepto] = useState('');
  const [importe, setImporte] = useState('');
  const [cuentaSalida, setCuentaSalida] = useState<CuentaDestino>('Efectivo');
  const [notaDetalle, setNotaDetalle] = useState('');

  const cargarGastos = async () => {
    try {
      const data = await obtenerGastos();
      setGastos(data.sort((a, b) => (b.fechaIso || '').localeCompare(a.fechaIso || '')));
    } catch (error) {
      console.error('Error cargando gastos:', error);
    }
  };

  useEffect(() => {
    cargarGastos();
  }, []);

  // Obtener lista dinámica de meses disponibles a partir de los gastos registrados
  const mesesDisponibles = useMemo(() => {
    const setMeses = new Set<string>();
    setMeses.add(mesActualKey); // Siempre incluir el mes en curso

    gastos.forEach(g => {
      if (g.fechaIso) {
        setMeses.add(g.fechaIso.slice(0, 7)); // "YYYY-MM"
      }
    });

    return Array.from(setMeses).sort().reverse();
  }, [gastos, mesActualKey]);

  // Formateador amigable de nombres de meses en español (ej: "Octubre 2026")
  const formatearNombreMes = (claveMes: string) => {
    const [anio, mes] = claveMes.split('-');
    const fecha = new Date(Number(anio), Number(mes) - 1, 1);
    const nombre = fecha.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
    return nombre.charAt(0).toUpperCase() + nombre.slice(1);
  };

  const conceptosDisponibles = Array.from(
    new Set([...CONCEPTOS_DEFAULT, ...gastos.map(g => g.concepto).filter(Boolean)])
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importe || isNaN(Number(importe))) return;

    setCargando(true);
    try {
      await guardarGasto({
        concepto: concepto.trim(),
        importe: Number(importe),
        cuentaSalida,
        notaDetalle: notaDetalle.trim()
      });

      setConcepto('');
      setImporte('');
      setNotaDetalle('');
      setGuardadoExito(true);
      setTimeout(() => setGuardadoExito(false), 3000);

      // Al cargar uno nuevo, volvemos a posicionar la vista en el mes en curso
      setMesSeleccionado(mesActualKey);
      await cargarGastos();
    } catch (error) {
      console.error('Error guardando gasto:', error);
      alert('Error al registrar el gasto.');
    } finally {
      setCargando(false);
    }
  };

  const iniciarEdicion = (g: Gasto) => {
    setGastoEditandoId(g.id);
    setEditConcepto(g.concepto);
    setEditImporte(String(g.importe));
    setEditCuenta(g.cuentaSalida);
    setEditNota(g.notaDetalle || '');
  };

  const cancelarEdicion = () => {
    setGastoEditandoId(null);
  };

  const guardarCambiosEdicion = async (id: string) => {
    if (!editImporte || isNaN(Number(editImporte))) return;
    setGuardandoEdicion(true);
    try {
      await actualizarGasto(id, {
        concepto: editConcepto.trim(),
        importe: Number(editImporte),
        cuentaSalida: editCuenta,
        notaDetalle: editNota.trim()
      });
      setGastoEditandoId(null);
      await cargarGastos();
    } catch (error) {
      console.error('Error actualizando gasto:', error);
      alert('No se pudieron guardar las modificaciones.');
    } finally {
      setGuardandoEdicion(false);
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
    gastos.forEach(g => {
      mapa[g.id] = nuevoEstado;
    });
    setTarjetasColapsadas(mapa);
  };

  // Filtrado compuesto: Mes seleccionado + Filtro de Cuenta + Búsqueda de texto
  const gastosFiltrados = gastos.filter(g => {
    // 1. Filtro por mes
    if (mesSeleccionado !== 'TODOS') {
      const gastoMes = (g.fechaIso || '').slice(0, 7);
      if (gastoMes !== mesSeleccionado) return false;
    }

    // 2. Filtro por cuenta
    if (filtroCuenta === 'Efectivo' && g.cuentaSalida !== 'Efectivo') return false;
    if (filtroCuenta === 'Bancos' && g.cuentaSalida === 'Efectivo') return false;

    // 3. Filtro por texto
    const coincideTexto = `${g.concepto} ${g.notaDetalle || ''} ${g.cuentaSalida}`
      .toLowerCase()
      .includes(busqueda.toLowerCase());

    return coincideTexto;
  });

  // Totales basados en el mes y filtro activo
  const gastosDelMes = gastos.filter(g => 
    mesSeleccionado === 'TODOS' ? true : (g.fechaIso || '').slice(0, 7) === mesSeleccionado
  );

  const totalPeriodo = gastosDelMes.reduce((acc, curr) => acc + (curr.importe || 0), 0);
  const totalEfectivoPeriodo = gastosDelMes
    .filter(g => g.cuentaSalida === 'Efectivo')
    .reduce((acc, curr) => acc + (curr.importe || 0), 0);
  const totalBancosPeriodo = totalPeriodo - totalEfectivoPeriodo;

  const getIconoCuenta = (cuenta: CuentaDestino) => {
    switch (cuenta) {
      case 'Efectivo':
        return <Banknote className="w-3.5 h-3.5 text-emerald-700" />;
      case 'Mercado Pago':
        return <Wallet className="w-3.5 h-3.5 text-sky-600" />;
      default:
        return <Building className="w-3.5 h-3.5 text-[#A8532F]" />;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Banner CIAP sincronizado con el mes seleccionado */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 bg-[#223D30] text-white rounded-3xl p-6 sm:p-7 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold tracking-widest text-[#E3A382] uppercase">
              Administración Contable
            </span>
            <span className="text-[#8C9B91]">•</span>
            <span className="text-xs font-semibold text-emerald-200">
              {mesSeleccionado === 'TODOS' ? 'Histórico General' : formatearNombreMes(mesSeleccionado)}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            Control de Gastos Operativos
          </h2>
          <p className="text-xs sm:text-sm text-[#C8D6CF] mt-1 max-w-2xl">
            Egresos discriminados entre Caja Chica física y Cuentas Bancarias con memoria de conceptos.
          </p>
        </div>
        
        {/* Desglose de Totales del Período */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="bg-[#2D4D3D] px-4 py-2.5 rounded-2xl border border-[#3C614E]">
            <span className="text-[10px] font-bold tracking-wider uppercase text-[#C8D6CF] block">
              Efectivo (Caja)
            </span>
            <span className="text-sm sm:text-base font-bold font-mono text-emerald-300">
              $ {totalEfectivoPeriodo.toLocaleString('es-AR')}
            </span>
          </div>

          <div className="bg-[#2D4D3D] px-4 py-2.5 rounded-2xl border border-[#3C614E]">
            <span className="text-[10px] font-bold tracking-wider uppercase text-[#C8D6CF] block">
              Bancos / MP
            </span>
            <span className="text-sm sm:text-base font-bold font-mono text-[#E3A382]">
              $ {totalBancosPeriodo.toLocaleString('es-AR')}
            </span>
          </div>

          <div className="bg-[#1A2E24] px-5 py-2.5 rounded-2xl border border-[#2D4D3D]">
            <span className="text-[10px] font-bold tracking-wider uppercase text-[#E3A382] block">
              Total {mesSeleccionado === 'TODOS' ? 'Histórico' : 'del Mes'}
            </span>
            <span className="text-lg sm:text-xl font-bold font-mono text-white">
              $ {totalPeriodo.toLocaleString('es-AR')}
            </span>
          </div>
        </div>
      </div>

      {/* Grid: Formulario Fijo Izquierdo + Historial en Cápsula Derecho */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* Formulario Fijo Izquierdo */}
        <div className="xl:col-span-5 bg-white border border-[#E8E3DA] rounded-3xl p-6 shadow-xs xl:sticky xl:top-28">
          <div className="flex items-center gap-3 pb-4 mb-5 border-b border-[#F0EBE3]">
            <div className="w-9 h-9 rounded-2xl bg-[#A8532F] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1E2923]">Cargar Nuevo Gasto</h3>
              <p className="text-[11px] text-[#6F7D74]">Con guardado de concepto para futuras compras</p>
            </div>
          </div>

          {guardadoExito && (
            <div className="mb-4 p-3 bg-[#EAF5EF] border border-[#BCE1CC] text-[#1E5C38] rounded-2xl text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#2E8B57]" />
              <span>¡Gasto registrado con éxito!</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#3C4A42] mb-1">
                Concepto / Motivo del Gasto
              </label>
              <input
                type="text"
                required
                list="conceptos-list"
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                placeholder="Escribí o seleccioná un concepto..."
                className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-medium text-[#1E2923] focus:outline-none focus:ring-2 focus:ring-[#223D30] focus:bg-white"
              />
              <datalist id="conceptos-list">
                {conceptosDisponibles.map((item, index) => (
                  <option key={index} value={item} />
                ))}
              </datalist>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#3C4A42] mb-1">
                  Importe ($ ARS)
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={importe}
                  onChange={(e) => setImporte(e.target.value)}
                  placeholder="Ej: 15400"
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-mono font-bold text-[#1E2923] focus:outline-none focus:ring-2 focus:ring-[#223D30] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#3C4A42] mb-1">
                  Se abonó desde
                </label>
                <select
                  value={cuentaSalida}
                  onChange={(e) => setCuentaSalida(e.target.value as CuentaDestino)}
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-semibold text-[#1E2923] focus:outline-none focus:ring-2 focus:ring-[#223D30] focus:bg-white cursor-pointer"
                >
                  <option value="Efectivo">Efectivo (Caja Chica)</option>
                  <option value="Santander">Banco Santander</option>
                  <option value="Banco Ciudad">Banco Ciudad</option>
                  <option value="Mercado Pago">Mercado Pago</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#3C4A42] mb-1 flex items-center justify-between">
                <span>Nota / Detalle de la compra</span>
                <span className="text-[10px] text-[#A8532F] font-semibold lowercase">opcional</span>
              </label>
              <textarea
                rows={2}
                value={notaDetalle}
                onChange={(e) => setNotaDetalle(e.target.value)}
                placeholder="Ej: Ticket Coto N° 4589 - 2 paquetes de café..."
                className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-medium text-[#1E2923] focus:outline-none focus:ring-2 focus:ring-[#223D30] focus:bg-white resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="w-full mt-2 py-3 bg-[#A8532F] hover:bg-[#914524] text-white rounded-xl text-xs font-bold tracking-wide transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer"
            >
              {cargando ? 'Guardando egreso...' : 'Registrar Gasto'}
            </button>
          </form>
        </div>

        {/* Historial en Cápsula con Filtro por Mes y Scroll Independiente */}
        <div className="xl:col-span-7 bg-white border border-[#E8E3DA] rounded-3xl p-6 shadow-xs">
          
          {/* Cabecera con Selector de Mes y Acciones */}
          <div className="space-y-4 mb-5 pb-4 border-b border-[#F0EBE3]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-[#1E2923]">Historial de Egresos</h3>
                <p className="text-[11px] text-[#6F7D74]">
                  Comprobantes en el período: <strong className="text-[#1E2923]">{gastosFiltrados.length}</strong>
                </p>
              </div>

              {/* Selector de Mes */}
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

            {/* Fila de Filtros de Cuenta, Plegado y Búsqueda */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center bg-[#FAF8F5] border border-[#DDD6CC] p-1 rounded-xl text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setFiltroCuenta('Todos')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    filtroCuenta === 'Todos' ? 'bg-[#223D30] text-white shadow-2xs' : 'text-[#6F7D74]'
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroCuenta('Efectivo')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    filtroCuenta === 'Efectivo' ? 'bg-[#223D30] text-white shadow-2xs' : 'text-[#6F7D74]'
                  }`}
                >
                  Efectivo
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroCuenta('Bancos')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    filtroCuenta === 'Bancos' ? 'bg-[#223D30] text-white shadow-2xs' : 'text-[#6F7D74]'
                  }`}
                >
                  Bancos/MP
                </button>
              </div>

              <div className="flex items-center gap-2 flex-1 sm:flex-initial justify-end">
                <button
                  type="button"
                  onClick={toggleTodas}
                  title={todasColapsadas ? "Expandir todas" : "Plegar a modo cápsula"}
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

                <div className="relative w-full sm:w-44">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar..."
                    className="w-full pl-9 pr-3 py-1.5 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-medium text-[#1E2923] placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#223D30] focus:bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Área con Scroll Independiente */}
          <div className="overflow-y-auto max-h-[calc(100vh-320px)] pr-1 space-y-2.5">
            {gastosFiltrados.length === 0 ? (
              <div className="py-16 text-center text-[#8C9B91] text-xs">
                No hay egresos registrados en {mesSeleccionado === 'TODOS' ? 'el historial' : formatearNombreMes(mesSeleccionado)}.
              </div>
            ) : (
              gastosFiltrados.map((gasto) => {
                const estaColapsada = tarjetasColapsadas[gasto.id] ?? false;
                const estaEditando = gastoEditandoId === gasto.id;

                return (
                  <div 
                    key={gasto.id} 
                    className="border border-[#EFECE6] bg-[#FCFBF9] hover:bg-white hover:border-[#DDD6CC] rounded-2xl p-3.5 sm:p-4 transition-all duration-150 shadow-2xs"
                  >
                    {/* CÁPSULA (Línea compacta permanente) */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-[#1E2923]">
                            {gasto.concepto}
                          </h4>
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#EFECE6] text-[#4A554E] border border-[#E2DDD3]">
                            {getIconoCuenta(gasto.cuentaSalida)}
                            {gasto.cuentaSalida}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mt-1 text-[11px] text-[#6F7D74] font-mono">
                          <Calendar className="w-3 h-3 text-[#A8532F]" />
                          <span>{gasto.fechaRegistro}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm sm:text-base font-bold font-mono text-[#A8532F]">
                          - $ {(gasto.importe || 0).toLocaleString('es-AR')}
                        </span>

                        <button
                          type="button"
                          onClick={() => toggleColapsarTarjeta(gasto.id)}
                          title={estaColapsada ? "Ver detalle / editar" : "Plegar a cápsula"}
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

                    {/* VISTA EXPANDIDA (Nota y panel de corrección/edición) */}
                    {!estaColapsada && (
                      <div className="mt-3 pt-2.5 border-t border-[#F0EBE3]">
                        {!estaEditando ? (
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="text-[#5C6B61] italic truncate max-w-[80%]">
                              {gasto.notaDetalle ? `"${gasto.notaDetalle}"` : 'Sin nota de detalle'}
                            </span>
                            <button
                              type="button"
                              onClick={() => iniciarEdicion(gasto)}
                              className="text-[#A8532F] font-semibold flex items-center gap-1 hover:underline cursor-pointer text-[11px]"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>Corregir</span>
                            </button>
                          </div>
                        ) : (
                          /* PANEL DE EDICIÓN */
                          <div className="bg-[#FAF8F5] border border-[#DDD6CC] p-3 rounded-xl mt-2 space-y-2.5">
                            <div className="flex items-center justify-between text-[11px] font-bold text-[#1E2923]">
                              <span>Rectificar Gasto / Canal de Pago</span>
                              <button
                                type="button"
                                onClick={cancelarEdicion}
                                className="text-zinc-400 hover:text-zinc-600 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <div>
                                <label className="block text-[10px] font-bold uppercase text-[#6F7D74] mb-1">
                                  Concepto
                                </label>
                                <input
                                  type="text"
                                  value={editConcepto}
                                  onChange={(e) => setEditConcepto(e.target.value)}
                                  className="w-full px-2 py-1 bg-white border border-[#DDD6CC] rounded-lg text-xs"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold uppercase text-[#6F7D74] mb-1">
                                  Importe ($)
                                </label>
                                <input
                                  type="number"
                                  value={editImporte}
                                  onChange={(e) => setEditImporte(e.target.value)}
                                  className="w-full px-2 py-1 bg-white border border-[#DDD6CC] rounded-lg text-xs font-mono font-bold"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold uppercase text-[#6F7D74] mb-1">
                                  Cuenta / Método
                                </label>
                                <select
                                  value={editCuenta}
                                  onChange={(e) => setEditCuenta(e.target.value as CuentaDestino)}
                                  className="w-full px-2 py-1 bg-white border border-[#DDD6CC] rounded-lg text-xs font-semibold cursor-pointer"
                                >
                                  <option value="Efectivo">Efectivo (Caja)</option>
                                  <option value="Santander">Santander</option>
                                  <option value="Banco Ciudad">Banco Ciudad</option>
                                  <option value="Mercado Pago">Mercado Pago</option>
                                </select>
                              </div>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold uppercase text-[#6F7D74] mb-1">
                                Nota / Comprobante
                              </label>
                              <input
                                type="text"
                                value={editNota}
                                onChange={(e) => setEditNota(e.target.value)}
                                className="w-full px-2 py-1 bg-white border border-[#DDD6CC] rounded-lg text-xs"
                              />
                            </div>

                            <div className="flex justify-end gap-2 pt-1">
                              <button
                                type="button"
                                onClick={cancelarEdicion}
                                className="px-2.5 py-1 text-zinc-500 hover:text-zinc-800 text-[11px] font-semibold cursor-pointer"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                disabled={guardandoEdicion}
                                onClick={() => guardarCambiosEdicion(gasto.id)}
                                className="flex items-center gap-1 px-3 py-1 bg-[#223D30] text-white rounded-lg text-[11px] font-bold hover:bg-[#182C22] cursor-pointer disabled:opacity-50"
                              >
                                <Check className="w-3 h-3" />
                                <span>{guardandoEdicion ? 'Guardando...' : 'Aplicar Corrección'}</span>
                              </button>
                            </div>
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
    </div>
  );
}