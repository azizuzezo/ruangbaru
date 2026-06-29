import { redirect } from 'next/navigation';

// Canonical privacy page is /privacy-policy.
export default function PrivacyRedirect() {
  redirect('/privacy-policy');
}
