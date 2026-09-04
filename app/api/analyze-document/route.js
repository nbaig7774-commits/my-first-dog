import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

export async function POST(request) {
    try {
        const {
            documentUrl,
            documentType,
            fileName,
            accessToken,
        } = await request.json();


        /* =====================================================
           VALIDATION
        ===================================================== */

        if (!accessToken) {
            return Response.json(
                {
                    error:
                        "Authentication required. Please log in.",
                },
                {
                    status: 401,
                }
            );
        }


        if (!documentUrl) {
            return Response.json(
                {
                    error:
                        "No document provided.",
                },
                {
                    status: 400,
                }
            );
        }


        if (!process.env.OPENAI_API_KEY) {
            return Response.json(
                {
                    error:
                        "OPENAI_API_KEY is not configured.",
                },
                {
                    status: 500,
                }
            );
        }


        /* =====================================================
           SUPABASE USER CLIENT
        ===================================================== */

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
            {
                global: {
                    headers: {
                        Authorization:
                            `Bearer ${accessToken}`,
                    },
                },
            }
        );


        /* =====================================================
           VERIFY USER
        ===================================================== */

        const {
            data: {
                user,
            },
            error: authError,
        } = await supabase.auth.getUser(
            accessToken
        );


        if (authError || !user) {
            return Response.json(
                {
                    error:
                        "Your login session has expired. Please log in again.",
                },
                {
                    status: 401,
                }
            );
        }


        /* =====================================================
           CHECK SUBSCRIPTION
           
           Premium is required for document scanning.
        ===================================================== */

        const profileResult =
            await supabase
                .from("profiles")
                .select(
                    "subscription_plan, subscription_status"
                )
                .eq("id", user.id)
                .single();


        if (
            profileResult.error ||
            !profileResult.data
        ) {
            return Response.json(
                {
                    error:
                        "Unable to verify your subscription.",
                },
                {
                    status: 403,
                }
            );
        }


        const subscriptionPlan =
            profileResult.data
                .subscription_plan;

        const subscriptionStatus =
            profileResult.data
                .subscription_status;


        const isPremium =
            subscriptionPlan === "premium" &&
            subscriptionStatus === "active";


        if (!isPremium) {
            return Response.json(
                {
                    error:
                        "AI Vet Document Scanner is available on the Premium plan.",
                    code:
                        "PREMIUM_REQUIRED",
                },
                {
                    status: 403,
                }
            );
        }


        /* =====================================================
           OPENAI
        ===================================================== */

        const openai = new OpenAI({
            apiKey:
                process.env.OPENAI_API_KEY,
        });


        /* =====================================================
           DOCUMENT ANALYSIS
        ===================================================== */

        const response =
            await openai.responses.create({
                model: "gpt-5.6",

                input: [
                    {
                        role: "system",

                        content:
                            "You are the My First Dog veterinary document assistant. Analyze veterinary documents and extract only factual information that is visible in the document. Do not diagnose medical conditions. Do not invent information. Return valid JSON only.",
                    },

                    {
                        role: "user",

                        content: [
                            {
                                type: "input_text",

                                text: `
Analyze this veterinary document.

File name:
${fileName || "Unknown"}

Document type:
${documentType || "Unknown"}

Extract the following information:

- veterinarian_name
- clinic_name
- visit_date
- reason
- medications
- vaccinations
- summary
- instructions

Return ONLY this JSON structure:

{
  "veterinarian_name": "",
  "clinic_name": "",
  "visit_date": "",
  "reason": "",
  "medications": "",
  "vaccinations": "",
  "summary": "",
  "instructions": ""
}

If information is missing or cannot be read,
use an empty string.

Do not guess.
Do not invent information.
Do not diagnose diseases.
              `,
                            },

                            {
                                type: "input_image",
                                image_url: documentUrl,
                            },
                        ],
                    },
                ],
            });


        /* =====================================================
           PARSE AI RESULT
        ===================================================== */

        const text =
            response.output_text || "";


        let analysis;


        try {
            analysis = JSON.parse(text);
        } catch {
            return Response.json(
                {
                    error:
                        "AI returned an invalid document analysis.",
                },
                {
                    status: 500,
                }
            );
        }


        /* =====================================================
           RESPONSE
        ===================================================== */

        return Response.json({
            success: true,

            analysis,

            document: {
                fileName:
                    fileName || "Unknown",

                documentType:
                    documentType || "Unknown",
            },
        });


    } catch (error) {

        console.error(
            "AI DOCUMENT ANALYSIS ERROR:",
            error
        );


        return Response.json(
            {
                error:
                    error?.message ||
                    "Unable to analyze veterinary document.",
            },
            {
                status: 500,
            }
        );
    }
}