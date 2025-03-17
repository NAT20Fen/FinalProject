import * as React from "react"

const Button = React.forwardRef(({ 
  className = '',
  variant = 'primary',
  size = 'md',
  outline = false,
  ...props 
}, ref) => {
  const baseClass = outline ? 'btn-outline-' : 'btn-'
  const sizeClass = size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : ''

  return (
    <button
      className={`btn ${baseClass}${variant} ${sizeClass} ${className}`}
      ref={ref}
      {...props}
    />
  )
})

Button.displayName = "Button"

export { Button }