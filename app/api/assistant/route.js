import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

export async function POST(request) {
  try {
    const { question, accessToken } = await request.json();

    // Require a logged-in Supabase user
    if (!accessToken) {
      return Response.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    // Verify the access token with Supabase
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      return Response.json(
        { error: "Unauthorized. Please log in again." },
        { status: 401 }
      );
    }

    if (!question || !question.trim()) {
      return Response.json(
        { error: "Please enter a question." },
        { status: 400 }
      );
    }
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await openai.responses.create({
      model: "gpt-5.6",
      input: [
        {
          role: "system",
          content:
            "You are the My First Dog AI Care Assistant. Answer dog-care questions clearly and safely. Do not diagnose diseases or prescribe medication. For serious symptoms, recommend contacting a veterinarian.",
        },
        {
          role: "user",
          content: question,
        },
      ],
    });

    return Response.json({
      answer: response.output_text,
    });
  } catch (error) {
    console.error("AI Assistant error:", error);

    return Response.json(
      {
        error: error.message || "AI Assistant failed.",
      },
      { status: 500 }
    );
  }
}