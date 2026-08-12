import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { businessService, ownerService } from '@/services';
import type { Business } from '@/types';

/** Resolves the authenticated owner's existing public-profile surface. */
export function OwnerProfilePage() {
  const [business, setBusiness] = useState<Business | null | undefined>(undefined);

  useEffect(() => {
    void ownerService.getCurrent()
      .then((owner) => businessService.getByOwner(owner.id))
      .then((owned) => setBusiness(owned[0] ?? null))
      .catch(() => setBusiness(null));
  }, []);

  if (business === undefined) return <div className="card mx-auto max-w-feed p-8 text-center text-sm text-gray-500">Loading your business profile…</div>;
  if (!business) return <Navigate to="/business/onboarding" replace />;
  return <Navigate to={`/business/${business.username}`} replace />;
}
