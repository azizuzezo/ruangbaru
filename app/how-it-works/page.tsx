import { redirect } from 'next/navigation';

// Canonical how-it-works page is the Indonesian route.
export default function HowItWorksRedirect() {
  redirect('/cara-kerja');
}
