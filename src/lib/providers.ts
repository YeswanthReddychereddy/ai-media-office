import type { Agent, Project } from "./types";
export interface TextProvider {
  reply(agent: Agent, question: string, context: string): Promise<string>;
}
export interface MediaProvider {
  kind: "image" | "video" | "voice" | "music";
  estimate(input: unknown): Promise<{ currency: string; amount: number }>;
  generate(
    input: unknown,
    approvalId: string,
  ): Promise<{ assetUri: string; license: string }>;
}
export interface AnalyticsProvider {
  read(channelId: string): Promise<{
    source: string;
    measuredAt: string;
    metrics: Record<string, number>;
  }>;
}
export const EVIDENCE = {
  id: "nws-thunder",
  title: "Understanding Lightning: Thunder",
  publisher: "NOAA / National Weather Service",
  url: "https://www.weather.gov/safety/lightning-science-thunder",
  reviewed: "2026-10-04",
  verification:
    "Curated by the developer against the original public source; not a live autonomous web search.",
  claims: [
    {
      id: "C1",
      claim:
        "Thunder is a sound wave associated with the rapid heating and expansion of air along a lightning channel.",
      source: "nws-thunder",
    },
    {
      id: "C2",
      claim:
        "At ordinary storm distances the flash is seen before the thunder arrives because the sound takes longer to travel.",
      source: "nws-thunder",
    },
    {
      id: "C3",
      claim: "Hearing thunder means you should already seek safe shelter.",
      source: "nws-thunder",
    },
  ],
};
export const CRITERIA = [
  "novelty",
  "curiosity",
  "human relevance",
  "emotional potential",
  "visual potential",
  "storytelling depth",
  "credibility",
  "source availability",
  "shareability",
  "rewatchability",
  "audience fit",
  "production feasibility",
  "originality",
];
const ideas = [
  {
    title: "One storm. Two arrival times.",
    angle: "surprising facts",
    hook: "The sky flashes. The sound has not arrived yet. What is happening in that quiet gap?",
    visual:
      "Two synchronized tracks reveal light and sound moving toward a sheltered observer.",
  },
  {
    title: "The moment a storm holds its breath",
    angle: "emotional stories",
    hook: "From a window, a child waits for the thunder. That tiny pause hides a beautiful piece of physics.",
    visual:
      "A quiet interior scene becomes an annotated journey through the air.",
  },
  {
    title: "A race you can hear",
    angle: "visual spectacle",
    hook: "Send light and sound across the same landscape. One race, radically different arrivals.",
    visual:
      "A split-screen cinematic race with time compression labeled clearly.",
  },
  {
    title: "Why thunder keeps rolling",
    angle: "under-covered subjects",
    hook: "Why does one flash seem to make a sound that stretches across the sky?",
    visual: "A branching lightning channel becomes a map of sound paths.",
    note: "Angle needs additional claim-level review before further production.",
  },
  {
    title: "The quiet gap after lightning",
    angle: "high-shareability curiosity",
    hook: "Once you notice the gap between a flash and its thunder, you start hearing storms differently.",
    visual:
      "Minimal typography and a single traveling wave make the explanation memorable.",
  },
];
/** Blind entry interface has no competitor field or database capability. */
export function submitIdea(
  index: number,
  brief: { objective: string; revision: number; feedback: string[] },
) {
  return {
    ...ideas[index],
    id: String.fromCharCode(65 + index),
    author: ["Iris", "Leo", "Nova", "Theo", "Zara"][index],
    sourceIds: ["nws-thunder"],
    claims: ["C1", "C2"],
    revision: brief.revision,
    founderFeedback: brief.feedback,
    revisionNote:
      brief.revision > 1
        ? "Feedback is recorded for human review. Demo templates do not pretend to perform semantic rewrites."
        : undefined,
    provenance: "deterministic-demo",
    objective: brief.objective,
  };
}
export function judgeIdeas(entries: ReturnType<typeof submitIdea>[]) {
  if (entries.length !== 5)
    throw new Error("Idea gate: five sealed entries are required");
  const judges = [
    "Research Judge",
    "Audience Judge",
    "Story Judge",
    "Visual Judge",
    "Originality Judge",
  ];
  const rankings = entries
    .map((entry, i) => {
      const votes = judges.map((name, j) => ({
        name,
        scores: Object.fromEntries(
          CRITERIA.map((c, k) => [
            c,
            Math.min(
              97,
              Math.max(
                62,
                [86, 82, 89, 73, 84][i] + ((j * 3 + k * 2 + i) % 9) - 4,
              ),
            ),
          ]),
        ),
        reason: [
          "Clear evidence trail; review every future factual addition.",
          "An accessible question with broad appeal.",
          "A simple promise with a concrete payoff.",
          "A concept that can be shown without expensive footage.",
          "Execution must avoid familiar stock-storm clichés.",
        ][j],
      }));
      const score = Math.round(
        votes
          .flatMap((v) => Object.values(v.scores))
          .reduce((a, b) => a + b, 0) /
          (judges.length * CRITERIA.length),
      );
      return { ...entry, score, votes };
    })
    .sort((a, b) => b.score - a.score);
  return {
    winner: rankings[0].id,
    rankings,
    criteria: CRITERIA,
    method:
      "Five separate deterministic rubric evaluations. These are illustrative scores, not independent AI-model opinions.",
    sealed: true,
  };
}
export function productionOutput(
  stage: string,
  p: Project,
  inputs: Record<string, unknown>,
  feedback: string[],
): unknown {
  if (stage === "research") {
    if (!/lightning|thunder/i.test(p.objective + " " + p.title))
      throw new Error(
        "Research is blocked: this demo only contains verified source material for lightning and thunder. Your objective is saved; add a research provider in a future milestone.",
      );
    return {
      summary:
        "Explore the interval between a lightning flash and the arrival of thunder, from a sheltered observer’s perspective.",
      sources: [EVIDENCE],
      claims: EVIDENCE.claims,
      limitations: [
        "One curated source bundle, not a comprehensive literature review.",
        "No footage or other media rights granted by this research.",
      ],
      provider: "curated-demo",
    };
  }
  if (stage === "facts") {
    const r = inputs.research as {
      claims?: { id: string; source: string }[];
      sources?: { id: string }[];
    };
    const passed =
      !!r?.claims?.length &&
      r.claims.every((c) => r.sources?.some((s) => s.id === c.source));
    if (!passed)
      throw new Error("Research gate: every claim requires a traceable source");
    return {
      passed,
      checkedClaims: r.claims?.map((c) => ({
        claimId: c.id,
        result: "supported by curated source",
      })),
      review:
        "Traceability check against a curated fixture; new factual claims require human review.",
    };
  }
  if (stage.startsWith("idea-"))
    return submitIdea(stage.charCodeAt(5) - 97, {
      objective: p.objective,
      revision: p.revision,
      feedback,
    });
  if (stage === "judge")
    return judgeIdeas(
      ["a", "b", "c", "d", "e"].map(
        (k) => inputs["idea-" + k] as ReturnType<typeof submitIdea>,
      ),
    );
  if (stage === "hooks")
    return {
      entries: [
        {
          style: "Mystery",
          text: "What is happening in the silence after a lightning flash?",
          score: 89,
        },
        {
          style: "Surprising fact",
          text: "You can watch the flash while its thunder is still traveling toward you.",
          score: 86,
        },
        {
          style: "Human",
          text: "At the window, you wait. The sky has flashed. Why has the sound not arrived?",
          score: 88,
        },
        {
          style: "Cinematic",
          text: "A flash cuts through the clouds. A silent beat. Then the room trembles.",
          score: 90,
        },
        {
          style: "Counterintuitive",
          text: "The storm has not paused. One part of it is still on the way.",
          score: 87,
        },
      ],
      selected: "Mystery",
      judge: "Demo Hook Judge",
      reason: "Clear question with an honest, explainable payoff.",
      sourceIds: ["nws-thunder"],
      provenance: "deterministic-demo",
    };
  if (stage === "scripts")
    return {
      versions: [
        {
          name: "Cinematic documentary",
          text: "A flash breaks the sky. For a moment, the storm is quiet. The light has reached you, but the sound is still traveling. Lightning rapidly heats the air along its path; the expanding air creates the sound we call thunder. From a safe indoor window, that small delay lets you notice how differently light and sound move. If you hear thunder, seek safe shelter.",
          claims: ["C1", "C2", "C3"],
          score: 90,
        },
        {
          name: "High-curiosity story",
          text: "Why is there a gap between a flash and its thunder? Follow two paths from the same lightning channel: the light arrives first, and the sound follows. Reveal the explanation with a simple visual comparison, then close with the shelter reminder.",
          claims: ["C1", "C2", "C3"],
          score: 88,
        },
        {
          name: "Emotion-first story",
          text: "Begin with the familiar feeling of waiting for thunder beside an indoor window. Turn that anticipation into a question about sound, then a visual answer. End with a calm reminder to stay sheltered.",
          claims: ["C2", "C3"],
          score: 84,
        },
      ],
      winner: "Cinematic documentary",
      critics: [
        "Story: clear setup and payoff",
        "Retention: visual race after the question",
        "Fact checker: mapped to the three curated claims",
        "Audience: accessible language",
        "Originality: develop a distinct visual identity",
      ],
      scope: "Short concept drafts, not a full long-form script",
      provenance: "deterministic-demo",
    };
  if (stage === "storyboard")
    return {
      format: "3840 × 2160 · 60 fps target",
      scenes: [
        {
          time: "00:00–00:05",
          title: "The quiet gap",
          visual: "Interior window. A distant flash. Leave a beat of silence.",
          audio: "Soft room tone; delayed thunder.",
          claimIds: ["C2"],
        },
        {
          time: "00:05–00:15",
          title: "Two paths",
          visual:
            "Stylized split screen tracks light and sound. Label time compression.",
          audio: "Narration poses the question.",
          claimIds: ["C2"],
        },
        {
          time: "00:15–00:30",
          title: "The air becomes a wave",
          visual: "Original diagram of a lightning channel and expanding air.",
          audio: "Explain the source of the sound.",
          claimIds: ["C1"],
        },
        {
          time: "00:30–00:40",
          title: "Back at the window",
          visual: "Return to the sheltered observer. Closing safety message.",
          audio: "Calm resolution.",
          claimIds: ["C3"],
        },
      ],
      rights:
        "All scenes are descriptions only. No third-party media acquired.",
      provenance: "deterministic-demo",
    };
  if (stage === "quality") {
    const required = [
      "research",
      "facts",
      "judge",
      "hooks",
      "scripts",
      "storyboard",
    ];
    const checks = required.map((kind) => ({
      name: kind,
      passed: !!inputs[kind],
    }));
    const factPassed = (inputs.facts as { passed?: boolean })?.passed;
    const passed = checks.every((c) => c.passed) && !!factPassed;
    if (!passed)
      throw new Error("Quality gate: required concept artifacts are missing");
    return {
      passed,
      checks,
      redTeam: [
        {
          role: "Bored Viewer",
          finding: "Open with the question; avoid a long logo intro.",
        },
        {
          role: "Skeptical Viewer",
          finding:
            "Describe the source bundle as curated, not autonomous verification.",
        },
        {
          role: "Subject Expert",
          finding: "Any new numerical speed claims need additional sourcing.",
        },
        {
          role: "Copyright Reviewer",
          finding: "No media licenses yet. Do not proceed to final video.",
        },
        {
          role: "Policy Reviewer",
          finding: "Avoid imagery that encourages standing outside in a storm.",
        },
        {
          role: "Originality Reviewer",
          finding: "Avoid generic AI-storm montages.",
        },
        {
          role: "Confusion Detector",
          finding: "Label time compression in the race visualization.",
        },
      ],
      scope:
        "IDEA_GATE / concept-package review only. VISUAL, EDIT, RIGHTS and FINAL gates remain unpassed.",
    };
  }
  throw new Error("Unknown production stage");
}
export class OllamaProvider implements TextProvider {
  async reply(agent: Agent, question: string, context: string) {
    const base = new URL(process.env.OLLAMA_URL || "http://127.0.0.1:11434");
    if (!["localhost", "127.0.0.1", "[::1]"].includes(base.hostname))
      throw new Error("Only a local Ollama endpoint is supported");
    const model = process.env.OLLAMA_MODEL;
    if (!model || model.includes("cloud"))
      throw new Error("Set OLLAMA_MODEL to an installed local model");
    const res = await fetch(new URL("/api/chat", base), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        think: false,
        options: { num_ctx: 4096, num_predict: 700 },
        messages: [
          {
            role: "system",
            content: `You are ${agent.name}, an AI ${agent.role}. Use only the supplied company state for factual status. You cannot execute actions or claim to have completed work. Be concise. Context: ${context}`,
          },
          { role: "user", content: question },
        ],
      }),
      signal: AbortSignal.timeout(120000),
    });
    if (!res.ok) throw new Error("Local model is unavailable");
    const data = await res.json();
    if (typeof data?.message?.content !== "string")
      throw new Error("Invalid model response");
    return data.message.content.slice(0, 12000);
  }
}
