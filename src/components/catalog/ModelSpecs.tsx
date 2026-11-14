import { SpecList } from "@/components/ui/SpecList";
import type { SpecGroup } from "@/lib/catalog/spec-groups";

type ModelSpecsProps = {
  groups: SpecGroup[];
  groupLabels: Record<string, string>;
  specLabels: Record<string, string>;
};

function dimHighlightFor(
  key: string,
): "width" | "height" | "both" | undefined {
  if (key === "dimensionsMm") return "both";
  if (key === "workingWidthMm") return "width";
  return undefined;
}

export function ModelSpecs({
  groups,
  groupLabels,
  specLabels,
}: ModelSpecsProps) {
  if (groups.length === 0) return null;

  return (
    <div className="model-specs">
      {groups.map((group) => (
        <section
          key={group.id}
          className="model-spec-group"
          aria-labelledby={`spec-${group.id}`}
        >
          <h2 id={`spec-${group.id}`} className="model-spec-heading">
            {groupLabels[group.id] ?? group.id}
          </h2>
          <SpecList
            items={group.items.map((item) => {
              const dimHighlight = dimHighlightFor(item.key);
              return {
                term: specLabels[item.key] ?? item.key,
                description: item.value,
                ...(dimHighlight ? { dimHighlight } : {}),
              };
            })}
          />
        </section>
      ))}
    </div>
  );
}
