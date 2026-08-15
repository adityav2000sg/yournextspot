import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.yournextspot.app",
  appName: "YourNextSpot",
  webDir: "client/dist",
  backgroundColor: "#020410",
  loggingBehavior: "debug",
  ios: {
    backgroundColor: "#020410",
    contentInset: "automatic",
    preferredContentMode: "mobile",
    scrollEnabled: true,
    allowsLinkPreview: false,
  },
};

export default config;
