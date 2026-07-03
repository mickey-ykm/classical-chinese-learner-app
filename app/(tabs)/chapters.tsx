import { ScrollView, View, Text } from "react-native"
import { useRouter, useFocusEffect } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { useCallback, useEffect, useState } from "react"
import { getArticleIndex } from "@/lib/data"
import { subscribeToUpdates } from "@/lib/contentStore"
import { getReadArticles } from "@/lib/readProgress"
import { useAuth } from "@/hooks/useAuth"
import { fetchArticleProgress, type ArticleProgressMap } from "@/lib/articleProgress"
import UpgradeModal from "@/components/UpgradeModal"
import type { ArticleEntry } from "@/lib/types"
import {
  Button,
  Card,
  Badge,
  SegmentedControl,
  ProgressBar,
  JianColors,
  JianTypography,
  JianSpacing,
  getSerifFont,
  type SegmentOption,
} from "@/components/jian"

type SegmentType = "dse-exam" | "dse-non-exam" | "other"

function ArticleTypeBadge({ articleType }: { articleType?: string }) {
  if (articleType === "dse-exam") {
    return <Badge type="dse-exam" />
  }
  if (articleType === "dse-non-exam") {
    return <Badge type="dse-non-exam" />
  }
  return null
}

interface CardProps {
  article: ArticleEntry
  progress?: ArticleProgressMap[string]
  onStart: () => void
}

function ProgressStats({ progress, totalQuestions }: { progress?: ArticleProgressMap[string]; totalQuestions: number }) {
  if (!progress) return null

  const progressPercentage = (progress.seenCount / progress.totalInPool) * 100

  return (
    <>
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
        <Text style={{ fontFamily: JianTypography.sans, fontSize: JianTypography.caption, color: JianColors.amber,  }}>
          已完成 {progress.seenCount} / {progress.totalInPool} 題
        </Text>
        {progress.attemptCount > 0 && (
          <>
            <Text style={{ fontSize: JianTypography.caption, color: JianColors.line2 }}>·</Text>
            <Text style={{ fontFamily: JianTypography.sans, fontSize: JianTypography.caption, color: JianColors.ink2 }}>
              練習 {progress.attemptCount} 次
            </Text>
            <Text style={{ fontSize: JianTypography.caption, color: JianColors.line2 }}>·</Text>
            <Text style={{ fontFamily: JianTypography.sans, fontSize: JianTypography.caption, color: JianColors.ink2 }}>
              正確率 {progress.correctRate}%
            </Text>
          </>
        )}
      </View>
      <ProgressBar value={progressPercentage} variant="jade" height={6} style={{ marginBottom: 12 }} />
    </>
  )
}

