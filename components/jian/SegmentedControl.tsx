import { View, Pressable, Text, type ViewProps } from 'react-native'
import { JianColors, JianTypography, JianRadius } from './tokens'

export interface SegmentOption {
  value: string
  label: string
}

interface SegmentedControlProps extends Omit<ViewProps, 'children'> {
  options: SegmentOption[]
  value: string
  onChange: (value: string) => void
}

export function SegmentedControl({ options, value, onChange, style, ...props }: SegmentedControlProps) {
  return (
    <View
      {...props}
      style={[
        {
          flexDirection: 'row',
          backgroundColor: JianColors.surface2,
          borderWidth: 1,
          borderColor: JianColors.line,
          borderRadius: JianRadius.input,
          padding: 3,
        },
        style,
      ]}
    >
      {options.map((option) => {
        const isSelected = option.value === value

        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => ({
              flex: 1,
              paddingVertical: 8,
              paddingHorizontal: 2,
              borderRadius: JianRadius.button,
              backgroundColor: isSelected ? JianColors.vermilion : 'transparent',
              alignItems: 'center',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text
              style={{
                fontFamily: JianTypography.serif,
                fontSize: JianTypography.label,
                fontWeight: isSelected ? JianTypography.semibold : JianTypography.regular,
                color: isSelected ? '#ffffff' : JianColors.ink2,
                textAlign: 'center',
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
