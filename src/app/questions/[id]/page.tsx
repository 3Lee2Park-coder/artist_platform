import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ id: string }>;
};

/** /questions/:id → /my/questions/:id (메일·북마크 호환) */
export default async function QuestionsIdRedirect({ params }: PageProps) {
  const { id } = await params;
  if (!id) redirect("/my#inbox");
  redirect(`/my/questions/${encodeURIComponent(id)}`);
}
