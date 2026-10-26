import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AssessmentPreview } from "@/components/assessments/assessment-preview";
import { loadLibraryItem } from "@/lib/dashboard/library";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

/**
 * Preview of one saved assessment, rendered with the same component students
 * see (answers stripped). Reached from a card in Mis evaluaciones and, later,
 * from the class picker.
 */
export default async function LibraryItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getT();
  const item = await loadLibraryItem(id);
  if (!item) notFound();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/aula-virtual/mis-evaluaciones"
          className="-ml-2.5 inline-flex w-fit items-center gap-2 rounded-lg px-2.5 py-1.5 text-base font-semibold text-foreground/70 transition-all hover:bg-surface-muted hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
          {t.library.back}
        </Link>
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-foreground/50">
          <span>
            {t.library.questions(item.content.questions.length)} ·{" "}
            {t.library.points(item.pointsTotal)}
          </span>
          {item.gradeLevel ? <span>· {item.gradeLevel}</span> : null}
          {item.shared ? (
            <span className="rounded-full bg-surface-muted px-2 py-0.5">
              {t.library.tabs.shared}
            </span>
          ) : null}
        </div>
      </div>

      <AssessmentPreview
        draft={{
          title: item.title,
          kind: item.kind,
          subjectId: item.subjectId,
          topicId: null,
          dueAt: null,
          allowPhotoSubmission: false,
          instructions: item.instructions,
          content: item.content,
        }}
      />
    </div>
  );
}
