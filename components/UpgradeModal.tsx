import { Modal, View, Text, Pressable, Alert } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

interface Props {
  visible: boolean
  onClose: () => void
}

const PRO_FEATURES = [
  { icon: "📚", label: "全部文章無限制閱讀" },
  { icon: "🔄", label: "複習章節 — 重溫錯誤題目" },
  { icon: "🏋️", label: "重點訓練 — 按題型專項練習" },
  { icon: "🚫", label: "無廣告，專注學習" },
]

export default function UpgradeModal({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets()

  function handleUpgrade() {
    Alert.alert("即將推出", "訂閱功能正在開發中，敬請期待！")
  }

  function handleRestore() {
    Alert.alert("即將推出", "恢復購買功能正在開發中，敬請期待！")
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/50 justify-end" onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{ paddingBottom: insets.bottom + 16 }}
          className="bg-white rounded-t-3xl px-6 pt-6"
        >
          {/* Handle bar */}
          <View className="w-10 h-1 bg-slate-200 rounded-full self-center mb-5" />

          {/* Header */}
          <View className="items-center mb-5">
            <Text className="text-3xl mb-2">⭐</Text>
            <Text className="text-xl font-bold text-slate-800">升級至 Pro</Text>
            <Text className="text-sm text-slate-500 mt-1 text-center leading-relaxed">
              解鎖全部文章及高級功能，全面提升文言文水平
            </Text>
          </View>

          {/* Feature list */}
          <View className="gap-3 mb-6">
            {PRO_FEATURES.map((f) => (
              <View key={f.label} className="flex-row items-center gap-3">
                <Text className="text-lg w-7 text-center">{f.icon}</Text>
                <Text className="text-sm text-slate-700 flex-1">{f.label}</Text>
              </View>
            ))}
          </View>

          {/* CTA */}
          <Pressable
            onPress={handleUpgrade}
            className="w-full py-4 rounded-2xl bg-amber-500 items-center active:opacity-80 mb-3"
          >
            <Text className="text-white font-bold text-base">升級 Pro</Text>
          </Pressable>

          <Pressable onPress={handleRestore} className="items-center py-2 mb-1">
            <Text className="text-slate-400 text-sm">恢復購買</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
