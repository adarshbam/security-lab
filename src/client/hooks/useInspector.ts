import { useState, useEffect, useCallback } from 'react';
import { controlRequest } from '../api.js';
import type { ExperimentObservation } from '../../shared/contracts/inspector.js';

export function useInspector(experimentId?: string) {
  const [observations, setObservations] = useState<ExperimentObservation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const query = experimentId ? '?experimentId=' + encodeURIComponent(experimentId) : '';
  const refresh = useCallback(async () => {
    setIsLoading(true);
    try { setObservations(await controlRequest('/api/inspector/read' + query)); setError(''); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setIsLoading(false); }
  }, [query]);
  useEffect(() => {
    setObservations([]);
    refresh();
    const timer = setInterval(refresh, 1500);
    return () => clearInterval(timer);
  }, [refresh]);
  const clearLogs = async () => {
    try { await controlRequest('/api/inspector/clear' + query); setObservations([]); setError(''); }
    catch (e) { setError(String(e)); }
  };
  return { observations: observations.filter(o => !experimentId || o.experimentId === experimentId),
    isLoading, error, refresh, clearLogs };
}
