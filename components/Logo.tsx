import { Image } from "expo-image"

interface LogoProps {
  size?: number;
}

export function Logo({ size = 100 }: LogoProps) {
  return (
    <Image
      source={require("@/assets/images/logo.png")}
      style={{ width: size, height: size }}
      contentFit="contain"
    />
  )
}
