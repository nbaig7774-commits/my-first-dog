import { Resend } from "resend";
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

              <h2>
                ${title}
              </h2>

              <p>
                This is a reminder for
                <strong>${dogName}</strong>.
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

export async function GET(request) {
    try {
        // ==========================================
        // SECURITY
        // ==========================================

        const cronSecret =
            process.env.CRON_SECRET;

        const authorization =
            request.headers.get("authorization");

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

        if (!process.env.RESEND_API_KEY) {
            return Response.json(
                {
                    success: false,
                    error:
                        "RESEND_API_KEY is missing.",
                },
                {
                    status: 500,
                }
            );
        }

        if (
            !process.env.NEXT_PUBLIC_SUPABASE_URL
        ) {
            return Response.json(
                {
                    success: false,
                    error:
                        "NEXT_PUBLIC_SUPABASE_URL is missing.",
                },
                {
                    status: 500,
                }
            );
        }

        if (
            !process.env.SUPABASE_SERVICE_ROLE_KEY
        ) {
            return Response.json(
                {
                    success: false,
                    error:
                        "SUPABASE_SERVICE_ROLE_KEY is missing.",
                },
                {
                    status: 500,
                }
            );
        }

        // ==========================================
        // TIME WINDOWS
        // ==========================================

        const now = new Date();

        // Appointments within next 24 hours
        const appointmentEnd =
            new Date(
                now.getTime() +
                24 * 60 * 60 * 1000
            );

        // Vaccinations due within next 7 days
        const vaccinationEnd =
            new Date(
                now.getTime() +
                7 * 24 * 60 * 60 * 1000
            );

        let sent = 0;
        let skipped = 0;
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
                // ----------------------------------------
                // LOAD PROFILE
                // ----------------------------------------

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
                        profile.subscription_plan || ""
                    ).toLowerCase() === "premium";

                if (!isPremium) {
                    skipped++;
                    continue;
                }

                // ----------------------------------------
                // LOAD NOTIFICATION PREFERENCES
                // ----------------------------------------

                const {
                    data: preferences,
                    error: preferencesError,
                } = await supabaseAdmin
                    .from("notification_preferences")
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

                // ----------------------------------------
                // EMAIL MUST BE ENABLED
                // ----------------------------------------

                if (
                    preferences.email_notifications !==
                    true
                ) {
                    skipped++;
                    continue;
                }

                // ----------------------------------------
                // GET USER EMAIL
                // ----------------------------------------

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

                {
                    const {
                        data: appointments,
                        error: appointmentError,
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
                        for (
                            const appointment of
                            appointments || []
                        ) {
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

                            await sendReminderEmail({
                                to: email,
                                dogName: dog.name,
                                subject:
                                    `📅 Appointment Reminder — ${dog.name}`,
                                title:
                                    "📅 Upcoming Vet Appointment",

                                content: `
                  <p>
                    <strong>Date & Time:</strong>
                    ${formatDate(
                                    appointment.appointment_at
                                )}
                  </p>

                  <p>
                    <strong>Clinic:</strong>
                    ${appointment.clinic_name ||
                                    "Not provided"
                                    }
                  </p>

                  <p>
                    <strong>Reason:</strong>
                    ${appointment.reason ||
                                    "Not provided"
                                    }
                  </p>

                  ${appointment.notes
                                        ? `
                        <p>
                          <strong>Notes:</strong>
                          ${appointment.notes}
                        </p>
                      `
                                        : ""
                                    }
                `,
                            });

                            await saveNotificationLog(
                                dog.owner_id,
                                dog.id,
                                type,
                                appointment.id
                            );

                            sent++;
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
                        error: vaccinationError,
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
                        for (
                            const vaccination of
                            vaccinations || []
                        ) {
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

                            await sendReminderEmail({
                                to: email,
                                dogName: dog.name,
                                subject:
                                    `💉 Vaccination Reminder — ${dog.name}`,
                                title:
                                    "💉 Upcoming Vaccination",

                                content: `
                  <p>
                    <strong>Vaccine:</strong>
                    ${vaccination.vaccine_name ||
                                    "Not provided"
                                    }
                  </p>

                  <p>
                    <strong>Due Date:</strong>
                    ${formatSimpleDate(
                                        vaccination.due_date
                                    )}
                  </p>

                  <p>
                    <strong>Status:</strong>
                    ${vaccination.status ||
                                    "Not provided"
                                    }
                  </p>

                  ${vaccination.notes
                                        ? `
                        <p>
                          <strong>Notes:</strong>
                          ${vaccination.notes}
                        </p>
                      `
                                        : ""
                                    }
                `,
                            });

                            await saveNotificationLog(
                                dog.owner_id,
                                dog.id,
                                type,
                                vaccination.id
                            );

                            sent++;
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
                        error: medicationError,
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
                        for (
                            const medication of
                            medications || []
                        ) {
                            if (!medication.schedule) {
                                continue;
                            }

                            const type =
                                "medication_reminder";

                            // Only one medication email
                            // every 24 hours.
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
                                error: recentLogError,
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
                                (recentLogs || []).length >
                                0
                            ) {
                                skipped++;
                                continue;
                            }

                            await sendReminderEmail({
                                to: email,
                                dogName: dog.name,
                                subject:
                                    `💊 Medication Reminder — ${dog.name}`,
                                title:
                                    "💊 Medication Reminder",

                                content: `
                  <p>
                    <strong>Medication:</strong>
                    ${medication.name}
                  </p>

                  <p>
                    <strong>Schedule:</strong>
                    ${medication.schedule}
                  </p>

                  ${medication.duration
                                        ? `
                        <p>
                          <strong>Duration:</strong>
                          ${medication.duration}
                        </p>
                      `
                                        : ""
                                    }

                  ${medication.notes
                                        ? `
                        <p>
                          <strong>Notes:</strong>
                          ${medication.notes}
                        </p>
                      `
                                        : ""
                                    }
                `,
                            });

                            await saveNotificationLog(
                                dog.owner_id,
                                dog.id,
                                type,
                                medication.id
                            );

                            sent++;
                        }
                    }
                }
            } catch (dogError) {
                console.error(
                    `Notification error for ${dog.name}:`,
                    dogError
                );

                errors.push(
                    `${dog.name}: ${dogError.message ||
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
                "Email reminder check completed.",
            sent,
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
                    error.message ||
                    "Unable to process email reminders.",
            },
            {
                status: 500,
            }
        );
    }
}