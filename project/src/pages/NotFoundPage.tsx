import { Link } from 'react-router-dom';
import { SearchX } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="mx-auto flex min-h-[65vh] max-w-lg items-center justify-center px-4 text-center">
      <div>
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-500 dark:bg-gray-900"><SearchX /></div>
        <h1 className="mt-4 text-2xl font-bold">Page unavailable</h1>
        <p className="mt-2 text-sm text-gray-500">The page may have moved or the content is unavailable.</p>
        <Link to="/" className="btn-primary mt-5">Return home</Link>
      </div>
    </div>
  );
}
