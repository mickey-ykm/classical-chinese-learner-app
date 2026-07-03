import React, { useState, useCallback } from "react"
import { View, Text, TouchableOpacity, Pressable } from "react-native"
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
}

export default function SentenceOrderQuestion({
  question,
  partTitle,
  isFirstOfPart,
  isLastQuestion,
  revealAnswer,
  isCorrect,
  onAnswer,
  onNext,
  onShowArticle,
}: Props) {
  const tokens: string[] = question.sequenceTokens ?? []
  const correctAnswer = question.correctAnswer ?? ""

  const [shuffled] = useState<string[]>(() => [...tokens].sort(() => Math.random() - 0.5))
  const [arranged, setArranged] = useState<string[]>([])
  const [remaining, setRemaining] = useState<string[]>(shuffled)
  const [submitted, setSubmitted] = useState(false)

  const correctSeq = correctAnswer.includes(",")
    ? correctAnswer.split(",").map(t => t.trim())
    : correctAnswer.split(">").map(t => t.trim())

  const handlePickToken = useCallback(
    (token: string, index: number) => {
      if (submitted) return
      setArranged((prev) => [...prev, token])
      setRemaining((prev) => prev.filter((_, i) => i !== index))
    },
    [submitted]
  )

  const handleRemoveToken = useCallback(
    (index: number) => {
      if (submitted) return
      const token = arranged[index]
      setRemaining((prev) => [...prev, token])
      setArranged((prev) => prev.filter((_, i) => i !== index))
    },
    [arranged, submitted]
  )

  const handleSubmit = useCallback(() => {
    if (arranged.length !== tokens.length || submitted) return
    const correct = arranged.join(">") === correctSeq.join(">")
    setSubmitted(true)
    const result: QuizAnswer = {
      questionId: question.id,
      selectedOption: arranged.join(">"), // Store the user's arranged sequence here
      isCorrect: correct,
      pointsEarned: correct ? question.points : 0,
    }
    onAnswer(result)
  }, [arranged, tokens.length, correctSeq, submitted, question, onAnswer])

  return (
    <View>
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

      {/* Question stem */}
      <Text style={{
        fontFamily: "Georgia",
        fontSize: 18,
        lineHeight: 18 * 1.7,
        color: '#2c2722',
        marginTop: 11,
        marginBottom: 8
      }}>
        {question.stem}
      </Text>

      {/* Mascot (thinking state, before answer) */}
      {!submitted && (
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 10 }}>
          <Mascot mood="thinking" size={52} />
        </View>
      )}

      {/* Instructions */}
      <Text style={{
        fontFamily: "Georgia",
        fontSize: 13,
        color: '#6f665a',
        marginBottom: 8
      }}>
        點按字詞加入答案，點已選字詞可移回。
      </Text>

      {/* Section label: 已排列順序 */}
      <Text style={{
        fontFamily: 'Noto Sans TC',
        fontSize: 12,
        color: '#6f665a',
        marginBottom: 8,
        letterSpacing: 0.08 * 12
      }}>
        已　排　列　順　序
      </Text>

      {/* Arranged tokens area */}
      <View style={{
        minHeight: 72,
        borderWidth: 1.5,
        borderColor: submitted ? (isCorrect ? '#3f6b54' : '#b0392c') : '#ded2ba',
        borderRadius: 10,
        backgroundColor: submitted ? (isCorrect ? '#e8f0ec' : '#f8e9e6') : '#fdfbf6',
        paddingVertical: 11,
        paddingHorizontal: 13,
        marginBottom: 16
      }}>
        {arranged.length === 0 ? (
          <Text style={{
            fontFamily: "Georgia",
            fontSize: 14,
            color: '#a59b8b',
            textAlign: 'center',
            lineHeight: 50
          }}>
            輕按下方字句以排列
          </Text>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {arranged.map((token, idx) => (
              <Pressable
                key={idx}
                onPress={() => !submitted && handleRemoveToken(idx)}
                disabled={submitted}
                style={{
                  width: 46,
                  height: 46,
                  borderWidth: 1,
                  borderColor: '#ded2ba',
                  backgroundColor: '#fdfbf6',
                  borderRadius: 8,
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Text style={{
                  fontFamily: "Georgia",
                  fontSize: 22,
                  color: '#2c2722'
                }}>
                  {token}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {/* Remaining tokens (unanswered state) */}
      {!submitted && remaining.length > 0 && (
        <View>
          {/* Section label: 可用字詞 */}
          <Text style={{
            fontFamily: 'Noto Sans TC',
            fontSize: 12,
            color: '#6f665a',
            marginBottom: 8,
            letterSpacing: 0.08 * 12
          }}>
            可　用　字　詞
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {remaining.map((token, idx) => (
              <Pressable
                key={idx}
                onPress={() => handlePickToken(token, idx)}
                style={{
                  width: 46,
                  height: 46,
                  borderWidth: 1,
                  borderColor: '#ded2ba',
                  backgroundColor: '#fdfbf6',
                  borderRadius: 8,
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Text style={{
                  fontFamily: "Georgia",
                  fontSize: 22,
                  color: '#2c2722'
                }}>
                  {token}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* Correct answer display (answered state, if wrong) */}
      {submitted && !isCorrect && (
        <View style={{
          paddingVertical: 12,
          paddingHorizontal: 14,
          backgroundColor: '#e8f0ec',
          borderWidth: 1,
          borderColor: '#7a9b8d',
          borderRadius: 7,
          marginBottom: 13
        }}>
          <Text style={{
            fontFamily: 'Noto Sans TC',
            fontSize: 11,
            letterSpacing: 0.16 * 11,
            color: '#3f6b54',
            marginBottom: 8
          }}>
            正確答案
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {correctSeq.map((token, idx) => (
              <View
                key={idx}
                style={{
                  width: 46,
                  height: 46,
                  borderWidth: 1,
                  borderColor: '#7a9b8d',
                  backgroundColor: '#fdfbf6',
                  borderRadius: 8,
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Text style={{
                  fontFamily: "Georgia",
                  fontSize: 22,
                  color: '#3f6b54',
                  fontWeight: '600'
                }}>
                  {token}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Explanation with mascot (after answer) */}
      {submitted && question.explanation && (
        <View style={{
          flexDirection: 'row',
          gap: 10,
          alignItems: 'flex-start',
          marginBottom: 18
        }}>
          <View style={{ flexShrink: 0 }}>
            <Mascot mood={isCorrect ? "happy" : "sad"} size={52} />
          </View>
          <View style={{
            flex: 1,
            paddingLeft: 14,
            borderLeftWidth: 2,
            borderLeftColor: isCorrect ? '#3f6b54' : '#b0392c'
          }}>
            <Text style={{
              fontFamily: 'Noto Sans TC',
              fontSize: 11,
              letterSpacing: 0.16 * 11,
              color: isCorrect ? '#3f6b54' : '#b0392c',
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

      {/* Submit/Next button */}
      <View style={{ marginTop: 18 }}>
        {!submitted ? (
          <Pressable
            onPress={handleSubmit}
            disabled={arranged.length !== tokens.length}
            style={{
              width: '100%',
              paddingVertical: 13,
              borderRadius: 6,
              backgroundColor: arranged.length === tokens.length ? '#b0392c' : '#e5c9c2',
              alignItems: 'center'
            }}
            className="active:opacity-80"
          >
            <Text style={{
              fontFamily: "Georgia",
              color: arranged.length === tokens.length ? '#fff' : '#b0392c',
              fontSize: 16,
              opacity: arranged.length === tokens.length ? 1 : 0.5
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
