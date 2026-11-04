export type RolUsuario = 'admin' | 'profesional';

export interface Usuario {
  uid: string;
  email: string;
  nombre: string;
  rol: RolUsuario;
  profesionalId?: string;
}

export type Modalidad = 'Presencial' | 'Virtual';
export type EstadoPaciente = 'En Admisión' | 'Activo' | 'De Alta' | 'Pausa';

export interface NotaHistorial {
  id: string;
  texto: string;
  fechaHora: string;
}

export interface Paciente {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  telefono: string;
  modalidad: Modalidad;
  diasAtencion?: string; // Días pactados o solicitados (ej: Lunes y Miércoles)
  profesionalId: string;
  profesionalNombre?: string;
  estado: EstadoPaciente;
  fechaCreacion: string;
  fechaRegistroFormateada: string;
  motivoConsulta?: string;
  historialNotas: NotaHistorial[];
  disponibilidadHoraria?: string;
  cobertura?: string;
}

export type CuentaDestino = 'Santander' | 'Banco Ciudad' | 'Mercado Pago' | 'Efectivo';
export type MetodoPago = 'Transferencia' | 'Débito' | 'Crédito' | 'Efectivo';
export type EstadoPago = 'Pendiente' | 'Cobrado';

// Tipo de servicio clínico
export type TipoServicio = 'Sesion' | 'Psicodiagnostico' | 'TallerMemoria';

// Estructura de Sesión y Evaluación Clínica
export interface Sesion {
  id: string;
  pacienteId: string;
  pacienteNombre: string;
  profesionalId: string;
  profesionalNombre: string;
  fecha: string;
  hora: string;
  modalidad: Modalidad;
  importe: number;
  estadoPago: EstadoPago;
  tipoServicio?: TipoServicio; // 'Sesion' o 'Psicodiagnostico'
  etapaCobro?: 'Total' | '50% Inicial' | '50% Final';
  cuentaDestino?: CuentaDestino;
  metodoPago?: MetodoPago;
  numeroComprobante?: string;
  fechaCobro?: string;
  fechaRegistro: string;
  fechaIso: string;
  liquidada?: boolean;
  fechaLiquidacion?: string;
}

// Módulo Talleres de la Memoria (Viernes, 1:30 hs)
export interface TallerMemoria {
  id: string;
  nombreCompleto: string;
  edad: number;
  telefono: string;
  fechaViernes: string;
  duracion: string; // Fijo 1:30 hs
  importe: number;
  estadoPago: EstadoPago;
  cuentaDestino?: CuentaDestino;
  metodoPago?: MetodoPago;
  numeroComprobante?: string;
  fechaCobro?: string;
  fechaRegistro: string;
}

export interface Gasto {
  id: string;
  concepto: string;
  importe: number;
  cuentaSalida: CuentaDestino;
  notaDetalle?: string;
  fechaRegistro: string;
  fechaIso: string;
  profesionalId?: string;
  profesionalNombre?: string;
  esPrivadoDireccion?: boolean; // Para el módulo exclusivo de la dueña
}

// Entidad de Profesional con 60% fijo
export interface Profesional {
  id: string;
  nombre: string;
  email?: string;
  especialidad: string;
  diasAtencion: string;
  horarios: string;
  modalidad: 'Presencial y Virtual' | 'Solo Presencial' | 'Solo Virtual';
  porcentajeHonorarios: number; // Siempre 60%
  creadoEn?: string;
}