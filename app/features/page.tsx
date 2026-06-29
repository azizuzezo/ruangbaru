import { redirect } from 'next/navigation';

// Canonical features page is the Indonesian route.
export default function FeaturesRedirect() {
  redirect('/fitur');
}
