"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Chip } from "@/components/ui/Chip";
import { DataTable } from "@/components/ui/DataTable";
import { RangeDual } from "@/components/ui/RangeDual";
import { Stat } from "@/components/ui/Stat";

type SampleRow = { id: string; name: string; load: number; power: number };

const SAMPLE_ROWS: SampleRow[] = [
  { id: "a", name: "LAP-08 TP2 E", load: 9, power: 2.1 },
  { id: "b", name: "LA-22 TP2 HW", load: 22, power: 14.2 },
  { id: "c", name: "SRP-08 TP2 G", load: 8, power: 7.5 },
];

export function StyleguideChips() {
  const t = useTranslations("styleguide");
  const [washers, setWashers] = useState(true);
  const [dryers, setDryers] = useState(false);

  return (
    <div className="styleguide-row">
      <Chip pressed={washers} onPressedChange={setWashers}>
        {t("chipWashers")}
      </Chip>
      <Chip pressed={dryers} onPressedChange={setDryers}>
        {t("chipDryers")}
      </Chip>
    </div>
  );
}

export function StyleguideRange() {
  const t = useTranslations("styleguide");
  const [range, setRange] = useState({ min: 23, max: 53 });

  return (
    <div className="max-w-xl">
      <RangeDual
        min={8}
        max={130}
        valueMin={range.min}
        valueMax={range.max}
        onChange={setRange}
        unit={t("unitKg")}
        valueTextFrom={t("from")}
        valueTextTo={t("to")}
        labelMin={t("rangeMin")}
        labelMax={t("rangeMax")}
      />
      <div className="mt-4">
        <Stat
          live
          value={`${range.min}–${range.max} ${t("unitKg")}`}
          label={t("statLabel")}
        />
      </div>
    </div>
  );
}

export function StyleguideTable({ empty = false }: { empty?: boolean }) {
  const t = useTranslations("styleguide");

  return (
    <div data-sg={empty ? "table-empty" : "table"}>
      <DataTable
        caption={t("tableCaption")}
        rows={empty ? [] : SAMPLE_ROWS}
        rowKey={(row) => row.id}
        empty={<p>{t("tableEmpty")}</p>}
        columns={[
          {
            id: "name",
            header: t("colName"),
            sortable: true,
            sortValue: (row) => row.name,
            cell: (row) => row.name,
          },
          {
            id: "load",
            header: t("colLoad"),
            sortable: true,
            sortValue: (row) => row.load,
            cell: (row) => `${row.load} ${t("unitKg")}`,
          },
          {
            id: "power",
            header: t("colPower"),
            sortable: true,
            sortValue: (row) => row.power,
            cell: (row) => String(row.power),
          },
        ]}
      />
    </div>
  );
}
