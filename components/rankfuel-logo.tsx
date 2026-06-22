interface RankFuelLogoProps {
  // 'light' = for dark backgrounds (white wordmark); 'dark' = for light backgrounds
  variant?: 'light' | 'dark'
  iconSize?: number
  wordmark?: boolean
  byline?: boolean
  wordmarkSize?: number
}

export function RankFuelLogo({
  variant = 'light',
  iconSize = 32,
  wordmark = true,
  byline = false,
  wordmarkSize,
}: RankFuelLogoProps) {
  const rankColor = variant === 'light' ? '#ffffff' : '#1a1a2e'
  const fuelColor = variant === 'light' ? '#C4B5FD' : '#5C27D9'
  const bylineColor = variant === 'light' ? 'rgba(255,255,255,0.6)' : '#9ca3af'
  const wm = wordmarkSize ?? Math.round(iconSize * 0.72)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: Math.round(iconSize * 0.34) }}>
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="RankFuel"
        style={{ flexShrink: 0, display: 'block' }}
      >
        <defs>
          <linearGradient id="rfGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#5C27D9" />
            <stop offset="1" stopColor="#7B4FE0" />
          </linearGradient>
        </defs>
        <rect width="100" height="100" rx="24" fill="url(#rfGrad)" />
        <polygon points="56,20 30,56 47,56 42,80 70,40 53,40" fill="#ffffff" />
      </svg>

      {wordmark && (
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
          <span style={{ fontWeight: 800, fontSize: wm, letterSpacing: '-0.5px' }}>
            <span style={{ color: rankColor }}>Rank</span>
            <span style={{ color: fuelColor }}>Fuel</span>
          </span>
          {byline && (
            <span style={{
              fontSize: Math.max(9, Math.round(wm * 0.3)),
              color: bylineColor,
              fontWeight: 600,
              letterSpacing: '0.1em',
              marginTop: 4,
              textTransform: 'uppercase',
            }}>
              by WPP Commerce
            </span>
          )}
        </div>
      )}
    </div>
  )
}
