export function getMultiplierBgColor(multiplier: number): string {
  if (multiplier < 1) return 'bg-black border-2 border-[#222222]';
  if (multiplier < 2) return 'border-2 border-[#5a64cc] bg-gradient-to-b from-[#1D2BB9] to-[#0D1BB3]'; // blue
  if (multiplier < 10) return 'border-2 border-[#612a96] bg-gradient-to-b from-[#5500b1] to-[#24004b]'; // purple
  return 'border-2 border-[#d44d41] bg-gradient-to-b from-[#e41d0b] to-[#ba1d0f]'; // red
}
