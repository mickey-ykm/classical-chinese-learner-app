import { Tabs } from "expo-router"
import { Text } from "react-native"

function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
  )
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#fafaf9",
          borderTopColor: "#e2e8f0",
        },
        tabBarActiveTintColor: "#d97706",
        tabBarInactiveTintColor: "#94a3b8",
        tabBarLabelStyle: {
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
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" label="首頁" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="chapters"
        options={{
          title: "篇章",
          tabBarIcon: ({ focused }) => <TabIcon emoji="📖" label="篇章" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="practice"
        options={{
          title: "操練",
          tabBarIcon: ({ focused }) => <TabIcon emoji="⚡" label="操練" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "帳戶",
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" label="帳戶" focused={focused} />,
        }}
      />
    </Tabs>
  )
}
