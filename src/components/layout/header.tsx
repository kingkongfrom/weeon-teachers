import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

type HeaderProps = {
  title: string;
  description?: string;
  showNewReport?: boolean;
};

export function Header({
  title,
  description,
  showNewReport = false,
}: HeaderProps) {
  return (
    <header className="flex items-start justify-between gap-4 border-b border-zinc-200 bg-white px-8 py-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-sm text-zinc-500">{description}</p>
        ) : null}
      </div>

      {showNewReport ? (
        <Link href="/reports/new">
          <Button>
            <Plus className="h-4 w-4" />
            New Report
          </Button>
        </Link>
      ) : null}
    </header>
  );
}
