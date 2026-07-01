// The PRAXIS brand mark (raster provided by the user), served from /public.
export function Logo({ className }: { className?: string }) {
  return <img src="/logo.png" alt="praxis" className={className} draggable={false} />;
}
