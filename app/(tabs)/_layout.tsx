import { Tabs } from "expo-router"
import Svg, { Path, Rect, Line, Circle } from "react-native-svg"

function HomeIcon({ focused }: { focused: boolean }) {
  const color = focused ? "#b0392c" : "#a59b8b"
  return (
    <Svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6">
      <Path d="M4 11l8-6 8 6" />
      <Path d="M6 10v9h12v-9" />
    </Svg>
  )
}

function ChaptersIcon({ focused }: { focused: boolean }) {
  const color = focused ? "#b0392c" : "#a59b8b"
  return (
    <Svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6">
      <Rect x="5" y="4" width="14" height="16" rx="1.5" />
      <Line x1="9" y1="9" x2="15" y2="9" />
      <Line x1="9" y1="13" x2="15" y2="13" />
    </Svg>
  )
}

function PracticeIcon({ focused }: { focused: boolean }) {
  const color = focused ? "#b0392c" : "#a59b8b"
  return (
    <Svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6">
      <Circle cx="12" cy="12" r="7" />
      <Circle cx="12" cy="12" r="2.4" />
    </Svg>
  )
}

function AccountIcon({ focused }: { focused: boolean }) {
  const color = focused ? "#b0392c" : "#a59b8b"
  return (
    <Svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6">
      <Circle cx="12" cy="8" r="3.4" />
      <Path d="M5.5 20c0-4 3-6 6.5-6s6.5 2 6.5 6" />
    </Svg>
  )
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#f4f0e6",
          borderTopColor: "#e7ddc9",
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: "#b0392c",
        tabBarInactiveTintColor: "#a59b8b",
        tabBarLabelStyle: {
          fontFamily: "System",
          fontSize: 10,
          fontWeight: "600",
          marginBottom: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "首頁",
          tabBarIcon: ({ focused }) => <HomeIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="chapters"
        options={{
          title: "篇章",
          tabBarIcon: ({ focused }) => <ChaptersIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="practice"
        options={{
          title: "操練",
          tabBarIcon: ({ focused }) => <PracticeIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "帳戶",
          tabBarIcon: ({ focused }) => <AccountIcon focused={focused} />,
        }}
      />
      {/* Keep dse-training accessible for practice hub navigation */}
      <Tabs.Screen
        name="dse-training"
        options={{
          href: null, // Hide from tab bar (accessed via practice hub)
        }}
      />
    </Tabs>
  )
}
