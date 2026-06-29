import { redirect } from 'next/navigation';

// Canonical terms page is /terms-of-service.
export default function TermsRedirect() {
  redirect('/terms-of-service');
}