function LessonCard({ article, progress, onStart }: CardProps) {
  const isPaid = !article.isFree

  return (
    <Card variant="default" style={{ marginBottom: JianSpacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <ArticleTypeBadge articleType={article.articleType} />
        {isPaid && <Badge type="lock" />}
      </View>
      <Text style={{ fontFamily: getSerifFont('700'), fontSize: JianTypography.heading, color: JianColors.ink, lineHeight: 24, marginBottom: 2 }}>
        {article.title}
      </Text>
      <Text style={{ fontFamily: JianTypography.sans, fontSize: JianTypography.caption, color: JianColors.ink3, marginBottom: 4 }}>
        {article.source}
      </Text>
      <Text style={{ fontFamily: JianTypography.sans, fontSize: JianTypography.caption, color: JianColors.ink3, marginBottom: 8 }}>
        共 {article.totalQuestions} 題 · {article.totalPoints} 分
      </Text>
      <ProgressStats progress={progress} totalQuestions={article.totalQuestions} />
      <Button variant="primary" size="medium" fullWidth onPress={onStart}>
        立即開始
      </Button>
    </Card>
  )
}

function ChallengeCard({ article, progress, onStart }: CardProps) {
  const isPaid = !article.isFree

  return (
    <Card variant="ink" style={{ marginBottom: JianSpacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <ArticleTypeBadge articleType={article.articleType} />
        <View style={{ backgroundColor: JianColors.amber, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 }}>
          <Text style={{ fontFamily: JianTypography.sans, color: '#ffffff', fontSize: JianTypography.tiny, fontWeight: JianTypography.bold, letterSpacing: 1.2 }}>
            章節挑戰
          </Text>
        </View>
        {isPaid && <Badge type="lock" />}
      </View>
      <Text style={{ fontFamily: getSerifFont('700'), fontSize: JianTypography.heading, color: JianColors.paper, lineHeight: 24, marginBottom: 2 }}>
        {article.title}
      </Text>
      <Text style={{ fontFamily: JianTypography.sans, fontSize: JianTypography.caption, color: JianColors.ink3, marginBottom: 4 }}>
        {article.source}
      </Text>
      <Text style={{ fontFamily: JianTypography.sans, fontSize: JianTypography.caption, color: JianColors.ink2, marginBottom: 8 }}>
        共 {article.totalQuestions} 題 · {article.totalPoints} 分
      </Text>
      <ProgressStats progress={progress} totalQuestions={article.totalQuestions} />
      <Button variant="primary" size="medium" fullWidth onPress={onStart}>
        接受挑戰
      </Button>
    </Card>
  )
}

export default function ChaptersTab() {
  const router = useRouter()
  const { user } = useAuth()
  const [segment, setSegment] = useState<SegmentType>("dse-exam")
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [allArticles, setAllArticles] = useState<ArticleEntry[]>(() => getArticleIndex())
  const [progressMap, setProgressMap] = useState<ArticleProgressMap>({})

  useFocusEffect(
    useCallback(() => {
      getReadArticles().then((ids) => setReadIds(new Set(ids)))
      setAllArticles(getArticleIndex())
      if (user && !user.is_anonymous) {
        fetchArticleProgress(user.id).then(setProgressMap).catch(() => {})
      }
    }, [user])
  )

  useEffect(() => subscribeToUpdates(() => setAllArticles(getArticleIndex())), [])

  function handleStart(article: ArticleEntry) {
    if (!article.isFree && !user) {
      setShowUpgrade(true)
      return
    }
    router.push(`/read?id=${article.id}`)
  }

  // Filter articles based on selected segment
  const filteredArticles = allArticles.filter((article) => {
    if (segment === "dse-exam") {
      return article.articleType === "dse-exam"
    } else if (segment === "dse-non-exam") {
      return article.articleType === "dse-non-exam"
    } else {
      // "other" segment: show articles explicitly typed as "other", or articles with no articleType (seed data)
      return article.articleType === "other" || !article.articleType
    }
  })

  const dseExamCount = allArticles.filter((a) => a.articleType === "dse-exam").length
  const dseNonExamCount = allArticles.filter((a) => a.articleType === "dse-non-exam").length

  const segmentOptions: SegmentOption[] = [
    { value: "dse-exam", label: "甲部指定" },
    { value: "dse-non-exam", label: "高中課文" },
    { value: "other", label: "其他範文" },
  ]

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: JianColors.paper }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}>
        <Text style={{ fontFamily: getSerifFont('700'), fontSize: JianTypography.title, color: JianColors.ink }}>
          篇章
        </Text>
        <Text style={{ fontFamily: JianTypography.sans, fontSize: JianTypography.caption, color: JianColors.ink2, marginTop: 4 }}>
          共 {allArticles.length} 篇
        </Text>
      </View>

      {/* Segmented Control */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
        <SegmentedControl options={segmentOptions} value={segment} onChange={(value) => setSegment(value as SegmentType)} />
      </View>

      {/* Info Banner - only show for DSE segments */}
      {(segment === "dse-exam" || segment === "dse-non-exam") && (
        <View style={{ paddingHorizontal: 20 }}>
          <Card variant="near-complete" style={{ marginBottom: 12 }}>
            <Text style={{ fontFamily: JianTypography.sans, fontSize: JianTypography.caption, color: JianColors.ink, lineHeight: 20 }}>
              DSE 考試共含 <Text style={{ fontWeight: '600' }}>{dseExamCount} 篇甲部指定篇章</Text>，
              <Text style={{ fontWeight: '600' }}>{dseNonExamCount} 篇高中課文</Text>。
              每次練習隨機抽出 <Text style={{ fontWeight: '600' }}>22 題</Text>，約使用{' '}
              <Text style={{ fontWeight: '600' }}>10 分鐘</Text>完成。
            </Text>
          </Card>
        </View>
      )}

      {/* Article List */}
      <ScrollView style={{ flex: 1, paddingHorizontal: 20 }} contentContainerStyle={{ paddingBottom: 32 }}>
        {filteredArticles.map((article) =>
          article.type === "challenge" ? (
            <ChallengeCard
              key={article.id}
              article={article}
              progress={progressMap[article.id]}
              onStart={() => handleStart(article)}
            />
          ) : (
            <LessonCard
              key={article.id}
              article={article}
              progress={progressMap[article.id]}
              onStart={() => handleStart(article)}
            />
          )
        )}
        {filteredArticles.length === 0 && (
          <Text style={{ fontFamily: JianTypography.sans, fontSize: JianTypography.bodySmall, color: JianColors.ink3, textAlign: 'center', marginTop: 32 }}>
            {segment === "dse-exam" && "暫無甲部指定篇章"}
            {segment === "dse-non-exam" && "暫無高中課文"}
            {segment === "other" && "暫無其他範文"}
          </Text>
        )}
      </ScrollView>
      <UpgradeModal visible={showUpgrade} onClose={() => setShowUpgrade(false)} />
    </SafeAreaView>
  )
}
