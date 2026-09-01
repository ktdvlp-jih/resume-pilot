/** Purple gradient marketing surfaces — always light text regardless of theme tokens. */
export const brandSurfaceClass =
  'text-white [&_span]:text-white [&_a:not([data-slot=button])]:text-white/90 [&_a:not([data-slot=button])]:hover:text-white';

export const brandSurfaceMutedClass = 'text-white/85';
export const brandSurfaceSubtleClass = 'text-white/80';

/** CTA on purple gradient — readable in light and dark app themes. */
export const brandSurfaceActionButtonClass =
  'border-white/30 bg-white text-primary shadow-sm hover:bg-white/90 hover:text-primary dark:border-white/30 dark:bg-white dark:text-primary dark:hover:bg-white/90';
