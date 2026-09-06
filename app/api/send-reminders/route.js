import { Resend } from "resend";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

const resend = new Resend(process.env.RESEND_API_KEY);

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const FROM_EMAIL =
    process.env.RESEND_FROM_EMAIL ||
    "My First Dog <onboarding@resend.dev>";

function formatDate(value) {
    if (!value) return "Not provided";

    return new Date(value).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
    });
}

function formatSimpleDate(value) {
    if (!value) return "Not provided";

    return new Date(value).toLocaleDateString("en-US", {
        dateStyle: "medium",
    });
}

function escapeHtml(value) {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

async function notificationAlreadySent(
    ownerId,
    dogId,
    type,
    referenceId
) {
    const { data, error } = await supabaseAdmin
        .from("notification_logs")
        .select("id")
        .eq("owner_id", ownerId)
        .eq("dog_id", dogId)
        .eq("notification_type", type)
        .eq("reference_id", referenceId)
        .limit(1);

    if (error) {
        console.error("Notification log check:", error);
        return false;
    }

    return (data || []).length > 0;
}

async function saveNotificationLog(
    ownerId,
    dogId,
    type,
    referenceId
) {
    const { error } = await supabaseAdmin
        .from("notification_logs")
        .insert({
            owner_id: ownerId,
            dog_id: dogId,
            notification_type: type,
            reference_id: referenceId,
        });

    if (error) {
        console.error("Notification log save:", error);
        return false;
    }

    return true;
}

async function sendReminderEmail({
    to,
    dogName,
    subject,
    title,
    content,
}) {
    const result = await resend.emails.send({
        from: FROM_EMAIL,
        to,
        subject,

        html: `
<!DOCTYPE html>
<html>
  <body
    style="
      margin:0;
      padding:0;
      background:#f5f7fa;
      font-family:Arial,sans-serif;
    "
  >
    <div
      style="
        max-width:650px;
        margin:0 auto;
        padding:30px 15px;
      "
    >
      <div
        style="
          background:#ffffff;
          border-radius:18px;
          padding:30px;
          box-shadow:0 4px 20px rgba(0,0,0,0.06);
        "
      >
        <h1
          style="
            margin-top:0;
            margin-bottom:10px;
          "
        >
          🐶 My First Dog
        </h1>

        <p
          style="
            color:#666;
            margin-top:0;
          "
        >
          Dog Care Reminder
        </p>

        <hr />

        <h2>${escapeHtml(title)}</h2>

        <p>
          This is a reminder for
          <strong>${escapeHtml(dogName)}</strong>.
        </p>

        ${content}

        <hr
          style="
            margin-top:30px;
            margin-bottom:20px;
          "
        />

        <p
          style="
            font-size:13px;
            color:#777;
          "
        >
          This reminder is for organization
          and monitoring only. It does not
          provide veterinary diagnosis or
          replace professional veterinary advice.
        </p>

        <p
          style="
            font-size:13px;
            color:#777;
          "
        >
          🐾 My First Dog
        </p>
      </div>
    </div>
  </body>
</html>
    `,
    });

    if (result.error) {
        throw new Error(
            result.error.message ||
            "Unable to send email."
        );
    }

    return result;
}

async function sendPushNotifications({
    ownerId,
    dogId,
    title,
    message,
    url = "/dashboard",
    tag,
}) {
    if (
        !process.env.VAPID_PUBLIC_KEY ||
        !process.env.VAPID_PRIVATE_KEY ||
        !process.env.VAPID_SUBJECT
    ) {
        throw new Error(
            "VAPID environment variables are missing."
        );
    }

    webpush.setVapidDetails(
        process.env.VAPID_SUBJECT,
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );

    const {
        data: subscriptions,
        error,
    } = await supabaseAdmin
        .from("push_subscriptions")
        .select(
            "id, endpoint, p256dh, auth"
        )
        .eq("user_id", ownerId)
        .eq("dog_id", dogId);

    if (error) {
        throw new Error(
            `Unable to load push subscriptions: ${error.message}`
        );
    }

    if (!subscriptions?.length) {
        return {
            sent: 0,
            removed: 0,
            errors: [],
        };
    }

    let sent = 0;
    let removed = 0;
    const errors = [];

    const payload = JSON.stringify({
        title,
        body: message,
        url,
        tag:
            tag ||
            "my-first-dog-reminder",
        icon: "/icon-192.png",
        badge: "/icon-192.png",
    });

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
                "Push notification error:",
                error
            );

            errors.push(
                error?.message ||
                "Push notification failed."
            );

            const statusCode =
                error?.statusCode;

            if (
                statusCode === 404 ||
                statusCode === 410
            ) {
                await supabaseAdmin
                    .from("push_subscriptions")
                    .delete()
                    .eq("id", subscription.id);

                removed++;
            }
        }
    }

    return {
        sent,
        removed,
        errors,
    };
}

