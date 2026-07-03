import { View, type ViewProps } from 'react-native'
import { JianColors, JianRadius, JianShadows } from './tokens'

export type CardVariant = 'default' | 'surface' | 'ink' | 'locked' | 'near-complete'

interface CardProps extends ViewProps {
  variant?: CardVariant
  padding?: number | { top?: number; right?: number; bottom?: number; left?: number }
  children: React.ReactNode
}

export function Card({ variant = 'default', padding, children, style, ...props }: CardProps) {
  // Get variant-specific styles
  const getVariantStyles = () => {
    switch (variant) {
      case 'default':
        return {
          backgroundColor: JianColors.surface,
          borderWidth: 1,
          borderColor: JianColors.line,
        }
      case 'surface':
        return {
          backgroundColor: JianColors.surface2,
          borderWidth: 1,
          borderColor: JianColors.line,
        }
      case 'ink':
        return {
          backgroundColor: JianColors.ink,
          borderWidth: 1,
          borderColor: JianColors.ink,
        }
      case 'locked':
        return {
          backgroundColor: JianColors.ink,
          borderWidth: 1,
          borderColor: '#1a1614', // darker ink
        }
      case 'near-complete':
        return {
          backgroundColor: JianColors.amberTint,
          borderWidth: 1,
          borderColor: JianColors.amberBorder,
        }
    }
  }

  const variantStyles = getVariantStyles()

  // Handle padding prop
  const paddingStyle =
    typeof padding === 'number'
      ? { padding }
      : padding
      ? {
          paddingTop: padding.top,
          paddingRight: padding.right,
          paddingBottom: padding.bottom,
          paddingLeft: padding.left,
        }
      : { padding: 16 }

  return (
    <View
      {...props}
      style={[
        {
          borderRadius: JianRadius.card,
          ...variantStyles,
          ...paddingStyle,
          ...JianShadows.card,
        },
        style,
      ]}
    >
      {children}
    </View>
  )
}
