import { Pressable, Text, View, ActivityIndicator, type PressableProps } from 'react-native'
import { JianColors, JianTypography, JianRadius, getSerifFont } from './tokens'

export type ButtonVariant = 'primary' | 'ink' | 'outline' | 'ghost'
export type ButtonSize = 'small' | 'medium' | 'large'

interface ButtonProps extends Omit<PressableProps, 'children'> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  disabled?: boolean
  fullWidth?: boolean
  children: string
}

export function Button({
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  fullWidth = false,
  children,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading

  // Size styles
  const sizeStyles = {
    small: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      fontSize: JianTypography.caption,
    },
    medium: {
      paddingVertical: 12,
      paddingHorizontal: 20,
      fontSize: JianTypography.body,
    },
    large: {
      paddingVertical: 14,
      paddingHorizontal: 24,
      fontSize: JianTypography.heading,
    },
  }

  // Variant styles
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: isDisabled ? JianColors.line : JianColors.vermilion,
          color: JianColors.white,
        }
      case 'ink':
        return {
          backgroundColor: isDisabled ? JianColors.line : JianColors.ink,
          color: JianColors.paper,
        }
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: isDisabled ? JianColors.line : JianColors.vermilionBorder,
          color: isDisabled ? JianColors.ink3 : JianColors.vermilion,
        }
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          color: isDisabled ? JianColors.ink3 : JianColors.vermilion,
        }
    }
  }

  const variantStyles = getVariantStyles()
  const currentSize = sizeStyles[size]

  return (
    <Pressable
      {...props}
      disabled={isDisabled}
      style={({ pressed }) => [
        {
          borderRadius: JianRadius.button,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.8 : 1,
          ...(fullWidth && { width: '100%' }),
        },
        variantStyles,
        {
          paddingVertical: currentSize.paddingVertical,
          paddingHorizontal: currentSize.paddingHorizontal,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variantStyles.color} />
      ) : (
        <Text
          style={{
            fontFamily: getSerifFont('600'),
            fontSize: currentSize.fontSize,
            color: variantStyles.color,
          }}
        >
          {children}
        </Text>
      )}
    </Pressable>
  )
}
