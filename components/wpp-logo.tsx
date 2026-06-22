interface WppLogoProps {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'dots' | 'text' | 'full'
}

export function WppLogo({ size = 'md', variant = 'full' }: WppLogoProps) {
  const sizes = {
    sm: { dot: 3, gap: 1.5, scale: 0.5 },
    md: { dot: 5, gap: 2.5, scale: 0.75 },
    lg: { dot: 7, gap: 3.5, scale: 1 },
  }
  const s = sizes[size]

  // Each letter is a 5x7 grid of dots (1 = filled, 0 = empty)
  const W = [
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,0,1,0,1],
    [1,0,1,0,1],
    [1,1,0,1,1],
    [1,1,0,1,1],
    [0,1,0,1,0],
  ]
  const P = [
    [1,1,1,1,0],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,1,1,1,0],
    [1,0,0,0,0],
    [1,0,0,0,0],
    [1,0,0,0,0],
  ]

  const letterWidth = (s.dot + s.gap) * 5
  const letterHeight = (s.dot + s.gap) * 7
  const letterGap = s.dot * 3
  const totalWidth = letterWidth * 3 + letterGap * 2
  const totalHeight = letterHeight

  const renderLetter = (grid: number[][], offsetX: number) =>
    grid.flatMap((row, ri) =>
      row.map((cell, ci) =>
        cell ? (
          <circle
            key={`${ri}-${ci}`}
            cx={offsetX + ci * (s.dot + s.gap) + s.dot / 2}
            cy={ri * (s.dot + s.gap) + s.dot / 2}
            r={s.dot / 2}
            fill="white"
          />
        ) : null
      )
    )

  const svgDots = (
    <svg
      width={totalWidth}
      height={totalHeight}
      viewBox={`0 0 ${totalWidth} ${totalHeight}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {renderLetter(W, 0)}
      {renderLetter(P, letterWidth + letterGap)}
      {renderLetter(P, (letterWidth + letterGap) * 2)}
    </svg>
  )

  if (variant === 'dots') return svgDots

  if (variant === 'text') {
    return (
      <span style={{ fontWeight: 700, letterSpacing: '0.05em', color: 'white' }}>
        WPP Commerce
      </span>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
      {svgDots}
      {size !== 'sm' && (
        <span style={{
          color: 'rgba(255,255,255,0.8)',
          fontSize: size === 'lg' ? 13 : 11,
          fontWeight: 500,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
        }}>
          Commerce
        </span>
      )}
    </div>
  )
}
