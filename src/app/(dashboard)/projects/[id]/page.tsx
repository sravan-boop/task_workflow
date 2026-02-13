import { ProjectContent } from "@/components/project/project-content";

interface ProjectPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params;

  return <ProjectContent projectId={id} />;
}
