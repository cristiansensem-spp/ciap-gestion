import { db, auth } from './firebase';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut as signOutSecondary } from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc,
  doc, 
  setDoc,
  arrayUnion,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  Paciente, 
  Sesion, 
  Gasto, 
  TallerMemoria, 
  NotaHistorial, 
  CuentaDestino, 
  MetodoPago,
  Profesional 
} from '../types';

// Nómina de referencia (solo como catálogo, ya no se auto-inserta en la base)
export const PROFESIONALES_INICIALES: Omit<Profesional, 'id'>[] = [
  { nombre: 'Lic. Mariana Rossi', email: 'mariana.rossi@centrociap.com.ar', especialidad: 'Adultos - Psicoanálisis', diasAtencion: 'Lunes y Miércoles', horarios: '14:00 a 20:00 hs', modalidad: 'Presencial y Virtual', porcentajeHonorarios: 60 },
  { nombre: 'Lic. Esteban Gómez', email: 'esteban.gomez@centrociap.com.ar', especialidad: 'Niños y Adolescentes', diasAtencion: 'Martes y Jueves', horarios: '09:00 a 14:00 hs', modalidad: 'Solo Presencial', porcentajeHonorarios: 60 },
  { nombre: 'Lic. Sofía Beltrán', email: 'sofia.beltran@centrociap.com.ar', especialidad: 'TCC - Ansiedad y Fobias', diasAtencion: 'Lunes a Jueves', horarios: '15:00 a 21:00 hs', modalidad: 'Solo Virtual', porcentajeHonorarios: 60 },
  { nombre: 'Lic. Julián Morales', email: 'julian.morales@centrociap.com.ar', especialidad: 'Parejas y Familia', diasAtencion: 'Viernes y Sábados', horarios: '10:00 a 17:00 hs', modalidad: 'Solo Presencial', porcentajeHonorarios: 60 },
  { nombre: 'Lic. Camila Herrera', email: 'camila.herrera@centrociap.com.ar', especialidad: 'Psicoanálisis Adultos', diasAtencion: 'Miércoles y Viernes', horarios: '13:00 a 19:00 hs', modalidad: 'Presencial y Virtual', porcentajeHonorarios: 60 },
  { nombre: 'Lic. Nicolás Castro', email: 'nicolas.castro@centrociap.com.ar', especialidad: 'Neuropsicología / Memoria', diasAtencion: 'Lunes y Viernes', horarios: '09:00 a 15:00 hs', modalidad: 'Solo Presencial', porcentajeHonorarios: 60 },
  { nombre: 'Lic. Valentina Benítez', email: 'valentina.benitez@centrociap.com.ar', especialidad: 'Orientación Vocacional', diasAtencion: 'Martes y Viernes', horarios: '16:00 a 20:00 hs', modalidad: 'Solo Virtual', porcentajeHonorarios: 60 },
  { nombre: 'Lic. Martín Peña', email: 'martin.pena@centrociap.com.ar', especialidad: 'Adultos Mayores y Duelo', diasAtencion: 'Lunes y Miércoles', horarios: '10:00 a 16:00 hs', modalidad: 'Solo Presencial', porcentajeHonorarios: 60 },
  { nombre: 'Lic. Florencia Domínguez', email: 'florencia.dominguez@centrociap.com.ar', especialidad: 'Estrés y Psicosomática', diasAtencion: 'Jueves y Viernes', horarios: '14:00 a 20:00 hs', modalidad: 'Solo Virtual', porcentajeHonorarios: 60 },
  { nombre: 'Lic. Rodrigo Silva', email: 'rodrigo.silva@centrociap.com.ar', especialidad: 'Evaluaciones y Psicotécnicos', diasAtencion: 'Sábados', horarios: '09:00 a 14:00 hs', modalidad: 'Solo Presencial', porcentajeHonorarios: 60 },
];

export const CONCEPTOS_DEFAULT = [
  'Honorarios Profesionales',
  'Alquiler Sede Consultorios',
  'Supermercado / Insumos y Cafetería',
  'Servicio de Internet y Telefonía',
  'Luz / Servicios Públicos',
  'Librería e Impresiones',
  'Mantenimiento y Limpieza',
  'Gastos Varios'
];

