import { View, Pressable, Text, type ViewProps } from 'react-native'

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
          backgroundColor: '#faf5ea',
          borderWidth: 1,
          borderColor: '#e7ddc9',
          borderRadius: 8,
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
            style={{
              flex: 1,
              paddingVertical: 8,
              paddingHorizontal: 2,
              borderRadius: 6,
              backgroundColor: isSelected ? '#b0392c' : 'transparent',
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontFamily: isSelected ? 'NotoSerifTC_600SemiBold' : 'NotoSerifTC_400Regular',
                fontSize: 11,
                color: isSelected ? '#ffffff' : '#6f665a',
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
