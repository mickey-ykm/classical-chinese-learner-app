import { useRef } from "react"
import { Pressable, Text, View, Animated } from "react-native"
import type { OptionKey } from "@/lib/types"
import { JianColors, JianTypography, JianRadius } from "@/components/jian"

interface Props {
  optionKey: OptionKey
  text: string
  isSelected: boolean
  isCorrect: boolean
  revealAnswer: boolean
  disabled: boolean
  onSelect: () => void
}

export default function OptionButton({
  optionKey,
  text,
  isSelected,
  isCorrect,
  revealAnswer,
  disabled,
  onSelect,
}: Props) {
  const scale = useRef(new Animated.Value(1)).current

  function onPressIn() {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start()
  }
  function onPressOut() {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()
  }

  let bgColor = JianColors.surface
  let borderColor = JianColors.line
  let textColor = JianColors.ink
  let keyBgColor = JianColors.surface2
  let keyTextColor = JianColors.ink2
  let opacity = 1

  if (revealAnswer) {
    if (isCorrect) {
      bgColor = JianColors.jadeTint
      borderColor = JianColors.jade
      textColor = JianColors.ink
      keyBgColor = JianColors.jade
      keyTextColor = JianColors.paper
    } else if (isSelected) {
      bgColor = JianColors.vermilionTint
      borderColor = JianColors.vermilion
      textColor = JianColors.ink
      keyBgColor = JianColors.vermilion
      keyTextColor = JianColors.paper
    } else {
      opacity = 0.4
    }
  } else if (isSelected) {
    bgColor = JianColors.amberTint
    borderColor = JianColors.amberBorder
    textColor = JianColors.ink
    keyBgColor = JianColors.amber
    keyTextColor = JianColors.paper
  }

  const icon = revealAnswer ? (isCorrect ? "✓" : isSelected ? "✗" : "") : ""

  return (
    <Animated.View style={{ transform: [{ scale }], opacity }}>
      <Pressable
        onPress={onSelect}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled}
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 12,
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderRadius: JianRadius.card,
          borderWidth: 2,
          borderColor,
          backgroundColor: bgColor,
          minHeight: 44
        }}
      >
        <View style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: keyBgColor,
          borderWidth: 1,
          borderColor: borderColor,
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <Text style={{
            fontFamily: JianTypography.serif,
            fontSize: JianTypography.caption,
            fontWeight: JianTypography.bold,
            color: keyTextColor
          }}>
            {optionKey}
          </Text>
        </View>
        <Text style={{
          fontFamily: JianTypography.serif,
          fontSize: JianTypography.bodySmall,
          lineHeight: 20,
          color: textColor,
          flex: 1
        }}>
          {text}
        </Text>
        {icon ? (
          <Text style={{
            fontFamily: JianTypography.serif,
            fontWeight: JianTypography.bold,
            color: textColor,
            fontSize: JianTypography.body
          }}>
            {icon}
          </Text>
        ) : null}
      </Pressable>
    </Animated.View>
  )
}
