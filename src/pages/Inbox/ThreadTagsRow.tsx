import type { Tag } from "@/types";

interface ThreadTagsRowProps {
  tagNames: string[];
  allTags: Tag[];
}

const MAX_VISIBLE = 2;

function resolveColor(name: string, allTags: Tag[]): string | null {
  return allTags.find((t) => t.name === name)?.color ?? null;
}

export function ThreadTagsRow({ tagNames, allTags }: ThreadTagsRowProps) {
  if (tagNames.length === 0) return null;

  const visible  = tagNames.slice(0, MAX_VISIBLE);
  const overflow = tagNames.length - MAX_VISIBLE;

  return (
    <div className="flex items-center gap-1 mt-1.5 flex-wrap">
      {visible.map((name) => {
        const color = resolveColor(name, allTags);
        return (
          <span
            key={name}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 border border-gray-200 text-gray-700 leading-none"
          >
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: color ?? "#d1d5db" }}
            />
            {name}
          </span>
        );
      })}

      {overflow > 0 && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium leading-none bg-gray-100 text-gray-500 border border-gray-200">
          +{overflow}
        </span>
      )}
    </div>
  );
}
