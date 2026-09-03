export const PLANS = {
    NONE: "none",
    BASIC: "basic",
    PREMIUM: "premium",
    PRO: "pro_family",
};

export function hasBasicAccess(plan) {
    return (
        plan === PLANS.BASIC ||
        plan === PLANS.PREMIUM ||
        plan === PLANS.PRO
    );
}

export function hasPremiumAccess(plan) {
    return (
        plan === PLANS.PREMIUM ||
        plan === PLANS.PRO
    );
}

export function hasProAccess(plan) {
    return plan === PLANS.PRO;
}

export function canAccess(plan, feature) {
    switch (feature) {
        // Basic features
        case "dog_profile":
        case "health":
        case "vaccinations":
        case "medications":
        case "routines":
        case "appointments":
        case "basic_ai":
            return hasBasicAccess(plan);

        // Premium features
        case "detailed_profile":
        case "advanced_health":
        case "health_trends":
        case "advanced_ai":
        case "document_scanner":
        case "veterinarian":
        case "vet_report":
        case "care_score":
        case "email_notifications":
        case "push_notifications":
            return hasPremiumAccess(plan);

        // Pro features
        case "family_sharing":
        case "unlimited_documents":
        case "expense_tracking":
        case "insurance_reports":
        case "priority_support":
            return hasProAccess(plan);

        default:
            return false;
    }
}