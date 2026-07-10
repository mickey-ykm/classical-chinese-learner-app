import { useEffect, useState } from "react"
import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native"
import { useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/lib/supabase"
import { getArticleIndex } from "@/lib/data"
import { JianColors, JianTypography, JianRadius, getSerifFont, ProgressBar } from "@/components/jian"

interface ExerciseSession {
  id: string
  article_id: string | null
  kind: string
  score: number
  total_points: number
  finished_at: string
  total_seconds: number | null
  expected_seconds: number | null
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
}

function formatSeconds(s: number): string {
  const totalMinutes = Math.floor(s / 60)
  const sec = s % 60
  if (totalMinutes === 0) return `${sec}秒`
  return `${totalMinutes}分${sec}秒`
}

function timeDelta(actual: number, expected: number) {
  const diff = actual - expected
  if (Math.abs(diff) < 10) return null
  if (diff > 0) {
    return { label: `慢 ${formatSeconds(diff)}`, color: JianColors.ink3 }
  } else {
    return { label: `快 ${formatSeconds(Math.abs(diff))}`, color: JianColors.jade }
  }
}

function AttemptRow({ attempt, title, onPress }: { attempt: ExerciseSession; title: string; onPress: () => void }) {
  const pct = Math.round((attempt.score / attempt.total_points) * 100)
  const progressVariant = pct >= 80 ? "jade" : pct >= 50 ? "amber" : "vermilion"
  const delta = attempt.total_seconds != null && attempt.expected_seconds != null
    ? timeDelta(attempt.total_seconds, attempt.expected_seconds)
    : null

  // Exercise type badge text
  const kindLabel =
    attempt.kind === "dse-training" ? "DSE" :
    attempt.kind === "weight-training" ? "重訓" :
    attempt.kind === "revision" ? "重溫" :
    "文章"

  return (
    <Pressable onPress={onPress} hitSlop={8}>
      {({ pressed }) => (
        <View style={{
          backgroundColor: JianColors.surface,
          borderWidth: 1,
          borderColor: JianColors.line,
          borderRadius: JianRadius.card,
          padding: 14,
          marginBottom: 9,
          opacity: pressed ? 0.7 : 1
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              <View style={{
                paddingHorizontal: 7,
                paddingVertical: 3,
                borderRadius: 3,
                backgroundColor: JianColors.surface2,
                borderWidth: 1,
                borderColor: JianColors.line2
              }}>
                <Text style={{
                  fontFamily: JianTypography.sans,
                  fontSize: 9,
                  letterSpacing: 0.5,
                  color: JianColors.ink2,
                  fontWeight: '600'
                }}>
                  {kindLabel}
                </Text>
              </View>
              <Text
                style={{
                  fontFamily: getSerifFont('600'),
                  fontSize: 15,
                  lineHeight: 22,
                  color: JianColors.ink,
                  flex: 1
                }}
                numberOfLines={1}
              >
                {title}
              </Text>
            </View>
            <Text style={{
              fontFamily: JianTypography.sans,
              fontSize: 11,
              color: JianColors.ink3
            }}>
              {formatDate(attempt.finished_at)}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <View style={{ flex: 1 }}>
              <ProgressBar value={pct} variant={progressVariant} height={5} />
            </View>
            <Text style={{
              fontFamily: JianTypography.number,
              fontSize: 13,
              fontWeight: '600',
              color: JianColors.ink2
            }}>
              {attempt.score}/{attempt.total_points}
            </Text>
          </View>

          {attempt.total_seconds != null && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{
                fontFamily: JianTypography.sans,
                fontSize: 11,
                color: JianColors.ink3
              }}>
                {formatSeconds(attempt.total_seconds)}
              </Text>
              {delta && (
                <Text style={{
                  fontFamily: JianTypography.sans,
                  fontSize: 11,
                  fontWeight: '500',
                  color: delta.color
                }}>
                  {delta.label}
                </Text>
              )}
            </View>
          )}
        </View>
      )}
    </Pressable>
  )
}

export default function ExerciseHistoryScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const [attempts, setAttempts] = useState<ExerciseSession[]>([])
  const [loading, setLoading] = useState(true)

  const articleIndex = getArticleIndex()
  const titleById = Object.fromEntries(articleIndex.map((a) => [a.id, a.title]))

  useEffect(() => {
    if (!user) return
    supabase
      .from("exercise_sessions")
      .select("id, article_id, kind, score, total_points, finished_at, total_seconds, expected_seconds")
      .eq("user_id", user.id)
      .order("finished_at", { ascending: false })
      .then(({ data }) => {
        setAttempts((data as ExerciseSession[]) ?? [])
        setLoading(false)
      })
  }, [user])

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: JianColors.paper }}>
      <ScrollView style={{ flex: 1, paddingHorizontal: 24 }} contentContainerStyle={{ paddingTop: 10, paddingBottom: 32 }}>
        {/* Header */}
        <Pressable onPress={() => router.back()} hitSlop={12}>
          {({ pressed }) => (
            <Text style={{
              fontFamily: getSerifFont('400'),
              fontSize: 14,
              lineHeight: 20,
              color: JianColors.vermilion,
              marginBottom: 18,
              opacity: pressed ? 0.7 : 1
            }}>
              ‹ 返回
            </Text>
          )}
        </Pressable>

        <Text style={{
          fontFamily: getSerifFont('700'),
          fontSize: 21,
          lineHeight: 28,
          color: JianColors.ink,
          marginBottom: 8
        }}>
          所有練習紀錄
        </Text>

        <Text style={{
          fontFamily: getSerifFont('400'),
          fontSize: 13,
          lineHeight: 22,
          color: JianColors.ink2,
          marginBottom: 18
        }}>
          查看你的完整練習歷史與表現分析。
        </Text>

        {loading ? (
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 40 }}>
            <ActivityIndicator size="large" color={JianColors.amber} />
          </View>
        ) : attempts.length === 0 ? (
          <View style={{
            backgroundColor: JianColors.surface2,
            borderWidth: 1,
            borderColor: JianColors.line,
            borderRadius: JianRadius.card,
            padding: 24,
            alignItems: 'center'
          }}>
            <Text style={{
              fontFamily: getSerifFont('400'),
              fontSize: 14,
              lineHeight: 22,
              color: JianColors.ink2,
              textAlign: 'center',
              marginBottom: 16
            }}>
              尚未完成任何練習
            </Text>
            <Pressable onPress={() => router.replace("/")} hitSlop={8}>
              {({ pressed }) => (
                <Text style={{
                  fontFamily: getSerifFont('600'),
                  fontSize: 14,
                  lineHeight: 20,
                  color: JianColors.vermilion,
                  opacity: pressed ? 0.7 : 1
                }}>
                  開始學習 →
                </Text>
              )}
            </Pressable>
          </View>
        ) : (
          <View>
            {attempts.map((attempt) => {
              // Determine title based on kind
              let title: string
              if (attempt.kind === "dse-training") {
                title = "DSE 模擬試"
              } else if (attempt.kind === "weight-training") {
                title = "重量訓練"
              } else if (attempt.kind === "revision") {
                title = "溫故知新"
              } else {
                // article-quiz: fetch article title
                title = attempt.article_id ? (titleById[attempt.article_id] ?? attempt.article_id) : "文章練習"
              }

              return (
                <AttemptRow
                  key={attempt.id}
                  attempt={attempt}
                  title={title}
                  onPress={() => router.push({ pathname: "/attempt", params: { id: attempt.id } })}
                />
              )
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