async function sendChannels({
    preferences,
    email,
    dog,
    notificationType,
    referenceId,
    emailData,
    pushTitle,
    pushMessage,
    pushUrl,
    pushTag,
}) {
    let emailSent = false;
    let pushSent = false;
    let pushRemoved = 0;

    const channelErrors = [];

    // ------------------------------------------
    // EMAIL
    // ------------------------------------------

    if (
        preferences.email_notifications === true
    ) {
        try {
            await sendReminderEmail({
                to: email,
                dogName: dog.name,
                ...emailData,
            });

            emailSent = true;
        } catch (error) {
            channelErrors.push(
                `Email: ${error?.message ||
                "Email sending failed."
                }`
            );
        }
    }

    // ------------------------------------------
    // PUSH
    // ------------------------------------------

    if (
        preferences.push_notifications === true
    ) {
        try {
            const pushResult =
                await sendPushNotifications({
                    ownerId: dog.owner_id,
                    dogId: dog.id,
                    title: pushTitle,
                    message: pushMessage,
                    url: pushUrl,
                    tag: pushTag,
                });

            pushSent =
                pushResult.sent > 0;

            pushRemoved =
                pushResult.removed || 0;

            if (
                pushResult.errors?.length
            ) {
                channelErrors.push(
                    ...pushResult.errors.map(
                        (error) =>
                            `Push: ${error}`
                    )
                );
            }
        } catch (error) {
            channelErrors.push(
                `Push: ${error?.message ||
                "Push sending failed."
                }`
            );
        }
    }

    const anythingSent =
        emailSent || pushSent;

    return {
        emailSent,
        pushSent,
        pushRemoved,
        anythingSent,
        channelErrors,
    };
}

