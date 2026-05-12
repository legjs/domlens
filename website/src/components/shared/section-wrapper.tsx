import { cn } from '@/lib/utils'

interface SectionWrapperProps {
  children: React.ReactNode
  className?: string
  id?: string
}

export function SectionWrapper({ children, className, id }: SectionWrapperProps) {
  return (
    <section id={id} className={cn('py-16 md:py-24', className)}>
      <div className="container mx-auto max-w-6xl px-4">{children}</div>
    </section>
  )
}
