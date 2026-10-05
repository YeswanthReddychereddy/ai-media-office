import { z } from "zod";
import { ProviderLimitError } from "./provider-limit";
import { CRITERIA, EVIDENCE, submitIdea, productionOutput } from "./providers";
import type { Project } from "./types";
const text = z.string().min(1).max(1800);
const claimIds = z
  .array(z.enum(["C1", "C2", "C3"]))
  .min(1)
  .max(3);
export async function localJson<T extends z.ZodType>(
  schema: T,
  role: string,
  brief: string,
): Promise<z.infer<T>> {
  const endpoint = new URL(process.env.OLLAMA_URL || "http://127.0.0.1:11434");
  if (!["localhost", "127.0.0.1", "[::1]"].includes(endpoint.hostname))
    throw new Error("Only a local model endpoint is permitted");
  const model = process.env.OLLAMA_MODEL;
  if (!model || model.includes("cloud"))
    throw new Error("An installed local model is required");
  const res = await fetch(new URL("/api/chat", endpoint), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      stream: false,
      think: false,
      format: z.toJSONSchema(schema),
      keep_alive: "2m",
      options: { num_ctx: 4096, num_predict: 2200, temperature: 0.65 },
      messages: [
        {
          role: "system",
          content: `You are an AI ${role} in a Founder-controlled media studio. Return only JSON matching the supplied schema. Be concise and truthful. Use only claims C1, C2, C3 from this curated evidence: ${JSON.stringify(EVIDENCE.claims)}. Do not invent research, statistics, licenses, or completed actions. No publishing or tool execution is possible. /no_think`,
        },
        { role: "user", content: brief },
      ],
    }),
    signal: AbortSignal.timeout(180000),
  });
  if (res.status === 429) throw new ProviderLimitError();
  if (!res.ok)
    throw new Error(
      "The local model could not complete this stage. Start the model service, then retry.",
    );
  const data = await res.json();
  const parsed = schema.safeParse(JSON.parse(data.message?.content || "{}"));
  if (!parsed.success)
    throw new Error(
      "Local output did not pass the required structure. Atlas will retry; no invalid artifact was saved.",
    );
  return parsed.data;
}
export async function localProduction(
  stage: string,
  p: Project,
  inputs: Record<string, unknown>,
  feedback: string[],
): Promise<unknown> {
  const provenance = {
    provenance: "local-model",
    model: process.env.OLLAMA_MODEL,
    sourceIds: ["nws-thunder"],
    review:
      "Generated locally. Factual meaning and quality still require Founder inspection.",
  };
  const objective = `Objective: ${p.objective}\nFounder feedback: ${feedback.join("\n") || "None"}\nOnly the lightning/thunder concept is supported. Produce short concept material.`;
  if (stage.startsWith("idea-")) {
    const i = stage.charCodeAt(5) - 97,
      identity = submitIdea(i, {
        objective: p.objective,
        revision: p.revision,
        feedback,
      });
    const entry = await localJson(
      z.object({ title: text, hook: text, visual: text, claims: claimIds }),
      `${identity.angle} Idea Author`,
      `${objective}\nCreate a distinct ${identity.angle} idea. You have no access to other entries. Keep hook under 45 words, visual under 40 words.`,
    );
    return {
      ...entry,
      id: identity.id,
      author: identity.author,
      angle: identity.angle,
      revision: p.revision,
      founderFeedback: feedback,
      ...provenance,
    };
  }
  if (stage === "judge") {
    const entries = ["a", "b", "c", "d", "e"].map(
      (k) =>
        inputs["idea-" + k] as {
          id: string;
          title: string;
          hook: string;
          visual: string;
        },
    );
    if (entries.some((e) => !e))
      throw new Error("Five blind entries are required");
    const scoreShape = Object.fromEntries(
      criteriaKeys().map((k) => [k, z.number().min(0).max(100)]),
    );
    const schema = z.object({
      votes: z
        .array(
          z.object({
            id: z.enum(["A", "B", "C", "D", "E"]),
            scores: z.object(scoreShape),
            reason: text,
          }),
        )
        .length(5),
    });
    const judges = [
      "Research Judge",
      "Audience Judge",
      "Story Judge",
      "Visual Judge",
      "Originality Judge",
    ];
    const votes: Array<{
      judge: string;
      votes: z.infer<typeof schema>["votes"];
    }> = [];
    for (const judge of judges) {
      const judged = await localJson(
        schema,
        judge,
        `Evaluate these five concepts independently. ${objective}\nEntries: ${JSON.stringify(entries.map((e) => ({ id: e.id, title: e.title, hook: e.hook, visual: e.visual })))}\nScore every criterion 0–100 for every entry exactly once. Be critical, not flattering. Your reason should reflect your ${judge} role. Do not give claims a pass without supporting evidence.`,
      );
      if (new Set(judged.votes.map((v) => v.id)).size !== 5)
        throw new Error("Judge must evaluate each concept exactly once");
      votes.push({ judge, votes: judged.votes });
    }
    const rankings = entries
      .map((entry) => {
        const ownVotes = votes.map((j) => ({
          name: j.judge,
          ...j.votes.find((v) => v.id === entry.id)!,
        }));
        const scores = ownVotes.flatMap(
          (v) => Object.values(v.scores) as number[],
        );
        return {
          ...entry,
          votes: ownVotes,
          score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
        };
      })
      .sort((a, b) => b.score - a.score);
    return {
      winner: rankings[0].id,
      rankings,
      criteria: CRITERIA,
      sealed: true,
      method:
        "Five separate local-model calls with independent judge contexts. The same small model fills each role; this is not model diversity or a factual verification guarantee.",
      ...provenance,
    };
  }
  if (stage === "hooks") {
    const result = await localJson(
      z.object({
        entries: z
          .array(
            z.object({
              style: z.enum([
                "Mystery",
                "Surprising fact",
                "Human",
                "Cinematic",
                "Counterintuitive",
              ]),
              text,
              score: z.number().min(0).max(100),
            }),
          )
          .length(5),
        selected: text,
        reason: text,
      }),
      "Hook Writer and Concept Critic",
      `${objective}\nCreate exactly one of each hook style. Choose the strongest hook and explain why. No deceptive clickbait. These scores are self-critique; the Founder remains the final reviewer.`,
    );
    if (new Set(result.entries.map((e) => e.style)).size !== 5)
      throw new Error("Five distinct hook styles are required");
    return {
      ...result,
      judge: "Local model self-critique; separate hook judges are future work",
      ...provenance,
    };
  }
  if (stage === "scripts") {
    const result = await localJson(
      z.object({
        versions: z
          .array(
            z.object({
              name: z.enum([
                "Cinematic documentary",
                "High-curiosity story",
                "Emotion-first story",
              ]),
              text,
              claims: claimIds,
              score: z.number().min(0).max(100),
            }),
          )
          .length(3),
        winner: text,
        critics: z.array(text).min(1).max(5),
      }),
      "Lead Scriptwriter",
      `${objective}\nWrite three genuinely different concept scripts, 60–100 words each. Use only the approved claim meanings. Retain a shelter reminder. Compare the drafts and select a winner. Explain weaknesses honestly.`,
    );
    if (new Set(result.versions.map((e) => e.name)).size !== 3)
      throw new Error("Three distinct script styles are required");
    return {
      ...result,
      scope:
        "Locally generated concept scripts, not a final long-form video. Scores are self-critique.",
      ...provenance,
    };
  }
  if (stage === "storyboard") {
    const scripts = inputs.scripts as { versions?: unknown; winner?: string };
    const result = await localJson(
      z.object({
        scenes: z
          .array(
            z.object({
              time: text,
              title: text,
              visual: text,
              audio: text,
              claimIds,
            }),
          )
          .min(3)
          .max(5),
      }),
      "Storyboard Artist",
      `${objective}\nCreate a 3–5 scene storyboard for these concepts: ${JSON.stringify(scripts?.versions).slice(0, 3600)}. Use original diagrams and an indoor observer. Label time compression. No acquired visual assets exist.`,
    );
    return {
      ...result,
      format: "3840 × 2160 · 60 fps target",
      rights:
        "Descriptions only. No external visual assets or licenses acquired.",
      ...provenance,
    };
  }
  return productionOutput(stage, p, inputs, feedback);
}
function criteriaKeys() {
  return [...CRITERIA];
}
