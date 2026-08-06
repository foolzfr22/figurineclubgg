export const FREE_SHIPPING_THRESHOLD = 5000;

export function calculateShipping(subtotal: number, state: string, city: string): number {
  if (subtotal >= FREE_SHIPPING_THRESHOLD) return 0;

  const stateLower = state.toLowerCase().trim();
  const cityLower = city.toLowerCase().trim();

  if (cityLower === 'kolkata' || cityLower === 'kolkata ') {
    return 60;
  }

  if (stateLower === 'west bengal' || stateLower === 'westbengal' || stateLower === 'w.b.') {
    return 80;
  }

  return 130;
}

export function formatShipping(shipping: number): string {
  return shipping === 0 ? 'FREE' : `Rs. ${shipping}`;
}
