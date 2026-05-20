import AppTrackingTransparency

func askForTracking() {
    ATTrackingManager.requestTrackingAuthorization { _ in }
}