export async function GET(request) {
    try {
        // ==========================================
        // SECURITY
        // ==========================================

        const cronSecret =
            process.env.CRON_SECRET;

        const authorization =
            request.headers.get(
                "authorization"
            );

        if (!cronSecret) {
            return Response.json(
                {
                    success: false,
                    error:
                        "CRON_SECRET is missing.",
                },
                {
                    status: 500,
                }
            );
        }

        if (
            authorization !==
            `Bearer ${cronSecret}`
        ) {
            return Response.json(
                {
                    success: false,
                    error: "Unauthorized",
                },
                {
                    status: 401,
                }
            );
        }

        // ==========================================
        // ENVIRONMENT CHECK
        // ==========================================

        const requiredEnvironment = [
            "RESEND_API_KEY",
            "NEXT_PUBLIC_SUPABASE_URL",
            "SUPABASE_SERVICE_ROLE_KEY",
            "VAPID_PUBLIC_KEY",
            "VAPID_PRIVATE_KEY",
            "VAPID_SUBJECT",
        ];

        const missingEnvironment =
            requiredEnvironment.filter(
                (name) =>
                    !process.env[name]
            );

        if (
            missingEnvironment.length > 0
        ) {
            return Response.json(
                {
                    success: false,
                    error:
                        "Missing environment variables.",
                    missing:
                        missingEnvironment,
                },
                {
                    status: 500,
                }
            );
        }

        // ==========================================
        // TIME
        // ==========================================

        const now = new Date();

        const appointmentEnd =
            new Date(
                now.getTime() +
                24 *
                60 *
                60 *
                1000
            );

        const vaccinationEnd =
            new Date(
                now.getTime() +
                7 *
                24 *
                60 *
                60 *
                1000
            );

        let sent = 0;
        let skipped = 0;
        let emailSent = 0;
        let pushSent = 0;
        let pushRemoved = 0;

        const errors = [];

        // ==========================================
        // LOAD DOGS
        // ==========================================

        const {
            data: dogs,
            error: dogsError,
        } = await supabaseAdmin
            .from("dogs")
            .select(
                "id, owner_id, name"
            );

        if (dogsError) {
            throw new Error(
                dogsError.message
            );
        }

        // ==========================================
        // PROCESS DOGS
        // ==========================================

        for (const dog of dogs || []) {
            try {
                // ========================================
                // PROFILE
                // ========================================

                const {
                    data: profile,
                    error: profileError,
                } = await supabaseAdmin
                    .from("profiles")
                    .select(
                        "subscription_plan, subscription_status"
                    )
                    .eq("id", dog.owner_id)
                    .single();

                if (
                    profileError ||
                    !profile
                ) {
                    skipped++;
                    continue;
                }

                // PREMIUM ONLY
                const isPremium =
                    profile.subscription_status ===
                    "active" &&
                    String(
                        profile.subscription_plan ||
                        ""
                    ).toLowerCase() ===
                    "premium";

                if (!isPremium) {
                    skipped++;
                    continue;
                }

                // ========================================
                // NOTIFICATION PREFERENCES
                // ========================================

                const {
                    data: preferences,
                    error:
                    preferencesError,
                } = await supabaseAdmin
                    .from(
                        "notification_preferences"
                    )
                    .select("*")
                    .eq("dog_id", dog.id)
                    .maybeSingle();

                if (
                    preferencesError ||
                    !preferences
                ) {
                    skipped++;
                    continue;
                }

                // Need at least one channel
                if (
                    preferences.email_notifications !==
                    true &&
                    preferences.push_notifications !==
                    true
                ) {
                    skipped++;
                    continue;
                }

                // ========================================
                // USER EMAIL
                // ========================================

                const {
                    data: userResult,
                    error: userError,
                } =
                    await supabaseAdmin.auth.admin.getUserById(
                        dog.owner_id
                    );

                if (
                    userError ||
                    !userResult?.user?.email
                ) {
                    skipped++;
                    continue;
                }

                const email =
                    userResult.user.email;

                // ========================================
                // APPOINTMENTS
                // ========================================

                if (
                    preferences.appointment_reminders ===
                    true
                ) {
                    const {
                        data: appointments,
                        error:
                        appointmentError,
                    } = await supabaseAdmin
                        .from("appointments")
                        .select(
                            `
                id,
                dog_id,
                appointment_at,
                clinic_name,
                reason,
                notes
              `
                        )
                        .eq("dog_id", dog.id)
                        .gte(
                            "appointment_at",
                            now.toISOString()
                        )
                        .lte(
                            "appointment_at",
                            appointmentEnd.toISOString()
                        )
                        .order(
                            "appointment_at",
                            {
                                ascending: true,
                            }
                        );

                    if (appointmentError) {
                        errors.push(
                            `Appointments for ${dog.name}: ${appointmentError.message}`
                        );
                    } else {
                        for (const appointment of
                            appointments || []) {
                            const type =
                                "appointment_reminder";

                            const alreadySent =
                                await notificationAlreadySent(
                                    dog.owner_id,
                                    dog.id,
                                    type,
                                    appointment.id
                                );

                            if (alreadySent) {
                                skipped++;
                                continue;
                            }

                            const result =
                                await sendChannels({
                                    preferences,
                                    email,
                                    dog,

                                    notificationType:
                                        type,

                                    referenceId:
                                        appointment.id,

                                    emailData: {
                                        subject:
                                            `📅 Appointment Reminder — ${dog.name}`,

                                        title:
                                            "📅 Upcoming Vet Appointment",

                                        content: `
                      <p>
                        <strong>Date & Time:</strong>
                        ${escapeHtml(
                                            formatDate(
                                                appointment.appointment_at
                                            )
                                        )}
                      </p>

                      <p>
                        <strong>Clinic:</strong>
                        ${escapeHtml(
                                            appointment.clinic_name ||
                                            "Not provided"
                                        )}
                      </p>

                      <p>
                        <strong>Reason:</strong>
                        ${escapeHtml(
                                            appointment.reason ||
                                            "Not provided"
                                        )}
                      </p>

                      ${appointment.notes
                                                ? `
                        <p>
                          <strong>Notes:</strong>
                          ${escapeHtml(
                                                    appointment.notes
                                                )}
                        </p>
                      `
                                                : ""
                                            }
                    `,
                                    },

                                    pushTitle:
                                        `📅 Vet Appointment — ${dog.name}`,

                                    pushMessage:
                                        `Upcoming appointment ${appointment.clinic_name
                                            ? `at ${appointment.clinic_name}`
                                            : ""
                                        } on ${formatDate(
                                            appointment.appointment_at
                                        )}.`,

                                    pushUrl:
                                        `/appointments?dog=${dog.id}`,

                                    pushTag:
                                        `appointment-${appointment.id}`,
                                });

                            if (
                                result.anythingSent
                            ) {
                                await saveNotificationLog(
                                    dog.owner_id,
                                    dog.id,
                                    type,
                                    appointment.id
                                );

                                sent++;

                                if (
                                    result.emailSent
                                ) {
                                    emailSent++;
                                }

                                if (
                                    result.pushSent
                                ) {
                                    pushSent++;
                                }

                                pushRemoved +=
                                    result.pushRemoved;
                            }

                            errors.push(
                                ...result.channelErrors.map(
                                    (error) =>
                                        `${dog.name} appointment: ${error}`
                                )
                            );
                        }
                    }
                }

                // ========================================
                // VACCINATIONS
                // ========================================

                if (
                    preferences.vaccination_reminders ===
                    true
                ) {
                    const {
                        data: vaccinations,
                        error:
                        vaccinationError,
                    } = await supabaseAdmin
                        .from("vaccinations")
                        .select(
                            `
                id,
                dog_id,
                vaccine_name,
                vaccination_date,
                due_date,
                status,
                notes
              `
                        )
                        .eq("dog_id", dog.id)
                        .gte(
                            "due_date",
                            now.toISOString()
                        )
                        .lte(
                            "due_date",
                            vaccinationEnd.toISOString()
                        )
                        .order(
                            "due_date",
                            {
                                ascending: true,
                            }
                        );

                    if (vaccinationError) {
                        errors.push(
                            `Vaccinations for ${dog.name}: ${vaccinationError.message}`
                        );
                    } else {
                        for (const vaccination of
                            vaccinations || []) {
                            const type =
                                "vaccination_reminder";

                            const alreadySent =
                                await notificationAlreadySent(
                                    dog.owner_id,
                                    dog.id,
                                    type,
                                    vaccination.id
                                );

                            if (alreadySent) {
                                skipped++;
                                continue;
                            }

                            const result =
                                await sendChannels({
                                    preferences,
                                    email,
                                    dog,

                                    notificationType:
                                        type,

                                    referenceId:
                                        vaccination.id,

                                    emailData: {
                                        subject:
                                            `💉 Vaccination Reminder — ${dog.name}`,

                                        title:
                                            "💉 Upcoming Vaccination",

                                        content: `
                      <p>
                        <strong>Vaccine:</strong>
                        ${escapeHtml(
                                            vaccination.vaccine_name ||
                                            "Not provided"
                                        )}
                      </p>

                      <p>
                        <strong>Due Date:</strong>
                        ${escapeHtml(
                                            formatSimpleDate(
                                                vaccination.due_date
                                            )
                                        )}
                      </p>

                      <p>
                        <strong>Status:</strong>
                        ${escapeHtml(
                                            vaccination.status ||
                                            "Not provided"
                                        )}
                      </p>

                      ${vaccination.notes
                                                ? `
                        <p>
                          <strong>Notes:</strong>
                          ${escapeHtml(
                                                    vaccination.notes
                                                )}
                        </p>
                      `
                                                : ""
                                            }
                    `,
                                    },

                                    pushTitle:
                                        `💉 Vaccination Due — ${dog.name}`,

                                    pushMessage:
                                        `${vaccination.vaccine_name ||
                                        "Vaccination"
                                        } is due on ${formatSimpleDate(
                                            vaccination.due_date
                                        )}.`,

                                    pushUrl:
                                        `/vaccinations?dog=${dog.id}`,

                                    pushTag:
                                        `vaccination-${vaccination.id}`,
                                });

                            if (
                                result.anythingSent
                            ) {
                                await saveNotificationLog(
                                    dog.owner_id,
                                    dog.id,
                                    type,
                                    vaccination.id
                                );

                                sent++;

                                if (
                                    result.emailSent
                                ) {
                                    emailSent++;
                                }

                                if (
                                    result.pushSent
                                ) {
                                    pushSent++;
                                }

                                pushRemoved +=
                                    result.pushRemoved;
                            }

                            errors.push(
                                ...result.channelErrors.map(
                                    (error) =>
                                        `${dog.name} vaccination: ${error}`
                                )
                            );
                        }
                    }
                }

                // ========================================
                // MEDICATIONS
                // ========================================

                if (
                    preferences.medication_reminders ===
                    true
                ) {
                    const {
                        data: medications,
                        error:
                        medicationError,
                    } = await supabaseAdmin
                        .from("medications")
                        .select(
                            `
                id,
                dog_id,
                name,
                schedule,
                duration,
                notes
              `
                        )
                        .eq("dog_id", dog.id)
                        .order(
                            "created_at",
                            {
                                ascending: false,
                            }
                        );

                    if (medicationError) {
                        errors.push(
                            `Medications for ${dog.name}: ${medicationError.message}`
                        );
                    } else {
                        for (const medication of
                            medications || []) {
                            if (
                                !medication.schedule
                            ) {
                                continue;
                            }

                            const type =
                                "medication_reminder";

                            const yesterday =
                                new Date(
                                    now.getTime() -
                                    24 *
                                    60 *
                                    60 *
                                    1000
                                );

                            const {
                                data: recentLogs,
                                error:
                                recentLogError,
                            } =
                                await supabaseAdmin
                                    .from(
                                        "notification_logs"
                                    )
                                    .select("id")
                                    .eq(
                                        "owner_id",
                                        dog.owner_id
                                    )
                                    .eq(
                                        "dog_id",
                                        dog.id
                                    )
                                    .eq(
                                        "notification_type",
                                        type
                                    )
                                    .eq(
                                        "reference_id",
                                        medication.id
                                    )
                                    .gte(
                                        "sent_at",
                                        yesterday.toISOString()
                                    )
                                    .limit(1);

                            if (recentLogError) {
                                errors.push(
                                    `Medication log for ${dog.name}: ${recentLogError.message}`
                                );

                                continue;
                            }

                            if (
                                (recentLogs || [])
                                    .length > 0
                            ) {
                                skipped++;
                                continue;
                            }

                            const result =
                                await sendChannels({
                                    preferences,
                                    email,
                                    dog,

                                    notificationType:
                                        type,

                                    referenceId:
                                        medication.id,

                                    emailData: {
                                        subject:
                                            `💊 Medication Reminder — ${dog.name}`,

                                        title:
                                            "💊 Medication Reminder",

                                        content: `
                      <p>
                        <strong>Medication:</strong>
                        ${escapeHtml(
                                            medication.name
                                        )}
                      </p>

                      <p>
                        <strong>Schedule:</strong>
                        ${escapeHtml(
                                            medication.schedule
                                        )}
                      </p>

                      ${medication.duration
                                                ? `
                        <p>
                          <strong>Duration:</strong>
                          ${escapeHtml(
                                                    medication.duration
                                                )}
                        </p>
                      `
                                                : ""
                                            }

                      ${medication.notes
                                                ? `
                        <p>
                          <strong>Notes:</strong>
                          ${escapeHtml(
                                                    medication.notes
                                                )}
                        </p>
                      `
                                                : ""
                                            }
                    `,
                                    },

                                    pushTitle:
                                        `💊 Medication Reminder — ${dog.name}`,

                                    pushMessage:
                                        `Give ${medication.name
                                        } according to the schedule: ${medication.schedule
                                        }.`,

                                    pushUrl:
                                        `/medications?dog=${dog.id}`,

                                    pushTag:
                                        `medication-${medication.id}`,
                                });

                            if (
                                result.anythingSent
                            ) {
                                await saveNotificationLog(
                                    dog.owner_id,
                                    dog.id,
                                    type,
                                    medication.id
                                );

                                sent++;

                                if (
                                    result.emailSent
                                ) {
                                    emailSent++;
                                }

                                if (
                                    result.pushSent
                                ) {
                                    pushSent++;
                                }

                                pushRemoved +=
                                    result.pushRemoved;
                            }

                            errors.push(
                                ...result.channelErrors.map(
                                    (error) =>
                                        `${dog.name} medication: ${error}`
                                )
                            );
                        }
                    }
                }

                // ========================================
                // ROUTINES
                // ========================================

                if (
                    preferences.routine_reminders ===
                    true
                ) {
                    const {
                        data: routines,
                        error: routineError,
                    } = await supabaseAdmin
                        .from("routines")
                        .select(
                            `
                id,
                dog_id,
                title,
                time_of_day,
                routine_type,
                frequency,
                active
              `
                        )
                        .eq("dog_id", dog.id)
                        .eq("active", true)
                        .order(
                            "time_of_day",
                            {
                                ascending: true,
                            }
                        );

                    if (routineError) {
                        errors.push(
                            `Routines for ${dog.name}: ${routineError.message}`
                        );
                    } else {
                        for (const routine of
                            routines || []) {
                            if (
                                !routine.time_of_day
                            ) {
                                continue;
                            }

                            const frequency =
                                String(
                                    routine.frequency ||
                                    "Daily"
                                ).toLowerCase();

                            // Daily routines run every day.
                            // Weekly routines run once per week.
                            // Monthly routines run once per month.
                            let shouldRun =
                                frequency ===
                                "daily";

                            if (
                                frequency ===
                                "weekly"
                            ) {
                                shouldRun =
                                    now.getDay() ===
                                    new Date(
                                        routine.created_at ||
                                        now
                                    ).getDay();
                            }

                            if (
                                frequency ===
                                "monthly"
                            ) {
                                shouldRun =
                                    now.getDate() ===
                                    new Date(
                                        routine.created_at ||
                                        now
                                    ).getDate();
                            }

                            if (
                                frequency ===
                                "as needed"
                            ) {
                                shouldRun = false;
                            }

                            if (!shouldRun) {
                                continue;
                            }

                            // One routine reminder per routine
                            // during each 24-hour period.
                            const yesterday =
                                new Date(
                                    now.getTime() -
                                    24 *
                                    60 *
                                    60 *
                                    1000
                                );

                            const type =
                                "routine_reminder";

                            const {
                                data: recentLogs,
                                error:
                                recentRoutineLogError,
                            } =
                                await supabaseAdmin
                                    .from(
                                        "notification_logs"
                                    )
                                    .select("id")
                                    .eq(
                                        "owner_id",
                                        dog.owner_id
                                    )
                                    .eq(
                                        "dog_id",
                                        dog.id
                                    )
                                    .eq(
                                        "notification_type",
                                        type
                                    )
                                    .eq(
                                        "reference_id",
                                        routine.id
                                    )
                                    .gte(
                                        "sent_at",
                                        yesterday.toISOString()
                                    )
                                    .limit(1);

                            if (
                                recentRoutineLogError
                            ) {
                                errors.push(
                                    `Routine log for ${dog.name}: ${recentRoutineLogError.message}`
                                );

                                continue;
                            }

                            if (
                                (recentLogs || [])
                                    .length > 0
                            ) {
                                skipped++;
                                continue;
                            }

                            const result =
                                await sendChannels({
                                    preferences,
                                    email,
                                    dog,

                                    notificationType:
                                        type,

                                    referenceId:
                                        routine.id,

                                    emailData: {
                                        subject:
                                            `🐾 Routine Reminder — ${dog.name}`,

                                        title:
                                            "🐾 Dog Routine Reminder",

                                        content: `
                      <p>
                        <strong>Routine:</strong>
                        ${escapeHtml(
                                            routine.title
                                        )}
                      </p>

                      <p>
                        <strong>Time:</strong>
                        ${escapeHtml(
                                            routine.time_of_day
                                        )}
                      </p>

                      <p>
                        <strong>Type:</strong>
                        ${escapeHtml(
                                            routine.routine_type ||
                                            "General care"
                                        )}
                      </p>

                      <p>
                        <strong>Frequency:</strong>
                        ${escapeHtml(
                                            routine.frequency ||
                                            "Daily"
                                        )}
                      </p>
                    `,
                                    },

                                    pushTitle:
                                        `🐾 Routine Reminder — ${dog.name}`,

                                    pushMessage:
                                        `${routine.title} is scheduled for ${routine.time_of_day}.`,

                                    pushUrl:
                                        `/routines?dog=${dog.id}`,

                                    pushTag:
                                        `routine-${routine.id}`,
                                });

                            if (
                                result.anythingSent
                            ) {
                                await saveNotificationLog(
                                    dog.owner_id,
                                    dog.id,
                                    type,
                                    routine.id
                                );

                                sent++;

                                if (
                                    result.emailSent
                                ) {
                                    emailSent++;
                                }

                                if (
                                    result.pushSent
                                ) {
                                    pushSent++;
                                }

                                pushRemoved +=
                                    result.pushRemoved;
                            }

                            errors.push(
                                ...result.channelErrors.map(
                                    (error) =>
                                        `${dog.name} routine: ${error}`
                                )
                            );
                        }
                    }
                }
            } catch (dogError) {
                console.error(
                    `Notification error for ${dog.name}:`,
                    dogError
                );

                errors.push(
                    `${dog.name}: ${dogError?.message ||
                    "Unknown error"
                    }`
                );
            }
        }

        // ==========================================
        // FINAL RESPONSE
        // ==========================================

        return Response.json({
            success: true,

            message:
                "Premium dog-care reminder check completed.",

            sent,

            emailSent,

            pushSent,

            pushRemoved,

            skipped,

            errors,

            checkedAt:
                now.toISOString(),
        });
    } catch (error) {
        console.error(
            "Send reminders error:",
            error
        );

        return Response.json(
            {
                success: false,

                error:
                    error?.message ||
                    "Unable to process reminders.",
            },
            {
                status: 500,
            }
        );
    }
}