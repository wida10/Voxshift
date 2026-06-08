import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api.js';

export function useJobs() {
  const [jobs, setJobs]       = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = useCallback(async () => {
    try {
      const { data } = await api.get('/api/jobs');
      setJobs(data);
    } catch (e) {
      console.error('[useJobs]', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  return { jobs, loading, refetch: fetchJobs };
}

export function useJobPolling(jobId) {
  const [job, setJob]         = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!jobId) {
      setJob(null);
      setLoading(true);
      return;
    }

    let timer;

    const poll = async () => {
      try {
        const { data } = await api.get(`/api/jobs/${jobId}`);
        setJob(data);
        setLoading(false);

        if (data.status === 'completed' || data.status === 'failed') return;
        timer = setTimeout(poll, 3000);
      } catch (e) {
        console.error('[useJobPolling]', e);
        timer = setTimeout(poll, 5000);
      }
    };

    poll();
    return () => clearTimeout(timer);
  }, [jobId]);

  return { job, loading };
}
