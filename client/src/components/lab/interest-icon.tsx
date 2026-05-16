/**
 * InterestIcon — branded SVG icon for a Conversation Labs interest topic.
 *
 * Replaces the per-OS emoji rendering of interest topics. Each of the 9
 * topics has its own gradient tile + custom illustration in white with
 * brand-coloured accents (amber #FCD34D, coral #FF6B6B), forming a
 * coherent visual family.
 *
 * Usage:
 *   <InterestIcon name="Travel & Adventures" size="md" />
 *
 * Falls back gracefully (slate gradient + book glyph) if the topic name
 * doesn't match the bank — important for admin-added custom topics.
 */

interface InterestIconProps {
  name: string | null | undefined;
  size?: "sm" | "md" | "lg";
  className?: string;
}

type IconEntry = {
  /** background gradient (`background:` CSS value) */
  gradient: string;
  /** inner SVG content — viewBox is 0 0 64 64, white-on-color */
  glyph: React.ReactNode;
};

const ICONS: Record<string, IconEntry> = {
  "Travel & Adventures": {
    gradient: "linear-gradient(135deg, #6366f1 0%, #33CBFB 100%)",
    glyph: (
      <>
        <circle cx="32" cy="32" r="22" stroke="white" strokeWidth="3" fill="none" />
        <ellipse cx="32" cy="32" rx="22" ry="9" stroke="white" strokeWidth="2" fill="none" opacity="0.6" />
        <line x1="32" y1="10" x2="32" y2="54" stroke="white" strokeWidth="2" opacity="0.6" />
        <circle cx="44" cy="20" r="5" fill="#FF6B6B" stroke="white" strokeWidth="2" />
        <path d="M 18 38 Q 26 30 32 36 T 44 20" stroke="#FCD34D" strokeWidth="2.5" fill="none" strokeDasharray="3 3" strokeLinecap="round" />
      </>
    ),
  },
  "Career & Work": {
    gradient: "linear-gradient(135deg, #f59e0b 0%, #f97316 100%)",
    glyph: (
      <>
        <rect x="14" y="22" width="36" height="28" rx="3" fill="white" opacity="0.95" />
        <rect x="24" y="14" width="16" height="10" rx="2" stroke="white" strokeWidth="3" fill="none" />
        <line x1="14" y1="34" x2="50" y2="34" stroke="#f59e0b" strokeWidth="2" />
        <circle cx="32" cy="34" r="2.5" fill="#f59e0b" />
      </>
    ),
  },
  "Daily Life & Relationships": {
    gradient: "linear-gradient(135deg, #10b981 0%, #06b6d4 100%)",
    glyph: (
      <>
        <circle cx="22" cy="22" r="6" fill="white" />
        <path d="M 12 46 Q 12 34 22 34 Q 32 34 32 46 Z" fill="white" />
        <circle cx="42" cy="22" r="6" fill="white" opacity="0.85" />
        <path d="M 32 46 Q 32 34 42 34 Q 52 34 52 46 Z" fill="white" opacity="0.85" />
        <path d="M 32 28 Q 28 24 30 22 Q 32 20 32 23 Q 32 20 34 22 Q 36 24 32 28 Z" fill="#FF6B6B" />
      </>
    ),
  },
  "Sports & Competition": {
    gradient: "linear-gradient(135deg, #22c55e 0%, #84cc16 100%)",
    glyph: (
      <>
        <path d="M 20 14 L 44 14 L 44 28 Q 44 38 32 40 Q 20 38 20 28 Z" fill="white" />
        <path d="M 20 18 L 14 18 Q 12 18 12 22 Q 12 28 20 30" stroke="white" strokeWidth="3" fill="none" />
        <path d="M 44 18 L 50 18 Q 52 18 52 22 Q 52 28 44 30" stroke="white" strokeWidth="3" fill="none" />
        <rect x="28" y="40" width="8" height="6" fill="white" />
        <rect x="24" y="46" width="16" height="4" rx="1" fill="white" />
        <path d="M 32 22 L 33.5 25 L 37 25 L 34 27 L 35 30 L 32 28 L 29 30 L 30 27 L 27 25 L 30.5 25 Z" fill="#FCD34D" />
      </>
    ),
  },
  "Health & Wellness": {
    gradient: "linear-gradient(135deg, #ef4444 0%, #ec4899 100%)",
    glyph: (
      <>
        <path d="M 32 50 Q 14 36 14 24 Q 14 16 22 16 Q 28 16 32 22 Q 36 16 42 16 Q 50 16 50 24 Q 50 36 32 50 Z" fill="white" />
        <path d="M 14 32 L 20 32 L 24 24 L 28 40 L 32 28 L 36 36 L 40 32 L 50 32" stroke="#ef4444" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  },
  "Technology & Future": {
    gradient: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)",
    glyph: (
      <>
        <path d="M 32 8 Q 42 14 42 32 Q 42 42 32 50 Q 22 42 22 32 Q 22 14 32 8 Z" fill="white" />
        <circle cx="32" cy="26" r="4" fill="#8b5cf6" />
        <path d="M 22 38 L 16 50 L 24 46" fill="#FCD34D" />
        <path d="M 42 38 L 48 50 L 40 46" fill="#FCD34D" />
        <path d="M 28 50 Q 30 56 32 58 Q 34 56 36 50 Z" fill="#FF6B6B" />
      </>
    ),
  },
  "Entertainment & Pop Culture": {
    gradient: "linear-gradient(135deg, #ec4899 0%, #a855f7 100%)",
    glyph: (
      <>
        <rect x="10" y="20" width="44" height="24" rx="2" fill="white" />
        <circle cx="18" cy="26" r="2" fill="#ec4899" />
        <circle cx="18" cy="38" r="2" fill="#ec4899" />
        <circle cx="46" cy="26" r="2" fill="#ec4899" />
        <circle cx="46" cy="38" r="2" fill="#ec4899" />
        <path d="M 26 26 L 26 38 L 38 32 Z" fill="#ec4899" />
      </>
    ),
  },
  "Debates & Current Events": {
    gradient: "linear-gradient(135deg, #0891b2 0%, #6366f1 100%)",
    glyph: (
      <>
        <path d="M 8 14 H 36 Q 40 14 40 18 V 32 Q 40 36 36 36 H 20 L 12 44 V 36 H 12 Q 8 36 8 32 Z" fill="white" />
        <path d="M 56 22 H 32 Q 28 22 28 26 V 40 Q 28 44 32 44 H 48 L 56 52 V 44 H 56 Q 56 44 56 40 Z" fill="white" opacity="0.85" />
        <circle cx="18" cy="25" r="2" fill="#0891b2" />
        <circle cx="24" cy="25" r="2" fill="#0891b2" />
        <circle cx="30" cy="25" r="2" fill="#0891b2" />
      </>
    ),
  },
  "Food & Lifestyle": {
    gradient: "linear-gradient(135deg, #f97316 0%, #f59e0b 100%)",
    glyph: (
      <>
        <circle cx="32" cy="36" r="18" fill="white" />
        <circle cx="32" cy="36" r="12" fill="#f97316" opacity="0.3" />
        <line x1="14" y1="14" x2="14" y2="36" stroke="white" strokeWidth="3" strokeLinecap="round" />
        <line x1="10" y1="14" x2="10" y2="22" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <line x1="18" y1="14" x2="18" y2="22" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <line x1="50" y1="14" x2="50" y2="36" stroke="white" strokeWidth="3" strokeLinecap="round" />
        <path d="M 47 14 Q 50 18 53 14" fill="white" />
      </>
    ),
  },
};

