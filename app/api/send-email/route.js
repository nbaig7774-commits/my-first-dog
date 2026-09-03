import { Resend } from "resend";

export async function POST(request) {
    try {
        const apiKey = process.env.RESEND_API_KEY;

        if (!apiKey) {
            return Response.json(
                {
                    success: false,
                    error: "RESEND_API_KEY is not configured.",
                },
                { status: 500 }
            );
        }

        const resend = new Resend(apiKey);

        const body = await request.json();

        const {
            to,
            subject,
            html,
            text,
        } = body;

        if (!to) {
            return Response.json(
                {
                    success: false,
                    error: "Recipient email is required.",
                },
                { status: 400 }
            );
        }

        const result = await resend.emails.send({
            from:
                process.env.RESEND_FROM_EMAIL ||
                "My First Dog <onboarding@resend.dev>",
            to,
            subject: subject || "My First Dog Notification",
            html:
                html ||
                "<p>This is a notification from My First Dog.</p>",
            text:
                text ||
                "This is a notification from My First Dog.",
        });

        if (result.error) {
            return Response.json(
                {
                    success: false,
                    error: result.error.message || "Email delivery failed.",
                },
                { status: 500 }
            );
        }

        return Response.json({
            success: true,
            message: "Email sent successfully.",
            id: result.data?.id || null,
        });
    } catch (error) {
        console.error("SEND EMAIL ERROR:", error);

        return Response.json(
            {
                success: false,
                error:
                    error?.message ||
                    "Unable to send email.",
            },
            { status: 500 }
        );
    }
}