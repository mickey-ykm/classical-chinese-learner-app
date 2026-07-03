import { View, Text, type ViewProps } from 'react-native'
import { JianColors, JianTypography, JianRadius } from './tokens'

export type BadgeType = 'dse-exam' | 'dse-non-exam' | 'lock' | 'weakness' | 'strength'

interface BadgeProps extends Omit<ViewProps, 'children'> {
  type: BadgeType
  text?: string
}

export function Badge({ type, text, style, ...props }: BadgeProps) {
  // Get badge-specific styles and default text
  const getBadgeConfig = () => {
    switch (type) {
      case 'dse-exam':
        return {
          backgroundColor: JianColors.vermilionTint,
          borderColor: JianColors.vermilionBorder,
          textColor: JianColors.vermilion,
          defaultText: 'DSE甲部指定篇章',
        }
      case 'dse-non-exam':
        return {
          backgroundColor: JianColors.jadeTint,
          borderColor: JianColors.jadeBorder,
          textColor: JianColors.jade,
          defaultText: '高中教學課文',
        }
      case 'lock':
        return {
          backgroundColor: JianColors.amberTint,
          borderColor: JianColors.amberBorder,
          textColor: '#8a6420',
          defaultText: '⊘ 付費',
        }
      case 'weakness':
        return {
          backgroundColor: JianColors.vermilionTint,
          borderColor: JianColors.vermilionBorder,
          textColor: JianColors.vermilion,
          defaultText: '⚠ 最弱',
        }
      case 'strength':
        return {
          backgroundColor: JianColors.jadeTint,
          borderColor: JianColors.jadeBorder,
          textColor: JianColors.jade,
          defaultText: '★ 最強',
        }
    }
  }

  const config = getBadgeConfig()
  const displayText = text || config.defaultText

  return (
    <View
      {...props}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'flex-start',
          backgroundColor: config.backgroundColor,
          borderWidth: 1,
          borderColor: config.borderColor,
          borderRadius: JianRadius.badge,
          paddingVertical: 3,
          paddingHorizontal: 8,
          gap: 4,
        },
        style,
      ]}
    >
      <Text
        style={{
          fontFamily: JianTypography.sans,
          fontSize: JianTypography.tiny,
          fontWeight: JianTypography.medium,
          color: config.textColor,
          letterSpacing: 0.6,
        }}
      >
        {displayText}
      </Text>
    </View>
  )
}
