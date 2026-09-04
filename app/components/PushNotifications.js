"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase";

export default function PushNotifications({ dogId }) {
    const [supported, setSupported] = useState(false);
    const [permission, setPermission] = useState("default");
    const [enabled, setEnabled] = useState(false);
    const [loading, setLoading] = useState(false);
    const [testing, setTesting] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        if (
            typeof window !== "undefined" &&
            "serviceWorker" in navigator &&
            "PushManager" in window &&
            "Notification" in window
        ) {
            setSupported(true);
            setPermission(Notification.permission);
        }
    }, []);

    async function enablePushNotifications() {
        try {
            setLoading(true);
            setMessage("");

            if (!supported) {
                setMessage(
                    "Push notifications are not supported by this browser."
                );
                return;
            }

            const sb = createClient();

            const {
                data: { user },
            } = await sb.auth.getUser();

            if (!user) {
                setMessage("Please log in first.");
                return;
            }

            const { data: profile } = await sb
                .from("profiles")
                .select(
                    "subscription_plan, subscription_status"
                )
                .eq("id", user.id)
                .maybeSingle();

            const isPremium =
                profile?.subscription_plan?.toLowerCase() ===
                "premium" &&
                profile?.subscription_status?.toLowerCase() ===
                "active";

            if (!isPremium) {
                setMessage(
                    "Push notifications are available for Premium users."
                );
                return;
            }

            const result =
                await Notification.requestPermission();

            setPermission(result);

            if (result !== "granted") {
                setMessage(
                    "Notification permission was not granted."
                );
                return;
            }

            const registration =
                await navigator.serviceWorker.register(
                    "/sw.js"
                );

            const publicKey =
                process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

            if (!publicKey) {
                setMessage(
                    "Push notification configuration is missing."
                );
                return;
            }

            const existingSubscription =
                await registration.pushManager.getSubscription();

            const subscription =
                existingSubscription ||
                (await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey:
                        urlBase64ToUint8Array(publicKey),
                }));

            const subscriptionJson =
                subscription.toJSON();

            const endpoint =
                subscriptionJson.endpoint;

            const p256dh =
                subscriptionJson.keys?.p256dh;

            const auth =
                subscriptionJson.keys?.auth;

            if (!endpoint || !p256dh || !auth) {
                setMessage(
                    "Unable to create a valid push subscription."
                );
                return;
            }

            const { error } = await sb
                .from("push_subscriptions")
                .upsert(
                    {
                        user_id: user.id,
                        dog_id: dogId || null,
                        endpoint,
                        p256dh,
                        auth,
                        updated_at:
                            new Date().toISOString(),
                    },
                    {
                        onConflict: "user_id,endpoint",
                    }
                );

            if (error) {
                console.error(error);

                setMessage(
                    "Unable to save push notification settings."
                );
                return;
            }

            setEnabled(true);

            setMessage(
                "🔔 Push notifications are enabled."
            );
        } catch (error) {
            console.error(
                "PUSH SETUP ERROR:",
                error
            );

            setMessage(
                error?.message ||
                "Unable to enable push notifications."
            );
        } finally {
            setLoading(false);
        }
    }

    async function sendTestPush() {
        try {
            setTesting(true);
            setMessage("");

            const sb = createClient();

            const {
                data: { session },
            } = await sb.auth.getSession();

            if (!session?.access_token) {
                setMessage(
                    "Please log in again before sending a test notification."
                );
                return;
            }

            const response = await fetch(
                "/api/send-push",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${session.access_token}`,
                    },
                    body: JSON.stringify({
                        dogId: dogId || null,
                        title: "🐶 My First Dog",
                        message:
                            "🔔 This is a test push notification. Your Premium push notifications are working!",
                        url: "/dashboard",
                    }),
                }
            );

            const result =
                await response.json();

            if (!response.ok) {
                setMessage(
                    result?.error ||
                    "Unable to send test notification."
                );
                return;
            }

            if (result.sent > 0) {
                setMessage(
                    "✅ Test push notification sent successfully!"
                );
            } else {
                setMessage(
                    result?.message ||
                    "No push notification was sent."
                );
            }
        } catch (error) {
            console.error(
                "TEST PUSH ERROR:",
                error
            );

            setMessage(
                error?.message ||
                "Unable to send test notification."
            );
        } finally {
            setTesting(false);
        }
    }

    return (
        <div>
            <button
                type="button"
                className="btn primary"
                onClick={enablePushNotifications}
                disabled={loading}
            >
                {loading
                    ? "Enabling..."
                    : enabled
                        ? "🔔 Push Notifications Enabled"
                        : "🔔 Enable Push Notifications"}
            </button>

            {enabled && permission === "granted" && (
                <button
                    type="button"
                    className="btn"
                    onClick={sendTestPush}
                    disabled={testing}
                    style={{ marginTop: 8 }}
                >
                    {testing
                        ? "Sending..."
                        : "🔔 Send Test Push"}
                </button>
            )}

            {message && (
                <p
                    className="muted"
                    style={{ marginTop: 8 }}
                >
                    {message}
                </p>
            )}

            {!supported && (
                <p
                    className="muted"
                    style={{ marginTop: 8 }}
                >
                    Your browser does not support push notifications.
                </p>
            )}

            {permission === "denied" && (
                <p
                    className="muted"
                    style={{ marginTop: 8 }}
                >
                    Notifications are blocked in your browser settings.
                </p>
            )}
        </div>
    );
}

function urlBase64ToUint8Array(
    base64String
) {
    const padding =
        "=".repeat(
            (4 - (base64String.length % 4)) % 4
        );

    const base64 =
        (base64String + padding)
            .replace(/-/g, "+")
            .replace(/_/g, "/");

    const rawData =
        window.atob(base64);

    return Uint8Array.from(
        [...rawData].map((char) =>
            char.charCodeAt(0)
        )
    );
}