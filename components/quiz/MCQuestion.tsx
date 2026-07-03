import React, { useState } from "react"
import { View, Text, TouchableOpacity, Pressable } from "react-native"
import Svg, { Path, Line } from "react-native-svg"
import { Mascot } from "@/components/Mascot"

interface MCOption {
  key: string
  text: string
}

interface MCQuestionProps {
  stem: string
  options: MCOption[]
  correctAnswer: string // "A" for single/true-false; "A,C,E" for multi
  selectCount: number
  points?: number
  explanation?: string
  onAnswer: (isCorrect: boolean, selected: string[], pointsEarned: number) => void
  onNext: () => void
  isLastQuestion: boolean
  partTitle?: string
  onShowArticle?: () => void
}

export default function MCQuestion({
  stem,
  options,
  correctAnswer,
  selectCount,
  points,
  explanation,
  onAnswer,
  onNext,
  isLastQuestion,
  partTitle,
  onShowArticle,
}: MCQuestionProps) {
  const [selected, setSelected] = useState<string[]>([])
  const [revealed, setRevealed] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)

  const correctSet = new Set(correctAnswer.split(",").map((k) => k.trim()))

  function toggleOption(key: string) {
    if (revealed) return
    if (isDisabled(key)) return

    setSelected((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key)
      // Prevent selecting more than required
      if (prev.length >= selectCount) return prev
      return [...prev, key]
    })
  }

  function handleSubmit() {
    if (revealed || selected.length !== selectCount) return
    const selectedSet = new Set(selected)
    const allCorrect =
      selectedSet.size === correctSet.size &&
      [...selectedSet].every((k) => correctSet.has(k))
    // Partial credit: 1 mark per correctly selected option
    const correctlySelected = selected.filter((k) => correctSet.has(k)).length
    setRevealed(true)
    setIsCorrect(allCorrect)
    onAnswer(allCorrect, selected, correctlySelected)
  }

  const maxSelected = !revealed && selected.length >= selectCount

  function isDisabled(key: string): boolean {
    if (revealed) return false
    return maxSelected && !selected.includes(key)
  }

  // Determine status for each option in revealed state
  function getOptionStatus(key: string): 'correct-selected' | 'correct-missed' | 'wrong-selected' | 'unselected' {
    if (!revealed) return 'unselected'
    const isCorrect = correctSet.has(key)
    const isSelected = selected.includes(key)

    if (isCorrect && isSelected) return 'correct-selected'
    if (isCorrect && !isSelected) return 'correct-missed'
    if (!isCorrect && isSelected) return 'wrong-selected'
    return 'unselected'
  }

  return (
    <View>
      {/* Question info card with status badge and "查看原文" button */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        backgroundColor: '#faf5ea',
        borderWidth: 1,
        borderColor: '#e7ddc9',
        borderRadius: 8,
        paddingVertical: 9,
        paddingHorizontal: 14,
        marginBottom: 11
      }}>
        <Text style={{
          fontFamily: "Georgia",
          fontSize: 13,
          color: '#6f665a'
        }}>
          {partTitle || '多選題'}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {/* Status badge */}
          {revealed ? (
            <View style={{
              paddingHorizontal: 8,
              paddingVertical: 3,
              backgroundColor: isCorrect ? '#e8f0ec' : (selected.filter(k => correctSet.has(k)).length > 0 ? '#fdf3e8' : '#f8e9e6'),
              borderWidth: 1,
              borderColor: isCorrect ? '#7a9b8d' : (selected.filter(k => correctSet.has(k)).length > 0 ? '#d4a574' : '#e5c9c2'),
              borderRadius: 3
            }}>
              <Text style={{
                fontFamily: 'Noto Sans TC',
                fontSize: 10,
                letterSpacing: 0.06 * 10,
                fontWeight: '500',
                color: isCorrect ? '#3f6b54' : (selected.filter(k => correctSet.has(k)).length > 0 ? '#8a6420' : '#b0392c')
              }}>
                {isCorrect ? '全對' : (selected.filter(k => correctSet.has(k)).length > 0 ? '部分正確' : '錯誤')}
              </Text>
            </View>
          ) : (
            <View style={{
              paddingHorizontal: 8,
              paddingVertical: 3,
              backgroundColor: '#fdf3e8',
              borderWidth: 1,
              borderColor: '#d4a574',
              borderRadius: 3
            }}>
              <Text style={{
                fontFamily: 'Noto Sans TC',
                fontSize: 10,
                letterSpacing: 0.06 * 10,
                fontWeight: '500',
                color: '#8a6420'
              }}>
                可選多項
              </Text>
            </View>
          )}

          {/* 查看原文 button */}
          {onShowArticle && (
            <Pressable
              onPress={onShowArticle}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                backgroundColor: '#fdfbf6',
                borderWidth: 1,
                borderColor: '#e5c9c2',
                borderRadius: 7,
                paddingVertical: 6,
                paddingHorizontal: 11,
                shadowColor: '#2c2722',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2
              }}
              className="active:opacity-70"
            >
              <Svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#b0392c" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <Path d="M12 6.5C10.4 5.3 8 4.5 5 4.5V17c3 0 5.4.8 7 2 1.6-1.2 4-2 7-2V4.5c-3 0-5.4.8-7 2z" />
                <Line x1="12" y1="6.5" x2="12" y2="19" />
              </Svg>
              <Text style={{
                fontFamily: "Georgia",
                fontSize: 12,
                fontWeight: '600',
                color: '#b0392c'
              }}>
                查看原文
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Question stem */}
      <Text style={{
        fontFamily: "Georgia",
        fontSize: 18,
        lineHeight: 18 * 1.7,
        color: '#2c2722',
        marginTop: 11,
        marginBottom: revealed ? 16 : 8
      }}>
        {stem}
      </Text>

      {/* Mascot (thinking state, before answer) */}
      {!revealed && (
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 10 }}>
          <Mascot mood="thinking" size={52} />
        </View>
      )}

      {/* Options */}
      <View style={{ gap: 10 }}>
        {options.map((opt) => {
          const status = getOptionStatus(opt.key)
          const isSelected = selected.includes(opt.key)

          // Styling based on state
          let borderColor = '#ded2ba'
          let borderWidth = 1
          let bgColor = '#fdfbf6'
          let textColor = '#2c2722'
          let textWeight: '400' | '600' = '400'
          let checkboxBg = 'transparent'
          let checkboxBorder = '#ded2ba'
          let checkIcon = ''
          let checkIconColor = '#fff'
          let labelText = ''
          let labelColor = '#6f665a'
          let opacity = 1

          if (!revealed) {
            // Unanswered state
            if (isSelected) {
              borderColor = '#b0392c'
              borderWidth = 1.5
              bgColor = '#f8e9e6'
              textWeight = '600'
              checkboxBg = '#b0392c'
              checkboxBorder = '#b0392c'
              checkIcon = '✓'
            }
          } else {
            // Answered state
            if (status === 'correct-selected') {
              borderColor = '#3f6b54'
              borderWidth = 1.5
              bgColor = '#e8f0ec'
              textColor = '#3f6b54'
              textWeight = '600'
              checkboxBg = '#3f6b54'
              checkboxBorder = '#3f6b54'
              checkIcon = '✓'
              labelText = '答對'
              labelColor = '#3f6b54'
            } else if (status === 'correct-missed') {
              borderColor = '#d4a574'
              borderWidth = 1.5
              bgColor = '#fdf3e8'
              textColor = '#8a6420'
              textWeight = '600'
              checkboxBorder = '#bb8a2e'
              checkIcon = '✓'
              labelText = '漏選'
              labelColor = '#8a6420'
            } else if (status === 'wrong-selected') {
              // Wrong selection - show in red/vermilion
              borderColor = '#b0392c'
              borderWidth = 1.5
              bgColor = '#f8e9e6'
              textColor = '#b0392c'
              checkboxBorder = '#b0392c'
              checkboxBg = 'transparent'
            } else {
              // Unselected options
              opacity = 0.6
            }
          }

          return (
            <TouchableOpacity
              key={opt.key}
              activeOpacity={0.7}
              onPress={() => toggleOption(opt.key)}
              disabled={revealed}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 13,
                paddingVertical: 13,
                paddingHorizontal: 14,
                borderWidth,
                borderColor,
                borderRadius: 7,
                backgroundColor: bgColor,
                opacity
              }}
            >
              {/* Checkbox */}
              <View style={{
                width: 19,
                height: 19,
                borderRadius: 5,
                backgroundColor: checkboxBg,
                borderWidth: checkboxBg === 'transparent' ? 1.6 : 1.5,
                borderColor: checkboxBorder,
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {checkIcon && (
                  <Text style={{ color: checkIconColor, fontSize: 12, fontWeight: '600' }}>
                    {checkIcon}
                  </Text>
                )}
              </View>

              {/* Option text */}
              <Text style={{
                fontFamily: "Georgia",
                fontSize: 16,
                color: textColor,
                fontWeight: textWeight,
                flex: 1
              }}>
                {opt.key}　{opt.text}
              </Text>

              {/* Label (答對/漏選) */}
              {labelText && (
                <Text style={{
                  fontFamily: 'Noto Sans TC',
                  fontSize: 11,
                  color: labelColor
                }}>
                  {labelText}
                </Text>
              )}
            </TouchableOpacity>
          )
        })}
      </View>

      {/* Explanation with mascot (after answer) */}
      {revealed && explanation && (
        <View style={{
          flexDirection: 'row',
          gap: 10,
          alignItems: 'flex-start',
          marginTop: 18
        }}>
          <View style={{ flexShrink: 0 }}>
            <Mascot mood={isCorrect ? "happy" : "sad"} size={52} />
          </View>
          <View style={{
            flex: 1,
            paddingLeft: 14,
            borderLeftWidth: 2,
            borderLeftColor: '#b0392c'
          }}>
            <Text style={{
              fontFamily: 'Noto Sans TC',
              fontSize: 11,
              letterSpacing: 0.16 * 11,
              color: '#b0392c',
              marginBottom: 6
            }}>
              解析
            </Text>
            <Text style={{
              fontFamily: "Georgia",
              fontSize: 14,
              lineHeight: 14 * 1.8,
              color: '#6f665a'
            }}>
              {explanation}
            </Text>
          </View>
        </View>
      )}

      {/* Submit/Next button */}
      <View style={{ marginTop: 18 }}>
        {!revealed ? (
          <Pressable
            onPress={handleSubmit}
            disabled={selected.length !== selectCount}
            style={{
              width: '100%',
              paddingVertical: 13,
              borderRadius: 6,
              backgroundColor: selected.length === selectCount ? '#b0392c' : '#e5c9c2',
              alignItems: 'center'
            }}
            className="active:opacity-80"
          >
            <Text style={{
              fontFamily: "Georgia",
              color: selected.length === selectCount ? '#fff' : '#b0392c',
              fontSize: 16,
              opacity: selected.length === selectCount ? 1 : 0.5
            }}>
              提交答案
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={onNext}
            style={{
              width: '100%',
              paddingVertical: 13,
              borderRadius: 6,
              backgroundColor: '#2c2722',
              alignItems: 'center'
            }}
            className="active:opacity-80"
          >
            <Text style={{
              fontFamily: "Georgia",
              color: '#f4f0e6',
              fontSize: 16
            }}>
              {isLastQuestion ? "查看成績" : "下一題　›"}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  )
}
