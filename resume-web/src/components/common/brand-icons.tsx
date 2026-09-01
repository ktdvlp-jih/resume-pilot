import { cn } from '@/lib/utils';

/** Official Notion mark (monochrome, use with contrasting bg). */
export function NotionIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.47c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.886l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .841-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19.02c0 0 0 .841-1.168.841l-3.222.186c-.093-.186 0-.653.327-.746l.84-.103V11.3L7.822 11.443c-.42.047-.747.327-.747.933v4.294c-.747.466-1.402.746-2.008.746-1.495 0-1.822-.653-1.822-1.635V7.082l-1.122-.103C1.59 6.886 1.403 6.606 1.543 6.046z"
      />
    </svg>
  );
}

/** GitHub Octocat mark (monochrome via currentColor). */
export function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
      />
    </svg>
  );
}

/** Obsidian mark (simplified crystal, purple accent). */
export function ObsidianIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M12 2 3 7v10l9 5 9-5V7L12 2Zm0 2.18 6.5 3.61v7.42L12 19.82l-6.5-3.61V7.79L12 4.18ZM8.5 9.5v5l3.5 1.94 3.5-1.94v-5L12 7.56 8.5 9.5Z"
      />
    </svg>
  );
}

type BrandIconBadgeProps = {
  brand: 'notion' | 'github' | 'obsidian';
  className?: string;
};

/** Rounded badge for connect cards — readable in light and dark themes. */
export function BrandIconBadge({ brand, className }: BrandIconBadgeProps) {
  const Icon = brand === 'notion' ? NotionIcon : brand === 'github' ? GitHubIcon : ObsidianIcon;

  return (
    <div
      className={cn(
        'flex size-16 items-center justify-center rounded-2xl border bg-background shadow-sm',
        className,
      )}
    >
      <div
        className={cn(
          'flex size-10 items-center justify-center rounded-lg',
          brand === 'notion'
            ? 'bg-black text-white dark:bg-white dark:text-black'
            : brand === 'github'
              ? 'bg-muted text-foreground'
              : 'bg-violet-600 text-white',
        )}
      >
        <Icon className={brand === 'notion' ? 'size-7' : 'size-6'} />
      </div>
    </div>
  );
}
