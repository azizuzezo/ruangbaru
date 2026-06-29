import { redirect } from 'next/navigation';

// Canonical pricing page is the Indonesian route.
export default function PricingRedirect() {
  redirect('/harga');
}