const FALLBACK: IconEntry = {
  gradient: "linear-gradient(135deg, #64748b 0%, #94a3b8 100%)",
  glyph: (
    <>
      <path d="M 16 14 H 44 Q 48 14 48 18 V 46 Q 48 50 44 50 H 20 Q 16 50 16 46 V 18 Z" fill="white" />
      <line x1="22" y1="22" x2="42" y2="22" stroke="#64748b" strokeWidth="2" />
      <line x1="22" y1="30" x2="38" y2="30" stroke="#64748b" strokeWidth="2" />
      <line x1="22" y1="38" x2="34" y2="38" stroke="#64748b" strokeWidth="2" />
    </>
  ),
};

const SIZE_CLASSES: Record<NonNullable<InterestIconProps["size"]>, { tile: string; svg: number }> = {
  sm: { tile: "w-10 h-10 rounded-xl", svg: 24 },
  md: { tile: "w-14 h-14 rounded-2xl", svg: 32 },
  lg: { tile: "w-16 h-16 rounded-2xl", svg: 36 },
};

export function InterestIcon({ name, size = "md", className = "" }: InterestIconProps) {
  const entry = (name && ICONS[name]) || FALLBACK;
  const dims = SIZE_CLASSES[size];
  return (
    <div
      className={`flex items-center justify-center flex-shrink-0 shadow-sm ${dims.tile} ${className}`}
      style={{ background: entry.gradient }}
      aria-label={name || "Topic"}
      role="img"
    >
      <svg width={dims.svg} height={dims.svg} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        {entry.glyph}
      </svg>
    </div>
  );
}

export default InterestIcon;
