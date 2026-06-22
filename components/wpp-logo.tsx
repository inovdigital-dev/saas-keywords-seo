import Image from 'next/image'

interface WppLogoProps {
  variant?: 'dark' | 'white'
  height?: number
  showCommerce?: boolean
  commerceSize?: number
}

export function WppLogo({
  variant = 'white',
  height = 32,
  showCommerce = false,
  commerceSize = 13,
}: WppLogoProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
      <Image
        src="/wpp-logo.png"
        alt="WPP"
        width={height * 3.2}
        height={height}
        style={{
          filter: variant === 'white' ? 'brightness(0) invert(1)' : 'none',
          display: 'block',
        }}
        priority
      />
      {showCommerce && (
        <span style={{
          color: variant === 'white' ? 'rgba(255,255,255,0.85)' : '#5C27D9',
          fontSize: commerceSize,
          fontWeight: 600,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
        }}>
          Commerce
        </span>
      )}
    </div>
  )
}
