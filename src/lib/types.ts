export type AgentStatus =
  | "OFFLINE"
  | "IDLE"
  | "QUEUED"
  | "WORKING"
  | "WAITING"
  | "BLOCKED"
  | "REVIEWING"
  | "REVISION_REQUIRED"
  | "COMPLETE"
  | "FAILED";
export type Project = {
  id: string;
  title: string;
  objective: string;
  status: string;
  stage: string;
  revision: number;
  priority: number;
  created_at: string;
  updated_at: string;
  error: string | null;
};
export type Agent = {
  id: string;
  name: string;
  role: string;
  department: string;
  specialty: string;
  style: string;
  strengths: string;
  responsibilities: string;
  avatar: string;
  status: AgentStatus;
  task_id: string | null;
};
export type Task = {
  id: string;
  project_id: string;
  parent_task_id: string | null;
  department: string;
  assigned_agent: string;
  stage: string;
  title: string;
  status: string;
  priority: number;
  dependencies: string;
  attempt: number;
  created_at: string;
  started_at: string | null;
  updated_at: string;
  finished_at: string | null;
  input_artifacts: string;
  output_artifacts: string;
  error: string | null;
  quality_score: number | null;
  founder_approval_required: number;
  revision: number;
};
export type Artifact = {
  id: string;
  project_id: string;
  kind: string;
  title: string;
  body: string;
  version: number;
  approved: number;
  created_at: string;
};
export type CompanyEvent = {
  id: number;
  project_id: string | null;
  agent_id: string | null;
  message: string;
  kind: string;
  created_at: string;
};
export type Message = {
  id: number;
  agent_id: string;
  project_id: string | null;
  role: string;
  body: string;
  created_at: string;
};
export type Approval = {
  id: string;
  project_id: string;
  artifact_id: string;
  status: string;
  feedback: string | null;
  created_at: string;
  decided_at: string | null;
};
export type Memory = {
  id: number;
  project_id: string | null;
  category: string;
  body: string;
  created_at: string;
};
export type Snapshot = {
  projects: Project[];
  agents: Agent[];
  tasks: Task[];
  artifacts: Artifact[];
  events: CompanyEvent[];
  messages: Message[];
  approvals: Approval[];
  memory: Memory[];
  worker: { alive: boolean; updated_at: string | null };
  mode: string;
};
export const STAGES = [
  ["research", "Research brief", "research", "maya"],
  ["facts", "Evidence review", "quality", "elena"],
  ["idea-a", "Surprising facts", "story", "iris"],
  ["idea-b", "Human stories", "story", "leo"],
  ["idea-c", "Visual spectacle", "creative", "nova"],
  ["idea-d", "Under-covered angles", "research", "theo"],
  ["idea-e", "Shareable curiosity", "story", "zara"],
  ["judge", "Independent idea jury", "executive", "atlas"],
  ["hooks", "Hook competition", "story", "leo"],
  ["scripts", "Script competition", "story", "iris"],
  ["storyboard", "Storyboard", "creative", "nova"],
  ["quality", "Quality review", "quality", "elena"],
  ["founder", "Founder review", "executive", "atlas"],
] as const;
export const ROOMS = [
  {
    id: "executive",
    name: "Executive room",
    accent: "#c4a77d",
    label: "Strategy & direction",
  },
  {
    id: "research",
    name: "Research lab",
    accent: "#70b7ed",
    label: "Evidence before everything",
  },
  {
    id: "story",
    name: "Writers room",
    accent: "#bdabef",
    label: "Fascination. Story. Value.",
  },
  {
    id: "creative",
    name: "Creative studio",
    accent: "#e0a27e",
    label: "Ideas made visible",
  },
  {
    id: "animation",
    name: "Animation studio",
    accent: "#b59be8",
    label: "Motion & explanation",
  },
  {
    id: "production",
    name: "Editing bay",
    accent: "#77c4b7",
    label: "The story comes together",
  },
  {
    id: "audio",
    name: "Audio studio",
    accent: "#d5b37d",
    label: "Voice, music & atmosphere",
  },
  {
    id: "packaging",
    name: "Thumbnail lab",
    accent: "#b4ca79",
    label: "An honest first impression",
  },
  {
    id: "marketing",
    name: "Marketing room",
    accent: "#dc9eae",
    label: "Find the right audience",
  },
  {
    id: "advertising",
    name: "Advertising room",
    accent: "#d9b77c",
    label: "Founder approval required",
  },
  {
    id: "analytics",
    name: "Analytics room",
    accent: "#80b9d3",
    label: "Learn from every story",
  },
  {
    id: "quality",
    name: "Quality & trust",
    accent: "#87bdae",
    label: "Earn the audience’s trust",
  },
  {
    id: "render",
    name: "Render farm",
    accent: "#a8b1c5",
    label: "4K / 60 fps target · planned",
  },
];
