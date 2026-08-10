import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { qrService } from '@/services';
import { LoadingSpinner, ErrorState } from '@/components/ui/States';

export function QRRedirect() {
  const { code = '' } = useParams();
  const [username, setUsername] = useState<string | null>();

  useEffect(() => {
    qrService.getByCode(code.toUpperCase()).then((business) => setUsername(business?.username ?? null));
  }, [code]);

  if (username === undefined) return <div className="flex min-h-screen items-center justify-center"><LoadingSpinner size={32} /></div>;
  if (username === null) return <div className="flex min-h-screen items-center justify-center p-4"><ErrorState title="QR code unavailable" description="This code is invalid or the business is unavailable." /></div>;
  return <Navigate to={`/business/${username}`} replace />;
}
