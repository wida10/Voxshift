import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Layout       from '../components/Layout.jsx';
import MinutesBar   from '../components/MinutesBar.jsx';
import JobCard      from '../components/JobCard.jsx';
import UpgradeModal from '../components/UpgradeModal.jsx';
import { useJobs }  from '../hooks/useJobs.js';
import api          from '../lib/api.js';

export default function Dashboard() {
  const { jobs, loading, refetch }     = useJobs();
  const [jobList, setJobList]          = useState([]);

  useEffect(() => { setJobList(jobs); }, [jobs]);
  const [profile, setProfile]          = useState(null);
  const [showUpgrade, setShowUpgrade]  = useState(false);
  const [searchParams]                 = useSearchParams();

  useEffect(() => {
    api.get('/api/users/me').then(({ data }) => setProfile(data)).catch(() => {});
  }, []);

  // Show upgrade success banner
  const upgraded = searchParams.get('upgraded') === '1';

  return (
    <Layout>
      {upgraded && (
        <div className="mb-6 bg-green-500/10 border border-green-500/30 text-green-400 text-sm px-4 py-3 rounded-lg">
          ¡Plan actualizado correctamente! Tus nuevos minutos ya están disponibles.
        </div>
      )}

      {/* Minutes */}
      {profile && (
        <MinutesBar
          used={profile.minutes_used}
          limit={profile.minutes_limit}
          plan={profile.plan}
        />
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3 mt-6">
        <Link to="/process" className="btn-primary">
          + Nuevo audio
        </Link>
        {profile?.plan === 'free' && (
          <button onClick={() => setShowUpgrade(true)} className="btn-ghost border border-border">
            Mejorar plan
          </button>
        )}
      </div>

      {/* Job history */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Historial de traducciones</h2>

        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-violet border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && jobList.length === 0 && (
          <div className="card text-center py-12 text-gray-500">
            <p className="text-4xl mb-3">🎙️</p>
            <p>No tienes traducciones aún.</p>
            <Link to="/process" className="btn-primary mt-4 inline-block text-sm">
              Crear tu primera traducción
            </Link>
          </div>
        )}

        {!loading && jobList.length > 0 && (
          <div className="flex flex-col gap-3">
            {jobList.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onDelete={(id) => setJobList((prev) => prev.filter((j) => j.id !== id))}
              />
            ))}
          </div>
        )}
      </section>

      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
    </Layout>
  );
}
