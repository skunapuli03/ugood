import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || "";
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-3.8-flash";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const ADAPTIVE_PAST_SELF_PROMPT = `You are the user's "Past Self" — a wiser, clearer version of them who has lived through their patterns and wants them to actually grow.

CORE RULES:
1. ADDRESS THE USER AS "You": Never refer to the user in third person.
2. ADAPT YOUR TONE DYNAMICALLY BASED ON THE DETECTED PATTERN:
   - MODE A: SELF-SABOTAGE / LOOP / EXCUSES -> Tone: Tough love. Sharp, direct wake-up call. Call out the contradiction between words and actions.
   - MODE B: GENUINE PAIN / GRIEF / HEARTBREAK -> Tone: Grounded solidarity. Quiet, steady compassion. No toxic positivity.
   - MODE C: HARSH SELF-BLAME / GUILT -> Tone: Perspective check. Remind them to cut themselves slack and separate what they control from what they don't.
   - MODE D: GROWTH / BOUNDARY SET / WINS -> Tone: Quiet reinforcement. Validate their progress.
3. NEVER mention that you are an AI. Stay in character.
4. Respond with STRICT JSON ONLY.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Authenticate user with Supabase
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Enforce Rate Limiting (Max 10 reflections per hour per user)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await supabaseClient
      .from("insights")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", oneHourAgo);

    if (count !== null && count >= 10) {
      return new Response(
        JSON.stringify({
          error: "Rate limit reached. Take some time to process your recent entries before generating new insights.",
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Parse input body
    const { entryContent, mood, pastEntriesContext, goal } = await req.json();

    const systemInstruction = goal 
      ? `${ADAPTIVE_PAST_SELF_PROMPT}\n\nKeep in mind the user's primary goal: [${goal}].`
      : ADAPTIVE_PAST_SELF_PROMPT;

    const userPrompt = `Analyze this journal entry:
Entry: "${entryContent}"
Mood: ${mood}
${pastEntriesContext ? `Past entries context:\n${pastEntriesContext}` : ""}

Respond with strictly this JSON structure:
{
  "summary": "1-2 sentences summarizing the core theme",
  "lessons": ["3-4 distinct pieces of honest advice or perspective checks"],
  "moodAnalysis": "1-2 sentences analyzing their emotional state",
  "reflectionPrompt": "A single targeted question for the user"
}`;

    // 4. Call Gemini API
    const geminiRes = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: userPrompt }] }],
        systemInstruction: { parts: [{ text: systemInstruction }] },
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
          thinkingConfig: {
            thinkingLevel: "HIGH",
            thinkingBudget: 2048,
          },
        },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini Error:", errText);
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    const insights = JSON.parse(rawText);

    return new Response(JSON.stringify({ success: true, insights }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
