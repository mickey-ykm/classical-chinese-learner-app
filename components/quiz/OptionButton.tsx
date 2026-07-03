import { useRef } from "react"
import { Pressable, Text, View, Animated } from "react-native"
import type { OptionKey } from "@/lib/types"
import { JianColors, JianTypography, JianRadius, getSerifFont } from "@/components/jian"

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

  // Detect if this is a true/false question
  const isTrueFalse = text === '正確' || text === '錯誤' ||
                       text.includes('(True)') || text.includes('(False)') ||
                       text === '是' || text === '否'

  let bgColor = JianColors.surface
  let borderColor = JianColors.line2
  let borderWidth = 1
  let textColor = JianColors.ink
  let textWeight: '400' | '600' | '700' = '400'
  let textDecoration: 'none' | 'line-through' = 'none'
  let radioStyle: 'empty' | 'filled' | 'filledSolid' = 'empty'
  let radioBorderColor = JianColors.line2
  let radioBorderWidth = 1.6
  let radioFillColor = JianColors.vermilion
  let label = ''
  let labelColor = JianColors.ink2
  let icon = ''
  let iconColor = JianColors.ink
  let opacity = 1

  if (revealAnswer) {
    if (isCorrect) {
      // Correct answer: jade theme
      bgColor = JianColors.jadeTint
      borderColor = JianColors.jade
      borderWidth = 1.5
      textColor = JianColors.jade
      textWeight = '600'
      radioStyle = 'filledSolid'
      radioFillColor = JianColors.jade
      label = '正解'
      labelColor = JianColors.jade
      icon = '✓'
      iconColor = JianColors.jade
    } else if (isSelected) {
      // Wrong answer: vermilion theme with strikethrough
      bgColor = JianColors.vermilionTint
      borderColor = JianColors.vermilion
      borderWidth = 1.5
      textColor = JianColors.vermilion
      textDecoration = 'line-through'
      radioStyle = 'empty'
      radioBorderColor = JianColors.vermilion
      radioBorderWidth = 1.6
      label = '你的答案'
      labelColor = JianColors.vermilion
      icon = '✕'
      iconColor = JianColors.vermilion
    } else {
      // Other options: dimmed
      opacity = 0.55
    }
  } else if (isSelected) {
    // Selected but not submitted: vermilion theme
    bgColor = JianColors.vermilionTint
    borderColor = JianColors.vermilion
    borderWidth = 1.5
    textWeight = '600'
    radioStyle = 'filled'
    radioBorderColor = JianColors.vermilion
    radioFillColor = JianColors.vermilion
  }

  // Radio button rendering
  let radioElement
  if (radioStyle === 'empty') {
    radioElement = (
      <View style={{
        width: 19,
        height: 19,
        borderRadius: 9.5,
        borderWidth: radioBorderWidth,
        borderColor: radioBorderColor,
        flexShrink: 0
      }} />
    )
  } else if (radioStyle === 'filled') {
    radioElement = (
      <View style={{
        width: 19,
        height: 19,
        borderRadius: 9.5,
        borderWidth: 5,
        borderColor: radioFillColor,
        backgroundColor: '#fff',
        flexShrink: 0
      }} />
    )
  } else {
    // filledSolid
    radioElement = (
      <View style={{
        width: 19,
        height: 19,
        borderRadius: 9.5,
        borderWidth: 5,
        borderColor: radioFillColor,
        backgroundColor: '#fff',
        flexShrink: 0
      }} />
    )
  }

  return (
    <Animated.View style={{ transform: [{ scale }], opacity }}>
      <Pressable
        onPress={onSelect}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 13,
          paddingHorizontal: 14,
          paddingVertical: 13,
          borderRadius: 7,
          borderWidth,
          borderColor,
          backgroundColor: bgColor
        }}
      >
        {radioElement}
        <Text style={{
          fontFamily: getSerifFont(textWeight),
          fontSize: 16,
          color: textColor,
          flex: 1,
          textDecorationLine: textDecoration
        }}>
          {isTrueFalse ? text : `${optionKey}　${text}`}
        </Text>
        {label ? (
          <Text style={{
            fontFamily: JianTypography.sans,
            fontSize: 11,
            color: labelColor
          }}>
            {label}
          </Text>
        ) : null}
        {icon ? (
          <Text style={{
            color: iconColor,
            fontSize: 16
          }}>
            {icon}
          </Text>
        ) : null}
      </Pressable>
    </Animated.View>
  )
}
