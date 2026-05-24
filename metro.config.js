const { getDefaultConfig } = require("expo/metro-config")
const { withNativeWind } = require("nativewind/metro")
const path = require("path")

const config = getDefaultConfig(__dirname)

// Exclude the admin/ portal from Metro's watch to prevent NativeWind
// from picking up admin/package.json and looking for a tailwind config there.
config.watchFolders = (config.watchFolders || [])
config.resolver = config.resolver || {}
config.resolver.blockList = [
  ...(config.resolver.blockList ? (Array.isArray(config.resolver.blockList) ? config.resolver.blockList : [config.resolver.blockList]) : []),
  new RegExp(`^${path.join(__dirname, "admin").replace(/\\/g, "/")}.*`),
]

module.exports = withNativeWind(config, { input: "./global.css" })
