import RevenueCat
import StoreKit

final class PurchasesModel {
    let premiumEntitlement = "premium"
    let defaultOffering = "default"
    let productId = "com.example.revenueapp.monthly"

    func configure() {
        Purchases.configure(withAPIKey: "appl_public_123456789")
    }
}
