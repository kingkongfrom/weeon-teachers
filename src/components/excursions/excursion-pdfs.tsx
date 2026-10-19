"use client";

import { PdfFileButton } from "@/components/ui/pdf-reader";
import { PdfThumb } from "@/components/excursions/pdf-thumb";

/** Square first-page preview. Opens the in-app PDF reader. */
export function ExcursionPdfs({
  materials,
}: {
  materials: { id: string; fileName: string; url: string }[];
}) {
  if (materials.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-3">
      {materials.map((material) => {
        const label = material.fileName.replace(/\.pdf$/i, "").trim() || material.fileName;
        return (
          <li key={material.id} className="w-24">
            <PdfFileButton
              url={material.url}
              name={label}
              mimeType="application/pdf"
              className="block w-full text-left"
            >
              <span className="block aspect-square overflow-hidden rounded-xl border border-border bg-white">
                <PdfThumb url={material.url} />
              </span>
              <span className="mt-1 block truncate text-xs font-semibold text-foreground">{label}</span>
            </PdfFileButton>
          </li>
        );
      })}
    </ul>
  );
}
