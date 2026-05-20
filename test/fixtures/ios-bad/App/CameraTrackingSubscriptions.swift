import AVFoundation
import AppTrackingTransparency
import RevenueCat
import FirebaseAnalytics

final class RiskyFeatures {
    let apiKey = "OPENAI_API_KEY=sk-testsecretvalue1234567890"

    func useCamera() {
        _ = AVCaptureDevice.default(for: .video)
    }

    func track() {
        ATTrackingManager.requestTrackingAuthorization { _ in }
        Analytics.logEvent("opened_paywall", parameters: nil)
    }

    func configurePurchases() {
        Purchases.configure(withAPIKey: "appl_public_badapp123456")
        print("PaywallView")
    }
}
