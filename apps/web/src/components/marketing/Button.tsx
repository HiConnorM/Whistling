import { forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * Marketing button. Shape-locked to the 8px (rounded-md) radius.
 * - primary: charcoal fill + white text (WCAG AA on white)
 * - accent: coral fill + white text (used only where labels are large/bold)
 * - ghost: hairline outline over the canvas
 */
export const buttonVariants = cva(
  'inline-flex select-none items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap transition-[transform,background-color,border-color,color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
        accent: 'bg-brand text-brand-foreground hover:bg-brand/90',
        ghost:
          'border border-border bg-transparent text-foreground hover:border-foreground/25 hover:bg-secondary/60',
      },
      size: {
        md: 'h-11 px-5 text-sm',
        lg: 'h-14 px-8 text-base',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
)
Button.displayName = 'Button'
