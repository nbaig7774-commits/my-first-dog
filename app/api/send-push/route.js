import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

export async function POST(request) {
    try {
        // --------------------------------------------------
        // 1. Check VAPID configuration
        // --------------------------------------------------
        const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
        const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
        const vapidSubject = process.env.VAPID_SUBJECT;

        if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
            return Response.json(
                {
                    success: false,
                    error: "VAPID configuration is missing.",
                },
                { status: 500 }
            );
        }

        webpush.setVapidDetails(
            vapidSubject,
            vapidPublicKey,
            vapidPrivateKey
        );

        // --------------------------------------------------
        // 2. Authenticate the logged-in Supabase user
        // --------------------------------------------------
        const authorization = request.headers.get("authorization");

        if (!authorization?.startsWith("Bearer ")) {
            return Response.json(
                {
                    success: false,
                    error: "Authentication required.",
                },
                { status: 401 }
            );
        }

        const accessToken = authorization.replace("Bearer ", "").trim();

        if (!accessToken) {
            return Response.json(
                {
                    success: false,
                    error: "Authentication required.",
                },
                { status: 401 }
            );
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey =
            process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

        const serviceRoleKey =
            process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (
            !supabaseUrl ||
            !supabaseAnonKey ||
            !serviceRoleKey
        ) {
            return Response.json(
                {
                    success: false,
                    error: "Supabase server configuration is missing.",
                },
                { status: 500 }
            );
        }

        // Client used only to verify the user's access token.
        const supabaseAuth = createClient(
            supabaseUrl,
            supabaseAnonKey
        );

        const {
            data: { user },
            error: authError,
        } = await supabaseAuth.auth.getUser(accessToken);

        if (authError || !user) {
            console.error("AUTH ERROR:", authError);

            return Response.json(
                {
                    success: false,
                    error: "Invalid or expired authentication.",
                },
                { status: 401 }
            );
        }

        // IMPORTANT:
        // We use the authenticated user's ID.
        // We do NOT accept userId from the request body.
        const userId = user.id;

        // --------------------------------------------------
        // 3. Read request data
        // --------------------------------------------------
        const body = await request.json();

        const {
            dogId,
            title,
            message,
            url = "/dashboard",
        } = body;

        if (!title || !message) {
            return Response.json(
                {
                    success: false,
                    error: "title and message are required.",
                },
                { status: 400 }
            );
        }

        // --------------------------------------------------
        // 4. Create privileged Supabase client
        // --------------------------------------------------
        const supabaseAdmin = createClient(
            supabaseUrl,
            serviceRoleKey
        );

        // --------------------------------------------------
        // 5. Verify Premium + active subscription
        // --------------------------------------------------
        const { data: profile, error: profileError } =
            await supabaseAdmin
                .from("profiles")
                .select(
                    "subscription_plan, subscription_status"
                )
                .eq("id", userId)
                .maybeSingle();

        if (profileError) {
            console.error("PROFILE ERROR:", profileError);

            return Response.json(
                {
                    success: false,
                    error: "Unable to verify subscription.",
                },
                { status: 500 }
            );
        }

        const isPremium =
            profile?.subscription_plan?.toLowerCase() ===
            "premium" &&
            profile?.subscription_status?.toLowerCase() ===
            "active";

        if (!isPremium) {
            return Response.json(
                {
                    success: false,
                    error:
                        "Push notifications are available for Premium users only.",
                },
                { status: 403 }
            );
        }

        // --------------------------------------------------
        // 6. If dogId was supplied, verify that the dog
        //    belongs to the authenticated user
        // --------------------------------------------------
        if (dogId) {
            const { data: dog, error: dogError } =
                await supabaseAdmin
                    .from("dogs")
                    .select("id")
                    .eq("id", dogId)
                    .eq("owner_id", userId)
                    .maybeSingle();

            if (dogError) {
                console.error("DOG ERROR:", dogError);

                return Response.json(
                    {
                        success: false,
                        error: "Unable to verify dog.",
                    },
                    { status: 500 }
                );
            }

            if (!dog) {
                return Response.json(
                    {
                        success: false,
                        error:
                            "You are not authorized to send notifications for this dog.",
                    },
                    { status: 403 }
                );
            }
        }

        // --------------------------------------------------
        // 7. Load push subscriptions
        // --------------------------------------------------
        let query = supabaseAdmin
            .from("push_subscriptions")
            .select("id, endpoint, p256dh, auth")
            .eq("user_id", userId);

        if (dogId) {
            query = query.eq("dog_id", dogId);
        }

        const {
            data: subscriptions,
            error: subscriptionError,
        } = await query;

        if (subscriptionError) {
            console.error(
                "SUBSCRIPTION ERROR:",
                subscriptionError
            );

            return Response.json(
                {
                    success: false,
                    error:
                        "Unable to load push subscriptions.",
                },
                { status: 500 }
            );
        }

        if (
            !subscriptions ||
            subscriptions.length === 0
        ) {
            return Response.json({
                success: true,
                sent: 0,
                removed: 0,
                message:
                    "No push subscriptions found.",
            });
        }

        // --------------------------------------------------
        // 8. Send notification
        // --------------------------------------------------
        const payload = JSON.stringify({
            title,
            body: message,
            url,
        });

        let sent = 0;
        let removed = 0;
        const errors = [];

        for (const subscription of subscriptions) {
            try {
                await webpush.sendNotification(
                    {
                        endpoint: subscription.endpoint,
                        keys: {
                            p256dh: subscription.p256dh,
                            auth: subscription.auth,
                        },
                    },
                    payload
                );

                sent++;
            } catch (error) {
                console.error(
                    "PUSH SEND ERROR:",
                    error
                );

                errors.push({
                    subscriptionId: subscription.id,
                    statusCode:
                        error?.statusCode || null,
                    message:
                        error?.message ||
                        "Push notification failed.",
                });

                // Remove expired/invalid subscriptions.
                if (
                    error?.statusCode === 404 ||
                    error?.statusCode === 410
                ) {
                    await supabaseAdmin
                        .from("push_subscriptions")
                        .delete()
                        .eq("id", subscription.id);

                    removed++;
                }
            }
        }

        // --------------------------------------------------
        // 9. Return result
        // --------------------------------------------------
        return Response.json({
            success: true,
            sent,
            removed,
            errors,
        });
    } catch (error) {
        console.error(
            "SEND PUSH ERROR:",
            error
        );

        return Response.json(
            {
                success: false,
                error:
                    error?.message ||
                    "Unable to send push notification.",
            },
            { status: 500 }
        );
    }
}