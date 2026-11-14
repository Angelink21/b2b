"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  parseAsInteger,
  parseAsStringLiteral,
  useQueryState,
} from "nuqs";
import {
  useActionState,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { SuccessCheck } from "@/components/motion/SuccessCheck";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Field, fieldAria } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Link } from "@/i18n/navigation";
import { SECTOR_KEYS, type SectorKey } from "@/lib/catalog/schema";
import { parseAsModelSlugs } from "@/lib/catalog/search-params";
import { initialLeadFormState } from "@/lib/leads";
import { submitLead } from "@/lib/leads/actions";

export type ModelOption = { slug: string; name: string };
export type SectorOption = { value: SectorKey; label: string };

type QuoteFormProps = {
  modelCatalog: ModelOption[];
  sectors: SectorOption[];
  turnstileSiteKey: string | null;
  idPrefix?: string;
};

function newClientId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function optionalError(
  value: string | undefined,
): { error: string } | Record<string, never> {
  return value ? { error: value } : {};
}

export function QuoteForm({
  modelCatalog,
  sectors,
  turnstileSiteKey,
  idPrefix = "quote",
}: QuoteFormProps) {
  const t = useTranslations("quote");
  const locale = useLocale();
  const nameBySlug = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of modelCatalog) map.set(item.slug, item.name);
    return map;
  }, [modelCatalog]);

  const [kgParam] = useQueryState("kg", parseAsInteger);
  const [sectorParam] = useQueryState(
    "sector",
    parseAsStringLiteral(SECTOR_KEYS),
  );
  const [modelParam] = useQueryState("m", parseAsModelSlugs);

  /** null = follow URL param; array = user-edited chip list */
  const [modelsOverride, setModelsOverride] = useState<string[] | null>(null);
  const [startedAt] = useState(() => String(Date.now()));
  const [idempotencyKey] = useState(() => newClientId());

  const [state, formAction, pending] = useActionState(
    submitLead,
    initialLeadFormState(),
  );

  const successRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const baseId = useId();

  useEffect(() => {
    if (state.status !== "success") return;
    successRef.current?.focus();
  }, [state.status, state.leadId]);

  useEffect(() => {
    if (state.status !== "error") return;
    const order = [
      "name",
      "contact",
      "sector",
      "kgPerShift",
      "consent",
      "turnstile",
    ] as const;
    const frame = window.requestAnimationFrame(() => {
      for (const key of order) {
        if (!state.fieldErrors[key]) continue;
        const el = formRef.current?.querySelector<HTMLElement>(
          `[name="${key === "turnstile" ? "cf-turnstile-response" : key}"]`,
        );
        el?.focus();
        break;
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [state]);

  useEffect(() => {
    if (!turnstileSiteKey || !turnstileRef.current) return;
    const scriptId = "cf-turnstile-script";
    const render = () => {
      const turnstile = (
        window as unknown as {
          turnstile?: {
            render: (
              el: HTMLElement,
              opts: { sitekey: string; theme: string },
            ) => void;
          };
        }
      ).turnstile;
      if (turnstile && turnstileRef.current && !turnstileRef.current.childElementCount) {
        turnstile.render(turnstileRef.current, {
          sitekey: turnstileSiteKey,
          theme: "auto",
        });
      }
    };
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src =
        "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.onload = render;
      document.body.appendChild(script);
      return;
    }
    render();
  }, [turnstileSiteKey]);

  const values = state.values;
  const defaultKg =
    values.kgPerShift ||
    (kgParam !== null && Number.isFinite(kgParam) ? String(kgParam) : "");
  const defaultSector = values.sector || sectorParam || "";

  const displayedModels =
    state.status === "error" && values.modelSlugs.length > 0
      ? values.modelSlugs
      : (modelsOverride ?? modelParam ?? []);

  const formKey =
    state.status === "error"
      ? `err-${values.name}|${values.contact}|${values.company}|${Object.keys(state.fieldErrors).join(",")}|${state.formError ?? ""}`
      : "idle";

  if (state.status === "success") {
    return (
      <div
        ref={successRef}
        className="quote-success"
        role="status"
        tabIndex={-1}
      >
        <div className="quote-success-head">
          <SuccessCheck />
          <p className="quote-success-title">{t("success")}</p>
        </div>
        <p className="quote-success-next">{t("successNext")}</p>
      </div>
    );
  }

  const nameId = `${idPrefix}-name-${baseId}`;
  const companyId = `${idPrefix}-company-${baseId}`;
  const contactId = `${idPrefix}-contact-${baseId}`;
  const sectorId = `${idPrefix}-sector-${baseId}`;
  const kgId = `${idPrefix}-kg-${baseId}`;
  const commentId = `${idPrefix}-comment-${baseId}`;
  const consentId = `${idPrefix}-consent-${baseId}`;

  return (
    <form
      key={formKey}
      ref={formRef}
      className="quote-form"
      action={formAction}
      noValidate
    >
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="startedAt" value={startedAt} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      {displayedModels.map((slug) => (
        <input key={slug} type="hidden" name="modelSlugs" value={slug} />
      ))}

      <div className="quote-hp" aria-hidden="true">
        <label htmlFor={`${idPrefix}-website-${baseId}`}>{t("honeypot")}</label>
        <input
          id={`${idPrefix}-website-${baseId}`}
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <Field
        id={nameId}
        label={t("name")}
        className="quote-form-full"
        {...optionalError(state.fieldErrors.name)}
      >
        <Input
          {...fieldAria(nameId, optionalError(state.fieldErrors.name))}
          name="name"
          autoComplete="name"
          required
          defaultValue={values.name}
          invalid={Boolean(state.fieldErrors.name)}
        />
      </Field>

      <Field id={companyId} label={t("company")}>
        <Input
          id={companyId}
          name="company"
          autoComplete="organization"
          defaultValue={values.company}
        />
      </Field>

      <Field
        id={contactId}
        label={t("contact")}
        {...optionalError(state.fieldErrors.contact)}
      >
        <Input
          {...fieldAria(contactId, optionalError(state.fieldErrors.contact))}
          name="contact"
          autoComplete="email"
          required
          defaultValue={values.contact}
          invalid={Boolean(state.fieldErrors.contact)}
        />
      </Field>

      <Field
        id={sectorId}
        label={t("site")}
        {...optionalError(state.fieldErrors.sector)}
      >
        <Select
          {...fieldAria(sectorId, optionalError(state.fieldErrors.sector))}
          name="sector"
          defaultValue={defaultSector}
          invalid={Boolean(state.fieldErrors.sector)}
        >
          <option value="">{t("sitePlaceholder")}</option>
          {sectors.map((sector) => (
            <option key={sector.value} value={sector.value}>
              {sector.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        id={kgId}
        label={t("kgPerShift")}
        {...optionalError(state.fieldErrors.kgPerShift)}
      >
        <Input
          {...fieldAria(kgId, optionalError(state.fieldErrors.kgPerShift))}
          name="kgPerShift"
          inputMode="decimal"
          defaultValue={defaultKg}
          invalid={Boolean(state.fieldErrors.kgPerShift)}
        />
      </Field>

      {displayedModels.length > 0 ? (
        <div className="quote-form-full quote-models">
          <p className="field-label" id={`${idPrefix}-models-label`}>
            {t("models")}
          </p>
          <p className="field-hint">{t("modelsHint")}</p>
          <div
            className="quote-model-chips"
            role="list"
            aria-labelledby={`${idPrefix}-models-label`}
          >
            {displayedModels.map((slug) => {
              const name = nameBySlug.get(slug) ?? slug;
              return (
                <div key={slug} role="listitem">
                  <Chip
                    pressed
                    onPressedChange={() => {
                      const current = modelsOverride ?? modelParam ?? [];
                      setModelsOverride(current.filter((item) => item !== slug));
                    }}
                    aria-label={t("removeModel", { name })}
                  >
                    {name}
                  </Chip>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <Field id={commentId} label={t("comment")} className="quote-form-full">
        <Textarea
          id={commentId}
          name="comment"
          rows={4}
          defaultValue={values.comment}
        />
      </Field>

      <div
        className={`quote-form-full quote-consent ${state.fieldErrors.consent ? "is-invalid" : ""}`}
      >
        <input
          id={consentId}
          name="consent"
          type="checkbox"
          value="on"
          required
          defaultChecked={values.consent}
          aria-invalid={state.fieldErrors.consent ? true : undefined}
          aria-describedby={
            state.fieldErrors.consent ? `${consentId}-error` : undefined
          }
        />
        <label htmlFor={consentId}>
          {t("consent")}{" "}
          <Link href="/privacy">{t("consentLink")}</Link>.
        </label>
        {state.fieldErrors.consent ? (
          <p id={`${consentId}-error`} className="field-error" role="alert">
            {state.fieldErrors.consent}
          </p>
        ) : null}
      </div>

      {turnstileSiteKey ? (
        <div className="quote-form-full">
          <div ref={turnstileRef} />
          {state.fieldErrors.turnstile ? (
            <p className="field-error" role="alert">
              {state.fieldErrors.turnstile}
            </p>
          ) : null}
        </div>
      ) : null}

      {state.formError ? (
        <p className="quote-form-full field-error" role="alert">
          {state.formError}
        </p>
      ) : null}

      <div className="quote-form-full">
        <Button type="submit" variant="primary" loading={pending}>
          {pending ? t("sending") : t("send")}
        </Button>
      </div>
    </form>
  );
}

export function QuoteFormFallback() {
  return <div className="quote-form-fallback" aria-hidden="true" />;
}
