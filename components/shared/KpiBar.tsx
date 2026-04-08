'use client'

interface KpiItem {
  label: string
  value: number | string
  color?: string
}

interface KpiBarProps {
  items: KpiItem[]
}

export default function KpiBar({ items }: KpiBarProps) {
  return (
    <div style={{
      display: 'flex',
      gap: 8,
      padding: '12px 16px',
      borderBottom: '1px solid var(--border)',
      flexWrap: 'wrap',
    }}>
      {items.map(item => (
        <div
          key={item.label}
          style={{
            padding: '8px 14px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            flex: 1,
            minWidth: 80,
          }}
        >
          <div style={{
            fontSize: 18,
            fontWeight: 700,
            color: item.color || 'var(--accent)',
          }}>
            {item.value}
          </div>
          <div style={{
            fontSize: 10,
            color: 'var(--text-muted)',
            marginTop: 2,
          }}>
            {item.label}
          </div>
        </div>
      ))}
    </div>
  )
}