export const obtenerFechaHoraActual = (): string => {
  const ahora = new Date();
  const fecha = ahora.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const hora = ahora.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${fecha} · ${hora} hs`;
};

// --- SERVICIOS DE PROFESIONALES (RESPETA BORRADOS SIN RECREAR SEMILLAS) ---
export const obtenerProfesionales = async (): Promise<Profesional[]> => {
  const snapshot = await getDocs(collection(db, 'profesionales'));
  
  return snapshot.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      porcentajeHonorarios: 60 // 60% fijo
    } as Profesional;
  });
};

export const registrarProfesionalConAcceso = async (
  datos: Omit<Profesional, 'id'>, 
  passwordInicial: string
) => {
  const docRef = await addDoc(collection(db, 'profesionales'), {
    ...datos,
    porcentajeHonorarios: 60,
    creadoEn: new Date().toISOString()
  });
  const profesionalId = docRef.id;

  if (datos.email && passwordInicial) {
    try {
      const secondaryApp = getApps().find(a => a.name === 'SecondaryAuth') 
        || initializeApp(auth.app.options, 'SecondaryAuth');
      const secondaryAuth = getAuth(secondaryApp);

      const userCred = await createUserWithEmailAndPassword(secondaryAuth, datos.email, passwordInicial);
      const uid = userCred.user.uid;

      await setDoc(doc(db, 'usuarios', uid), {
        email: datos.email,
        nombre: datos.nombre,
        rol: 'profesional',
        profesionalId: profesionalId,
        creadoEn: new Date().toISOString()
      });

      await signOutSecondary(secondaryAuth);
    } catch (authErr: any) {
      console.warn('Usuario ya existente en Firebase Auth o error al crear credenciales:', authErr);
    }
  }

  return profesionalId;
};

export const eliminarProfesional = async (id: string) => {
  const docRef = doc(db, 'profesionales', id);
  await deleteDoc(docRef);
};

// --- SERVICIOS DE PACIENTES ---
export const guardarPaciente = async (
  paciente: Omit<Paciente, 'id' | 'fechaCreacion' | 'fechaRegistroFormateada' | 'historialNotas'>,
  notaInicial?: string
) => {
  const timestampHumano = obtenerFechaHoraActual();
  const notasIniciales: NotaHistorial[] = [];

  if (notaInicial && notaInicial.trim() !== '') {
    notasIniciales.push({
      id: Date.now().toString(),
      texto: notaInicial.trim(),
      fechaHora: timestampHumano
    });
  }

  const docRef = await addDoc(collection(db, 'pacientes'), {
    ...paciente,
    fechaCreacion: new Date().toISOString(),
    fechaRegistroFormateada: timestampHumano,
    historialNotas: notasIniciales,
    creadoEn: serverTimestamp()
  });

  return docRef.id;
};

export const obtenerPacientes = async (): Promise<Paciente[]> => {
  const snapshot = await getDocs(collection(db, 'pacientes'));
  return snapshot.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      historialNotas: data.historialNotas || []
    } as Paciente;
  });
};

export const agregarNotaAlHilo = async (pacienteId: string, textoNota: string) => {
  const nuevaNota: NotaHistorial = {
    id: Date.now().toString(),
    texto: textoNota.trim(),
    fechaHora: obtenerFechaHoraActual()
  };

  const docRef = doc(db, 'pacientes', pacienteId);
  await updateDoc(docRef, {
    historialNotas: arrayUnion(nuevaNota)
  });

  return nuevaNota;
};

export const actualizarPaciente = async (id: string, datos: Partial<Paciente>) => {
  const docRef = doc(db, 'pacientes', id);
  await updateDoc(docRef, datos);
};

export const reasignarProfesionalPaciente = async (
  pacienteId: string, 
  nuevoProfesionalId: string, 
  nuevoProfesionalNombre: string
) => {
  const timestampHumano = obtenerFechaHoraActual();
  const notaReasignacion: NotaHistorial = {
    id: Date.now().toString(),
    texto: `Reasignado/a a ${nuevoProfesionalNombre} por administración.`,
    fechaHora: timestampHumano
  };

  const docRef = doc(db, 'pacientes', pacienteId);
  await updateDoc(docRef, {
    profesionalId: nuevoProfesionalId,
    profesionalNombre: nuevoProfesionalNombre,
    historialNotas: arrayUnion(notaReasignacion)
  });
};

// --- SERVICIOS DE SESIONES Y CAJA ---
export const guardarSesion = async (
  sesion: Omit<Sesion, 'id' | 'fechaRegistro' | 'fechaIso'>
) => {
  const timestampHumano = obtenerFechaHoraActual();
  
  const datosLimpios: Record<string, any> = {
    pacienteId: sesion.pacienteId,
    pacienteNombre: sesion.pacienteNombre,
    profesionalId: sesion.profesionalId,
    profesionalNombre: sesion.profesionalNombre,
    fecha: sesion.fecha,
    hora: sesion.hora,
    modalidad: sesion.modalidad,
    importe: Number(sesion.importe),
    estadoPago: sesion.estadoPago,
    tipoServicio: sesion.tipoServicio || 'Sesion',
    liquidada: false,
    fechaRegistro: timestampHumano,
    fechaIso: new Date().toISOString(),
    creadoEn: serverTimestamp()
  };

  if (sesion.etapaCobro) datosLimpios.etapaCobro = sesion.etapaCobro;
  if (sesion.cuentaDestino) datosLimpios.cuentaDestino = sesion.cuentaDestino;
  if (sesion.metodoPago) datosLimpios.metodoPago = sesion.metodoPago;
  if (sesion.numeroComprobante) datosLimpios.numeroComprobante = sesion.numeroComprobante;
  if (sesion.fechaCobro) datosLimpios.fechaCobro = sesion.fechaCobro;

  const docRef = await addDoc(collection(db, 'sesiones'), datosLimpios);
  return docRef.id;
};

export const obtenerSesiones = async (): Promise<Sesion[]> => {
  const snapshot = await getDocs(collection(db, 'sesiones'));
  return snapshot.docs.map(d => ({
    id: d.id,
    ...d.data(),
    liquidada: d.data().liquidada ?? false
  } as Sesion));
};

export const cobrarSesion = async (
  sesionId: string, 
  cuentaDestino: CuentaDestino, 
  metodoPago: MetodoPago, 
  numeroComprobante: string
) => {
  const docRef = doc(db, 'sesiones', sesionId);
  await updateDoc(docRef, {
    estadoPago: 'Cobrado',
    cuentaDestino,
    metodoPago,
    numeroComprobante: numeroComprobante.trim() || 'Cobro registrado',
    fechaCobro: obtenerFechaHoraActual()
  });
};

export const rectificarSesion = async (sesionId: string, datos: Partial<Sesion>) => {
  const docRef = doc(db, 'sesiones', sesionId);
  await updateDoc(docRef, datos);
};

// Liquidación de los viernes: 60% profesional y 40% retención CIAP
export const liquidarSesionesProfesional = async (
  sesionesIds: string[],
  profesional: { id: string; nombre: string; porcentaje: number },
  montoTotalRecaudado: number,
  montoNetoLiquidado: number,
  cuentaSalida: CuentaDestino,
  numeroComprobante: string
) => {
  const timestampHumano = obtenerFechaHoraActual();

  for (const sId of sesionesIds) {
    const sesionRef = doc(db, 'sesiones', sId);
    await updateDoc(sesionRef, {
      liquidada: true,
      fechaLiquidacion: timestampHumano
    });
  }

  const retencionCiap = montoTotalRecaudado - montoNetoLiquidado;
  const docGastoRef = await addDoc(collection(db, 'gastos'), {
    concepto: 'Honorarios Profesionales',
    importe: montoNetoLiquidado,
    cuentaSalida,
    profesionalId: profesional.id,
    profesionalNombre: profesional.nombre,
    notaDetalle: `Liquidación honorarios ${profesional.nombre} (60% de $${montoTotalRecaudado.toLocaleString('es-AR')}). Retención CIAP 40%: $${retencionCiap.toLocaleString('es-AR')}. Comp: ${numeroComprobante || 'Transf. Viernes'}`,
    fechaRegistro: timestampHumano,
    fechaIso: new Date().toISOString(),
    creadoEn: serverTimestamp()
  });

  return docGastoRef.id;
};

// --- SERVICIOS DE GASTOS ---
export const guardarGasto = async (
  gasto: Omit<Gasto, 'id' | 'fechaRegistro' | 'fechaIso'>
) => {
  const timestampHumano = obtenerFechaHoraActual();
  const docRef = await addDoc(collection(db, 'gastos'), {
    ...gasto,
    fechaRegistro: timestampHumano,
    fechaIso: new Date().toISOString(),
    creadoEn: serverTimestamp()
  });
  return docRef.id;
};

export const obtenerGastos = async (): Promise<Gasto[]> => {
  const snapshot = await getDocs(collection(db, 'gastos'));
  return snapshot.docs.map(d => ({
    id: d.id,
    ...d.data()
  } as Gasto));
};

export const actualizarGasto = async (id: string, datos: Partial<Gasto>) => {
  const docRef = doc(db, 'gastos', id);
  await updateDoc(docRef, datos);
};

// --- SERVICIOS DE TALLERES DE MEMORIA (VIERNES, 1:30 HS) ---
export const guardarTallerMemoria = async (taller: any) => {
  const timestampHumano = obtenerFechaHoraActual();
  const docRef = await addDoc(collection(db, 'talleres_memoria'), {
    ...taller,
    duracion: '1:30 hs',
    fechaRegistro: timestampHumano,
    creadoEn: serverTimestamp()
  });
  return docRef.id;
};

export const obtenerTalleresMemoria = async (): Promise<TallerMemoria[]> => {
  const snapshot = await getDocs(collection(db, 'talleres_memoria'));
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as TallerMemoria));
};

export const cobrarTallerMemoria = async (
  tallerId: string, 
  cuentaDestino: CuentaDestino, 
  metodoPago: MetodoPago, 
  numeroComprobante: string
) => {
  const docRef = doc(db, 'talleres_memoria', tallerId);
  await updateDoc(docRef, {
    estadoPago: 'Cobrado',
    cuentaDestino,
    metodoPago,
    numeroComprobante: numeroComprobante.trim() || 'Cobro taller en el día',
    fechaCobro: obtenerFechaHoraActual()
  });
};

// --- RESET / LIMPIEZA TOTAL PARA ENTREGA AL CLIENTE ---
export const resetearDatosPrueba = async () => {
  const colecciones = ['pacientes', 'sesiones', 'gastos', 'talleres_memoria'];

  for (const nombreCol of colecciones) {
    const snapshot = await getDocs(collection(db, nombreCol));
    for (const d of snapshot.docs) {
      await deleteDoc(doc(db, nombreCol, d.id));
    }
  }
};

// --- MÓDULO PRIVADO Y EXCLUSIVO DIRECCIÓN / DUEÑA ---
export interface MovimientoDireccion {
  id: string;
  tipo: 'Ingreso' | 'Egreso';
  subtipo: 'Paciente Propio' | 'Retiro CIAP' | 'Madre' | 'CIAP Extraordinario' | 'Cochera' | 'Deportes' | 'Supermercado' | 'Salud' | 'Salidas' | 'Varios';
  detalle: string;
  importe: number;
  fecha: string;
  fechaRegistro: string;
  cuenta?: string;
}

export const guardarMovimientoDireccion = async (
  movimiento: Omit<MovimientoDireccion, 'id' | 'fechaRegistro'>
) => {
  const timestampHumano = obtenerFechaHoraActual();
  const docRef = await addDoc(collection(db, 'privado_direccion'), {
    ...movimiento,
    fechaRegistro: timestampHumano,
    creadoEn: serverTimestamp()
  });
  return docRef.id;
};

export const obtenerMovimientosDireccion = async (): Promise<MovimientoDireccion[]> => {
  const snapshot = await getDocs(collection(db, 'privado_direccion'));
  return snapshot.docs.map(d => ({
    id: d.id,
    ...d.data()
  } as MovimientoDireccion));
};

export const eliminarMovimientoDireccion = async (id: string) => {
  const docRef = doc(db, 'privado_direccion', id);
  await deleteDoc(docRef);
};