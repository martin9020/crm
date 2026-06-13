import { Dashboard } from "@/components/dashboard";
import localProjects from "@/data/projects-sample.json";
import type { Project } from "@/types/project";

export default function Home() {
  return <Dashboard projects={localProjects as Project[]} source="local" />;
}
