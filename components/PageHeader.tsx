import type { ReactNode } from 'react'
import { type LucideIcon } from 'lucide-react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  icon: LucideIcon
  gradientFrom: string
  gradientTo: string
  accentColor: string
  actions?: ReactNode
}

export default function PageHeader({
  title,
  subtitle,
  icon: Icon,
  gradientFrom,
  gradientTo,
  accentColor,
  actions,
}: PageHeaderProps) {
  return (
    <div
      className="mb-6 overflow-hidden rounded-xl"
      style={{ background: `linear-gradient(135deg, ${gradientFrom} 0%, ${gradientTo} 100%)` }}
    >
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg"
            style={{
              background: `${accentColor}22`,
              border: `1px solid ${accentColor}44`,
            }}
          >
            <Icon size={20} style={{ color: accentColor }} />
          </div>
          <div>
            <h1
              className="m-0 text-[17px] font-extrabold leading-tight tracking-tight text-white"
              style={{ fontFamily: 'var(--font-manrope), sans-serif' }}
            >
              {title}
            </h1>
            {subtitle && (
              <p className="m-0 mt-[2px] text-[11px] text-white/50">{subtitle}</p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-2">{actions}</div>
        )}
      </div>
    </div>
  )
}
