'use client';

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { auth } from '../lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { 
  Lock, 
  Mail, 
  Loader2, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  ArrowLeft,
  KeyRound
} from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  // Modo Recuperación de Contraseña
  const [modoRecuperar, setModoRecuperar] = useState(false);
  const [emailRecuperar, setEmailRecuperar] = useState('');
  const [enviandoRecuperacion, setEnviandoRecuperacion] = useState(false);
  const [recuperacionExitosa, setRecuperacionExitosa] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCargando(true);

    try {
      await login(email.trim().toLowerCase(), password);
    } catch (err: any) {
      console.error(err);
      setError('Credenciales incorrectas o usuario no registrado.');
    } finally {
      setCargando(false);
    }
  };

  const handleEnviarRecuperacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailRecuperar.trim()) return;

    setError('');
    setEnviandoRecuperacion(true);

    try {
      await sendPasswordResetEmail(auth, emailRecuperar.trim().toLowerCase());
      setRecuperacionExitosa(true);
    } catch (err: any) {
      console.error(err);
      setError('No encontramos ninguna cuenta asociada a este correo.');
    } finally {
      setEnviandoRecuperacion(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#F7F5F0] px-4 py-8">
      <div className="w-full max-w-md bg-white border border-[#E8E3DA] rounded-3xl shadow-sm p-7 sm:p-9 transition-all">
        
        {/* Cabecera / Identidad CIAP */}
        <div className="flex flex-col items-center mb-7">
          <div className="w-13 h-13 bg-[#223D30] text-white rounded-2xl flex items-center justify-center mb-3.5 shadow-sm font-bold text-2xl select-none">
            Ψ
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1E2923] tracking-tight">Centro CIAP</h1>
          <span className="text-[11px] font-bold tracking-widest text-[#A8532F] uppercase mt-1">
            Plataforma de Gestión Clínica
          </span>
        </div>

        {/* Mensaje de Error */}
        {error && (
          <div className="mb-5 p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-medium rounded-xl text-center">
            {error}
          </div>
        )}

        {/* VISTA 1: RECUPERACIÓN DE CONTRASEÑA */}
        {modoRecuperar ? (
          <div className="space-y-4">
            <div className="text-center mb-2">
              <h2 className="text-sm font-bold text-[#1E2923]">Recuperar Contraseña</h2>
              <p className="text-xs text-[#6F7D74] mt-1">
                Ingresá tu correo electrónico registrado y te enviaremos las instrucciones para restablecerla.
              </p>
            </div>

            {recuperacionExitosa ? (
              <div className="p-4 bg-[#EAF5EF] border border-[#BCE1CC] rounded-2xl text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-[#1E5C38] mx-auto" />
                <h3 className="text-xs font-bold text-[#1E5C38]">¡Correo enviado con éxito!</h3>
                <p className="text-[11px] text-[#2E8B57]">
                  Revisá tu bandeja de entrada (y la carpeta de spam) para restablecer tu contraseña.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setModoRecuperar(false);
                    setRecuperacionExitosa(false);
                    setError('');
                  }}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-[#223D30] hover:underline cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Volver al inicio de sesión</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleEnviarRecuperacion} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#3C4A42] mb-1">
                    Correo Electrónico
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={emailRecuperar}
                      onChange={(e) => setEmailRecuperar(e.target.value)}
                      placeholder="usuario@centrociap.com.ar"
                      className="w-full pl-10 pr-4 py-2.5 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-medium text-[#1E2923] focus:outline-none focus:ring-2 focus:ring-[#223D30] focus:bg-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={enviandoRecuperacion}
                  className="w-full py-2.5 bg-[#223D30] hover:bg-[#182C22] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {enviandoRecuperacion ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Enviando enlace...</span>
                    </>
                  ) : (
                    'Enviar Enlace de Recuperación'
                  )}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setModoRecuperar(false);
                      setError('');
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#6F7D74] hover:text-[#1E2923] cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Volver al inicio de sesión</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          /* VISTA 2: INICIO DE SESIÓN REGULAR */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#3C4A42] mb-1">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@centrociap.com.ar"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-medium text-[#1E2923] focus:outline-none focus:ring-2 focus:ring-[#223D30] focus:bg-white"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#3C4A42]">
                  Contraseña
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setEmailRecuperar(email);
                    setModoRecuperar(true);
                    setError('');
                  }}
                  className="text-[11px] font-bold text-[#A8532F] hover:underline cursor-pointer"
                >
                  ¿La olvidaste?
                </button>
              </div>

              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={mostrarPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-2.5 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs font-medium text-[#1E2923] focus:outline-none focus:ring-2 focus:ring-[#223D30] focus:bg-white"
                />
                {/* Botón del Ojo */}
                <button
                  type="button"
                  onClick={() => setMostrarPassword(!mostrarPassword)}
                  title={mostrarPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-[#1E2923] p-1 cursor-pointer transition-colors"
                >
                  {mostrarPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="w-full mt-2 py-3 bg-[#223D30] hover:bg-[#182C22] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md disabled:opacity-50 cursor-pointer"
            >
              {cargando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verificando acceso...</span>
                </>
              ) : (
                'Ingresar a la Plataforma'
              )}
            </button>
          </form>
        )}

        {/* Pie con soporte directo */}
        <div className="mt-8 pt-5 border-t border-[#F0EBE3] text-center">
          <p className="text-[11px] text-[#6F7D74]">
            En caso de olvido de clave, contactá a <strong>Dirección / Recepción</strong> para un restablecimiento inmediato.
          </p>
        </div>

      </div>
    </div>
  );
}