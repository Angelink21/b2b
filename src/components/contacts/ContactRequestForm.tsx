"use client";

import { useLocale, useTranslations } from "next-intl";
import { useActionState, useEffect, useId, useRef } from "react";

import { SuccessCheck } from "@/components/motion/SuccessCheck";
import { Button } from "@/components/ui/Button";
import { Field, fieldAria } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Link } from "@/i18n/navigation";
import { submitLead } from "@/lib/leads/actions";
import {
  LEAD_INTENTS,
  initialLeadFormState,
  type LeadIntent,
} from "@/lib/leads/client";
import { useLeadClientMeta } from "@/lib/leads/client-ids";

type ContactRequestFormProps = {
  turnstileSiteKey: string | null;
  idPrefix?: string;
};

function optionalError(
  value: string | undefined,
): { error: string } | Record<string, never> {
  return value ? { error: value } : {};
}

const TOPIC_INTENTS = LEAD_INTENTS;

export function ContactRequestForm({
  turnstileSiteKey,
  idPrefix = "contacts",
}: ContactRequestFormProps) {
  const t = useTranslations("contacts");
  const locale = useLocale();
  const { startedAt, idempotencyKey, ready: clientMetaReady } = useLeadClientMeta();
  const [state, formAction, pending] = useActionState(
    submitLead,
    initialLeadFormState({ intent: "other" }),
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
    const order = ["name", "contact", "intent", "consent", "turnstile"] as const;
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
  const defaultIntent: LeadIntent =
    values.intent && TOPIC_INTENTS.includes(values.intent)
      ? values.intent
      : "other";

  const formKey =
    state.status === "error"
      ? `err-${values.name}|${values.contact}|${Object.keys(state.fieldErrors).join(",")}|${state.formError ?? ""}`
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
  const contactId = `${idPrefix}-contact-${baseId}`;
  const intentId = `${idPrefix}-intent-${baseId}`;
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

      <Field id={intentId} label={t("topic")}>
        <Select id={intentId} name="intent" defaultValue={defaultIntent}>
          <option value="quote">{t("topicQuote")}</option>
          <option value="service">{t("topicService")}</option>
          <option value="other">{t("topicOther")}</option>
        </Select>
      </Field>

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
        <Button
          type="submit"
          variant="primary"
          loading={pending}
          disabled={!clientMetaReady || pending}
        >
          {pending ? t("sending") : t("send")}
        </Button>
      </div>
    </form>
  );
}
