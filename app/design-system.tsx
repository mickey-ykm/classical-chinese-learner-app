import { ScrollView, View, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useState } from 'react'
import {
  Button,
  Card,
  Badge,
  SegmentedControl,
  ProgressBar,
  JianColors,
  JianTypography,
  type SegmentOption,
} from '@/components/jian'

export default function DesignSystemScreen() {
  const [segment, setSegment] = useState('option1')
  const [loading, setLoading] = useState(false)

  const segmentOptions: SegmentOption[] = [
    { value: 'option1', label: '選項一' },
    { value: 'option2', label: '選項二' },
    { value: 'option3', label: '選項三' },
  ]

  const handleLoadingTest = () => {
    setLoading(true)
    setTimeout(() => setLoading(false), 2000)
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: JianColors.paper }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {/* Header */}
        <View style={{ marginBottom: 32 }}>
          <Text
            style={{
              fontFamily: JianTypography.serif,
              fontSize: JianTypography.display,
              fontWeight: JianTypography.bold,
              color: JianColors.ink,
              marginBottom: 8,
            }}
          >
            箋 Jiān Design System
          </Text>
          <Text
            style={{
              fontFamily: JianTypography.sans,
              fontSize: JianTypography.bodySmall,
              color: JianColors.ink2,
            }}
          >
            Classical Chinese Learner App Component Library
          </Text>
        </View>

        {/* Buttons Section */}
        <Section title="Buttons">
          <ComponentRow title="Primary">
            <Button variant="primary" size="small">
              小按鈕
            </Button>
            <Button variant="primary" size="medium">
              中按鈕
            </Button>
            <Button variant="primary" size="large">
              大按鈕
            </Button>
          </ComponentRow>

          <ComponentRow title="Ink">
            <Button variant="ink" size="medium">
              墨色按鈕
            </Button>
            <Button variant="ink" size="medium" disabled>
              停用狀態
            </Button>
          </ComponentRow>

          <ComponentRow title="Outline">
            <Button variant="outline" size="medium">
              輪廓按鈕
            </Button>
            <Button variant="outline" size="medium" disabled>
              停用狀態
            </Button>
          </ComponentRow>

          <ComponentRow title="Ghost">
            <Button variant="ghost" size="medium">
              幽靈按鈕
            </Button>
            <Button variant="ghost" size="medium" disabled>
              停用狀態
            </Button>
          </ComponentRow>

          <ComponentRow title="Loading State">
            <Button variant="primary" size="medium" loading={loading} onPress={handleLoadingTest}>
              點擊測試載入
            </Button>
          </ComponentRow>

          <ComponentRow title="Full Width">
            <Button variant="primary" size="medium" fullWidth>
              全寬按鈕
            </Button>
          </ComponentRow>
        </Section>

        {/* Cards Section */}
        <Section title="Cards">
          <ComponentRow title="Default Card">
            <Card variant="default">
              <Text style={{ fontFamily: JianTypography.serif, color: JianColors.ink }}>
                預設卡片樣式 · Surface with border
              </Text>
            </Card>
          </ComponentRow>

          <ComponentRow title="Surface Card">
            <Card variant="surface">
              <Text style={{ fontFamily: JianTypography.serif, color: JianColors.ink }}>
                表面卡片樣式 · Surface2
              </Text>
            </Card>
          </ComponentRow>

          <ComponentRow title="Ink Card">
            <Card variant="ink">
              <Text style={{ fontFamily: JianTypography.serif, color: JianColors.paper }}>
                墨色卡片樣式 · Dark theme
              </Text>
            </Card>
          </ComponentRow>

          <ComponentRow title="Locked Card">
            <Card variant="locked">
              <Text style={{ fontFamily: JianTypography.serif, color: JianColors.paper }}>
                🔒 鎖定卡片樣式 · Paid content
              </Text>
            </Card>
          </ComponentRow>

          <ComponentRow title="Near Complete">
            <Card variant="near-complete">
              <Text style={{ fontFamily: JianTypography.serif, color: JianColors.ink }}>
                接近完成 · Amber highlight
              </Text>
            </Card>
          </ComponentRow>
        </Section>

        {/* Badges Section */}
        <Section title="Badges">
          <ComponentRow title="Article Types">
            <Badge type="dse-exam" />
            <Badge type="dse-non-exam" />
          </ComponentRow>

          <ComponentRow title="Status Badges">
            <Badge type="lock" />
            <Badge type="weakness" />
            <Badge type="strength" />
          </ComponentRow>

          <ComponentRow title="Custom Text">
            <Badge type="dse-exam" text="甲部" />
            <Badge type="lock" text="⊘ 需付費" />
          </ComponentRow>
        </Section>

        {/* Segmented Control Section */}
        <Section title="Segmented Control">
          <ComponentRow title="Three Options">
            <SegmentedControl options={segmentOptions} value={segment} onChange={setSegment} />
          </ComponentRow>
          <Text
            style={{
              fontFamily: JianTypography.sans,
              fontSize: JianTypography.caption,
              color: JianColors.ink2,
              marginTop: 8,
            }}
          >
            當前選擇：{segment}
          </Text>
        </Section>

        {/* Progress Bars Section */}
        <Section title="Progress Bars">
          <ComponentRow title="Jade (Success)">
            <View style={{ width: '100%' }}>
              <ProgressBar value={30} variant="jade" />
              <Text
                style={{
                  fontFamily: JianTypography.sans,
                  fontSize: JianTypography.caption,
                  color: JianColors.ink2,
                  marginTop: 4,
                }}
              >
                30% 進度
              </Text>
            </View>
          </ComponentRow>

          <ComponentRow title="Amber (Warning)">
            <View style={{ width: '100%' }}>
              <ProgressBar value={65} variant="amber" />
              <Text
                style={{
                  fontFamily: JianTypography.sans,
                  fontSize: JianTypography.caption,
                  color: JianColors.ink2,
                  marginTop: 4,
                }}
              >
                65% 進度
              </Text>
            </View>
          </ComponentRow>

          <ComponentRow title="Vermilion (Error)">
            <View style={{ width: '100%' }}>
              <ProgressBar value={95} variant="vermilion" />
              <Text
                style={{
                  fontFamily: JianTypography.sans,
                  fontSize: JianTypography.caption,
                  color: JianColors.ink2,
                  marginTop: 4,
                }}
              >
                95% 進度
              </Text>
            </View>
          </ComponentRow>

          <ComponentRow title="Different Heights">
            <View style={{ width: '100%', gap: 8 }}>
              <ProgressBar value={50} variant="jade" height={4} />
              <ProgressBar value={50} variant="jade" height={8} />
              <ProgressBar value={50} variant="jade" height={12} />
            </View>
          </ComponentRow>
        </Section>

        {/* Color Palette Section */}
        <Section title="Color Palette">
          <ColorSwatch title="Paper" color={JianColors.paper} />
          <ColorSwatch title="Surface" color={JianColors.surface} />
          <ColorSwatch title="Surface2" color={JianColors.surface2} />
          <View style={{ height: 16 }} />
          <ColorSwatch title="Ink" color={JianColors.ink} />
          <ColorSwatch title="Ink2" color={JianColors.ink2} />
          <ColorSwatch title="Ink3" color={JianColors.ink3} />
          <View style={{ height: 16 }} />
          <ColorSwatch title="Vermilion" color={JianColors.vermilion} />
          <ColorSwatch title="Jade" color={JianColors.jade} />
          <ColorSwatch title="Amber" color={JianColors.amber} />
        </Section>
      </ScrollView>
    </SafeAreaView>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 32 }}>
      <Text
        style={{
          fontFamily: JianTypography.serif,
          fontSize: JianTypography.title,
          fontWeight: JianTypography.semibold,
          color: JianColors.ink,
          marginBottom: 16,
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  )
}

function ComponentRow({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 16 }}>
      {title && (
        <Text
          style={{
            fontFamily: JianTypography.sans,
            fontSize: JianTypography.caption,
            color: JianColors.ink2,
            marginBottom: 8,
            letterSpacing: 0.6,
          }}
        >
          {title}
        </Text>
      )}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        {children}
      </View>
    </View>
  )
}

function ColorSwatch({ title, color }: { title: string; color: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
      <View
        style={{
          width: 40,
          height: 40,
          backgroundColor: color,
          borderRadius: 6,
          borderWidth: 1,
          borderColor: JianColors.line2,
          marginRight: 12,
        }}
      />
      <View>
        <Text
          style={{
            fontFamily: JianTypography.sans,
            fontSize: JianTypography.bodySmall,
            color: JianColors.ink,
            fontWeight: JianTypography.medium,
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            fontFamily: JianTypography.number,
            fontSize: JianTypography.caption,
            color: JianColors.ink3,
          }}
        >
          {color}
        </Text>
      </View>
    </View>
  )
}
