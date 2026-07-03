import { View, type ViewProps } from 'react-native'
import { JianColors, JianRadius } from './tokens'

export type ProgressVariant = 'jade' | 'amber' | 'vermilion'

interface ProgressBarProps extends Omit<ViewProps, 'children'> {
  value: number // 0-100
  variant?: ProgressVariant
  height?: number
  showBackground?: boolean
}

export function ProgressBar({
  value,
  variant = 'jade',
  height = 6,
  showBackground = true,
  style,
  ...props
}: ProgressBarProps) {
  // Clamp value between 0-100
  const clampedValue = Math.max(0, Math.min(100, value))

  // Get color for variant
  const getColor = () => {
    switch (variant) {
      case 'jade':
        return JianColors.jade
      case 'amber':
        return JianColors.amber
      case 'vermilion':
        return JianColors.vermilion
    }
  }

  const color = getColor()
  const backgroundColor = showBackground ? JianColors.line : 'transparent'

  return (
    <View
      {...props}
      style={[
        {
          height,
          width: '100%',
          backgroundColor,
          borderRadius: JianRadius.full,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <View
        style={{
          height: '100%',
          width: `${clampedValue}%`,
          backgroundColor: color,
          borderRadius: JianRadius.full,
        }}
      />
    </View>
  )
}
