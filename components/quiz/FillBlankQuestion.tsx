import React, { useState } from "react"
import { View, Text, TextInput, Pressable } from "react-native"
import Svg, { Path, Line } from "react-native-svg"
import type { Question, QuizAnswer } from "@/lib/types"
import { Mascot } from "@/components/Mascot"

interface Props {
  question: Question
  partTitle: string
  isFirstOfPart: boolean
  isLastQuestion: boolean
  revealAnswer: boolean
  isCorrect: boolean
  onAnswer: (result: QuizAnswer) => void
  onNext: () => void
  onShowArticle?: () => void
  userInput?: string
  onInputChange?: (text: string) => void
}

function normalise(s: string): string {
  return s.trim().toLowerCase().replace(/[。，、；：！？]/g, "")
}

export default function FillBlankQuestion({
  question,
  partTitle,
  isFirstOfPart,
  isLastQuestion,
  revealAnswer,
  isCorrect,
  onAnswer,
  onNext,
  onShowArticle,
  userInput,
  onInputChange,
}: Props) {
  const [input, setInput] = useState("")

  const handleInputChange = (text: string) => {
    setInput(text)
    onInputChange?.(text)
  }

  const displayInput = userInput !== undefined ? userInput : input

  const acceptedAnswers = question.correctAnswer.split("|").map(normalise)
  const referenceAnswer = question.correctAnswer.split("|")[0]

  function handleSubmit() {
    if (revealAnswer) return
    const correct = acceptedAnswers.includes(normalise(displayInput))
    onAnswer({
      questionId: question.id,
      selectedOption: displayInput,
      isCorrect: correct,
      pointsEarned: correct ? question.points : 0,
    } as QuizAnswer)
  }

  // Parse stem to find blank placeholder
  // If stem has "原句：" on first line, get the actual question from line 2+
  const actualStem = question.stem.includes("原句：") && question.stem.includes("\n")
    ? question.stem.split("\n").slice(1).join("\n")
    : question.stem

  // Support both ______ (6 underscores) and ___ (3 underscores) as blank placeholders
  const blankPattern = actualStem.includes("______") ? "______" : "___"
  const stemParts = actualStem.split(blankPattern)
  const hasBlank = stemParts.length > 1

  return (
    <View>
      {/* Original sentence label (if provided in stem) */}
      {question.stem.includes("原句：") && (
        <Text style={{
          fontFamily: "Georgia",
          fontSize: 14,
          color: '#6f665a',
          lineHeight: 14 * 1.8,
          marginBottom: 4
        }}>
          {question.stem.split("\n")[0]}
        </Text>
      )}

      {/* Question info card with "查看原文" button */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        backgroundColor: '#faf5ea',
        borderWidth: 1,
        borderColor: '#e7ddc9',
        borderRadius: 8,
        paddingVertical: 9,
        paddingLeft: 14,
        paddingRight: 10,
        marginBottom: 11
      }}>
        <Text style={{
          fontFamily: "Georgia",
          fontSize: 13,
          color: '#6f665a'
        }}>
          {partTitle}
        </Text>
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

      {/* Question text with inline blank */}
      <View style={{ marginBottom: revealAnswer ? 16 : 10 }}>
        <Text style={{
          fontFamily: "Georgia",
          fontSize: 18,
          lineHeight: 18 * 2,
          color: '#2c2722'
        }}>
          {hasBlank ? (
            <>
              {stemParts[0]}
              <Text style={{
                display: 'inline-block',
                minWidth: 104,
                borderBottomWidth: 2,
                borderBottomColor: revealAnswer ? (isCorrect ? '#3f6b54' : '#b0392c') : '#ded2ba',
                textAlign: 'center',
                color: revealAnswer ? (isCorrect ? '#3f6b54' : '#b0392c') : '#a59b8b',
                fontWeight: revealAnswer ? '600' : '400',
                paddingHorizontal: 8
              }}>
                {revealAnswer ? displayInput || '　　　' : (displayInput || '　　　')}
              </Text>
              {stemParts[1]}
            </>
          ) : (
            question.stem.includes("\n") ? question.stem.split("\n").slice(1).join("\n") : question.stem
          )}
        </Text>
      </View>

      {/* Mascot (thinking state, before answer) */}
      {!revealAnswer && (
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 8 }}>
          <Mascot mood="thinking" size={52} />
        </View>
      )}

      {/* Input field (unanswered state) */}
      {!revealAnswer && (
        <View style={{
          borderWidth: 1.5,
          borderColor: '#b0392c',
          borderRadius: 8,
          paddingVertical: 14,
          paddingHorizontal: 15,
          backgroundColor: '#fdfbf6',
          flexDirection: 'row',
          alignItems: 'center'
        }}>
          <TextInput
            value={displayInput}
            onChangeText={handleInputChange}
            editable={!revealAnswer}
            placeholder=""
            style={{
              fontFamily: "Georgia",
              fontSize: 16,
              color: '#2c2722',
              flex: 1,
              padding: 0
            }}
          />
          <View style={{ flex: 1 }} />
          <Text style={{
            fontFamily: "Georgia",
            fontSize: 12,
            color: '#a59b8b'
          }}>
            {displayInput.length}/20
          </Text>
        </View>
      )}

      {/* Answer feedback (answered state) */}
      {revealAnswer && (
        <View>
          {/* User's answer card */}
          <View style={{
            borderWidth: 1,
            borderColor: isCorrect ? '#7a9b8d' : '#e5c9c2',
            backgroundColor: isCorrect ? '#e8f0ec' : '#f8e9e6',
            borderRadius: 7,
            paddingVertical: 12,
            paddingHorizontal: 14,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10
          }}>
            <Text style={{
              fontFamily: "Georgia",
              fontSize: 15,
              color: isCorrect ? '#3f6b54' : '#b0392c',
              fontWeight: '600',
              flex: 1
            }}>
              你的答案：{displayInput}
            </Text>
            <Text style={{
              color: isCorrect ? '#3f6b54' : '#b0392c',
              fontSize: 16
            }}>
              {isCorrect ? '✓' : '✕'}
            </Text>
          </View>

          {/* Reference answer card */}
          <View style={{
            marginTop: 13,
            paddingVertical: 12,
            paddingHorizontal: 14,
            backgroundColor: '#fdfbf6',
            borderWidth: 1,
            borderColor: '#e7ddc9',
            borderRadius: 7
          }}>
            <Text style={{
              fontFamily: 'Noto Sans TC',
              fontSize: 11,
              letterSpacing: 0.16 * 11,
              color: '#a59b8b',
              marginBottom: 6
            }}>
              參考答案
            </Text>
            <Text style={{
              fontFamily: "Georgia",
              fontSize: 14,
              lineHeight: 14 * 1.8,
              color: '#2c2722'
            }}>
              {referenceAnswer}{question.explanation ? ` / ${question.explanation}` : ''}
            </Text>
          </View>

          {/* Explanation with mascot */}
          {question.explanation && (
            <View style={{
              flexDirection: 'row',
              gap: 10,
              alignItems: 'flex-start',
              marginTop: 13
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
                  {question.explanation}
                </Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Submit/Next button */}
      <View style={{ marginTop: 18 }}>
        {!revealAnswer ? (
          <Pressable
            onPress={handleSubmit}
            disabled={displayInput.trim().length === 0}
            style={{
              width: '100%',
              paddingVertical: 13,
              borderRadius: 6,
              backgroundColor: displayInput.trim().length > 0 ? '#b0392c' : '#e5c9c2',
              alignItems: 'center'
            }}
            className="active:opacity-80"
          >
            <Text style={{
              fontFamily: "Georgia",
              color: displayInput.trim().length > 0 ? '#fff' : '#b0392c',
              fontSize: 16,
              opacity: displayInput.trim().length > 0 ? 1 : 0.5
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
