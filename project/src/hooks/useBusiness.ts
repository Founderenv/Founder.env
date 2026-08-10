import { useEffect, useState } from 'react';
import type { Business } from '@/types';
import { businessService } from '@/services';

export function useBusinesses() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    businessService.getAll()
      .then((data) => { if (active) { setBusinesses(data); setError(null); } })
      .catch(() => { if (active) setError('Failed to load businesses'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return { businesses, loading, error };
}

export function useBusiness(username: string | undefined) {
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!username) { setLoading(false); return; }
    let active = true;
    setLoading(true);
    businessService.getByUsername(username)
      .then((data) => {
        if (active) {
          if (data) { setBusiness(data); setError(null); }
          else setError('Business not found');
        }
      })
      .catch(() => { if (active) setError('Failed to load business'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [username]);

  return { business, loading, error };
}
