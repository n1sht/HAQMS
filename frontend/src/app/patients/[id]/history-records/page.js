'use client';

import { useState, useEffect, use } from 'react';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/common/Navbar';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, FileText, Calendar, User, Phone, Mail, Printer, AlertCircle, RefreshCw, Activity, Heart, ShieldAlert
} from 'lucide-react';
import Link from 'next/link';

export default function HistoryRecordsPage({ params }) {
  const unwrappedParams = use(params);
  const patientId = unwrappedParams.id;
  
  const { token, API_BASE_URL, user } = useAuth();
  const router = useRouter();

  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Protect Route: Redirect if not logged in
  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  const fetchPatientData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/patients/${patientId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        throw new Error('Failed to retrieve clinical history records.');
      }
      const data = await res.json();
      setPatient(data);
      setError('');
    } catch (err) {
      console.error('History Fetch Error:', err);
      setError(err.message || 'An error occurred while fetching patient details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && patientId) {
      fetchPatientData();
    }
  }, [token, patientId]);

  const handlePrint = () => {
    window.print();
  };

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 printing-container">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto p-6 sm:p-8 space-y-8">
        
        {/* Navigation Breadcrumb (hidden when printing) */}
        <div className="flex justify-between items-center no-print">
          <Link 
            href="/dashboard" 
            className="inline-flex items-center gap-2 text-sm font-extrabold text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>

          <button
            onClick={handlePrint}
            disabled={loading || error || !patient}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-teal-500 hover:bg-slate-800 dark:hover:bg-teal-400 text-white dark:text-slate-950 font-extrabold text-xs rounded-xl shadow-md transition-all no-print disabled:opacity-50"
          >
            <Printer className="h-3.5 w-3.5" />
            Print Record
          </button>
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <RefreshCw className="h-8 w-8 text-teal-500 animate-spin" />
            <p className="mt-4 text-sm font-semibold text-slate-400">Fetching legacy diagnostic reports...</p>
          </div>
        ) : error ? (
          /* Error Alert Banner */
          <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-start gap-4">
            <AlertCircle className="h-6 w-6 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-extrabold text-md">Failed to Load Patient File</h3>
              <p className="text-xs font-semibold mt-1 opacity-90">{error}</p>
              <button 
                onClick={fetchPatientData}
                className="mt-3 text-xs font-bold underline hover:opacity-85"
              >
                Try Re-fetching
              </button>
            </div>
          </div>
        ) : !patient ? (
          <div className="text-center py-20 text-slate-400">
            <ShieldAlert className="h-12 w-12 mx-auto text-amber-500 mb-4" />
            <p className="text-sm font-bold">No patient record found.</p>
          </div>
        ) : (
          /* Patient History Content */
          <div className="space-y-8 animate-fade-in">
            
            {/* Header Banner */}
            <div className="glass p-6 sm:p-8 rounded-3xl shadow-lg border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
              <div className="absolute right-0 top-0 h-48 w-48 bg-radial-gradient(circle, rgba(20,184,166,0.06) 0%, transparent 70%) pointer-events-none"></div>
              
              <div className="flex items-center gap-4">
                <div className="p-4 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-2xl">
                  <FileText className="h-8 w-8" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-100">
                      {patient.name}
                    </h1>
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xxs font-extrabold text-slate-500 uppercase tracking-wider">
                      Patient File
                    </span>
                  </div>
                  <p className="text-xs font-mono text-slate-400 mt-1.5 flex items-center gap-1.5">
                    <span className="font-semibold">ID:</span> {patient.id}
                  </p>
                </div>
              </div>

              <div className="bg-slate-500/5 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800/80 text-xs flex flex-col gap-1.5 font-semibold text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-teal-600" />
                  <span>Registered: {new Date(patient.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                </div>
              </div>
            </div>

            {/* Main Info Columns */}
            <div className="grid gap-8 md:grid-cols-3">
              
              {/* Demographics Card */}
              <div className="glass p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md h-fit space-y-5">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800 pb-2">
                  Demographic Details
                </h3>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500">
                      <User className="h-4 w-4" />
                    </div>
                    <div className="text-xs">
                      <p className="text-slate-400 font-bold uppercase tracking-wider text-xxs">Age / Gender</p>
                      <p className="font-extrabold text-sm text-slate-800 dark:text-slate-200 mt-0.5">
                        {patient.age} years / <span className="capitalize">{patient.gender}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500">
                      <Phone className="h-4 w-4" />
                    </div>
                    <div className="text-xs">
                      <p className="text-slate-400 font-bold uppercase tracking-wider text-xxs">Primary Phone</p>
                      <p className="font-extrabold text-sm text-slate-800 dark:text-slate-200 mt-0.5">{patient.phoneNumber}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500">
                      <Mail className="h-4 w-4" />
                    </div>
                    <div className="text-xs">
                      <p className="text-slate-400 font-bold uppercase tracking-wider text-xxs">Email Address</p>
                      <p className="font-extrabold text-sm text-slate-800 dark:text-slate-200 mt-0.5 truncate max-w-[200px]">
                        {patient.email || 'None registered'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Medical History & Diagnostic Notes */}
              <div className="md:col-span-2 space-y-6">
                <div className="glass p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                    <Heart className="h-4 w-4 text-rose-500" />
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">
                      Clinical Anamnesis & Records
                    </h3>
                  </div>

                  <div className="p-5 rounded-2xl bg-teal-500/5 border border-teal-500/10 min-h-[120px]">
                    {patient.medicalHistory ? (
                      <p className="text-slate-800 dark:text-slate-200 text-sm leading-6 font-semibold whitespace-pre-wrap">
                        {patient.medicalHistory}
                      </p>
                    ) : (
                      <p className="text-slate-400 italic text-sm font-semibold flex items-center justify-center h-20">
                        No previous medical anamnesis recorded for this patient file.
                      </p>
                    )}
                  </div>
                </div>

                {/* Consultation History */}
                <div className="glass p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                    <Activity className="h-4 w-4 text-teal-600" />
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">
                      Consultation History Registry
                    </h3>
                  </div>

                  {!patient.appointments || patient.appointments.length === 0 ? (
                    <p className="text-slate-400 italic text-xs font-semibold text-center py-6">
                      No previous consultations or scheduled appointments found in registry.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {patient.appointments.map((app) => (
                        <div 
                          key={app.id} 
                          className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-500/5 flex flex-col sm:flex-row justify-between gap-4 sm:items-center hover:border-teal-500/35 transition-colors"
                        >
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs font-black text-teal-600 dark:text-teal-400">
                                {new Date(app.appointmentDate).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                              </span>
                              <span className={`inline-flex px-1.5 py-0.5 rounded text-xxs font-extrabold uppercase tracking-wide ${app.status === 'COMPLETED' ? 'bg-teal-500/10 text-teal-600' : app.status === 'CANCELLED' ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                {app.status}
                              </span>
                            </div>
                            <div className="mt-2 text-xs">
                              <p className="font-extrabold text-slate-700 dark:text-slate-300">
                                Physician: {app.doctor?.name || 'Unassigned'}
                              </p>
                              {app.doctor && (
                                <p className="text-slate-400 font-semibold text-xxs uppercase tracking-wider mt-0.5">
                                  {app.doctor.specialization} • {app.doctor.department}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="text-xs sm:text-right sm:max-w-xs">
                            <span className="block text-slate-400 font-bold uppercase tracking-wider text-xxs">Objective</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300 block mt-0.5">
                              {app.reason || 'Routine general diagnostics check'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

            </div>

          </div>
        )}

      </main>
      
      {/* Print Styles Sheet (embedded directly for consistency) */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .glass {
            border: none !important;
            box-shadow: none !important;
            background: transparent !important;
            padding: 0 !important;
          }
          .printing-container {
            display: block !important;
            background: white !important;
            color: black !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}
