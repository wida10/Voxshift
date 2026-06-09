import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api.js';

export function useVoices() {
  const [voices, setVoices]   = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchVoices = useCallback(async () => {
    try {
      const { data } = await api.get('/api/voices');
      setVoices(data);
    } catch (e) {
      console.error('[useVoices]', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchVoices(); }, [fetchVoices]);

  return { voices, loading, refetch: fetchVoices };
}
