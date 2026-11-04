'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import Login from '../components/Login';
import AdminHeader from '../components/admin/AdminHeader';
import AdmisionModulo from '../components/admin/AdmisionModulo';
import GastosModulo from '../components/admin/GastosModulo';
import CajaModulo from '../components/admin/CajaModulo';
import ProfesionalesModulo from '../components/admin/ProfesionalesModulo';
import TalleresEvaluacionesModulo from '../components/admin/TalleresEvaluacionesModulo';
import DireccionPrivadaModulo from '../components/admin/DireccionPrivadaModulo';
import ProfesionalDashboard from '../components/profesional/ProfesionalDashboard';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const { user, loading } = useAuth();
  const [seccionActiva, setSeccionActiva] = useState('admision');
  const [rolUsuario, setRolUsuario] = useState<'admin' | 'profesional' | null>(null);
  const [verificandoRol, setVerificandoRol] = useState(true);

  useEffect(() => {
    const determinarRol = async () => {
      if (!user) {
        setRolUsuario(null);
        setVerificandoRol(false);
        return;
      }

      const emailNormalizado = user.email?.toLowerCase().trim() || '';

      // Cuentas con rango administrativo y de dirección
      if (
        emailNormalizado.includes('admin') || 
        emailNormalizado === 'admin@centrociap.com.ar' ||
        emailNormalizado === 'sandell661@gmail.com' ||
        emailNormalizado.includes('sandra') ||
        emailNormalizado === 'recepcion@centrociap.com.ar' ||
        emailNormalizado.includes('recepcion')
      ) {
        setRolUsuario('admin');
        setVerificandoRol(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'usuarios', user.uid));
        if (userDoc.exists() && userDoc.data()?.rol === 'admin') {
          setRolUsuario('admin');
        } else {
          setRolUsuario('profesional');
        }
      } catch (error) {
        console.error('Error verificando rol en base de datos:', error);
        setRolUsuario('profesional');
      } finally {
        setVerificandoRol(false);
      }
    };

    determinarRol();
  }, [user]);

  if (loading || verificandoRol) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F5F0]">
        <Loader2 className="w-8 h-8 animate-spin text-[#223D30]" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  // Si es psicólogo del equipo externo, entra directo a su consultorio
  if (rolUsuario === 'profesional') {
    return <ProfesionalDashboard />;
  }

  // Si Sandra o Admin abren la faceta "Mi Consultorio"
  if (seccionActiva === 'consultorio') {
    return (
      <ProfesionalDashboard 
        onVolverAdmin={() => setSeccionActiva('admision')} 
      />
    );
  }

  // Vista General de Administración
  return (
    <div className="min-h-screen bg-[#F7F5F0] text-[#1E2923] pb-12">
      <AdminHeader 
        seccionActiva={seccionActiva} 
        setSeccionActiva={setSeccionActiva} 
      />

      <main className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
        {seccionActiva === 'admision' && <AdmisionModulo />}
        {seccionActiva === 'caja' && <CajaModulo />}
        {seccionActiva === 'gastos' && <GastosModulo />}
        {seccionActiva === 'profesionales' && <ProfesionalesModulo />}
        {seccionActiva === 'talleres' && <TalleresEvaluacionesModulo />}
        {seccionActiva === 'direccion' && <DireccionPrivadaModulo />}
      </main>
    </div>
  );
}