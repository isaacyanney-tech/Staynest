"use client";
import { useActionState, useEffect, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { ArrowDown, ArrowUp, History, Plus, Trash2 } from "lucide-react";
import { restoreRevision, saveSection } from "@/lib/actions/content";
import { emptyItem, sameContent, withDefaults, type FieldSpec } from "@/lib/cms/fields";
import { formatDate } from "@/lib/format";
import { idle, type FormState } from "@/lib/forms";
import type { EditorOptions } from "@/lib/admin/content";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { Notice } from "@/components/ui/states";
import { SafeImage } from "@/components/hostels/safe-image";

type Obj = Record<string, unknown>;
type Revision = { id: number; action: string; createdAt: string; author: string };

const REVISION_LABEL: Record<string, string> = { publish: "Published", unpublish: "Taken off the site", revert: "Restored to the draft" };

function setAt(root: Obj, path: (string | number)[], value: unknown): Obj {
  const [head, ...rest] = path;
  const copy: Obj | unknown[] = Array.isArray(root) ? [...root] : { ...root };
  (copy as Obj)[head as string] = rest.length ? setAt(((root as Obj)[head as string] ?? {}) as Obj, rest, value) : value;
  return copy as Obj;
}

/**
 * Edits one section's draft. Content lives in client state and is sent as
 * JSON on submit, without a form action, so React never resets the inputs.
 */
export function SectionEditor({
  sectionId,
  fields,
  initial,
  options,
  revisions,
  aside,
}: {
  sectionId: string;
  fields: FieldSpec[];
  initial: Obj;
  options: EditorOptions;
  revisions: Revision[];
  aside: ReactNode;
}) {
  const [content, setContent] = useState<Obj>(initial);
  const [saved, setSaved] = useState<Obj>(initial);
  const [sent, setSent] = useState<Obj>(initial);
  const [state, dispatch, pending] = useActionState(saveSection, idle);
  const [restoring, startRestore] = useTransition();
  const [restoreNote, setRestoreNote] = useState<FormState>(idle);
  const [, startSubmit] = useTransition();
  const dirty = !sameContent(content, saved);
  const err = (path: string) => state.fieldErrors?.[path]?.[0];

  // Warn before leaving with edits that are not saved.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const [lastState, setLastState] = useState(state);
  if (state !== lastState) {
    setLastState(state);
    if (state.status === "success") setSaved(sent);
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const fd = new FormData();
    fd.set("sectionId", sectionId);
    fd.set("intent", submitter?.value === "publish" ? "publish" : "save");
    fd.set("content", JSON.stringify(content));
    setSent(content);
    setRestoreNote(idle);
    startSubmit(() => dispatch(fd));
  }

  function restore(id: number) {
    startRestore(async () => {
      const result = await restoreRevision(id);
      if (result.status === "success" && result.content && typeof result.content === "object" && !Array.isArray(result.content)) {
        const next = withDefaults(fields, result.content);
        setContent(next);
        setSaved(next);
      }
      setRestoreNote({ status: result.status, message: result.message });
    });
  }

  return (
    <div className="mt-6 lg:grid lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start lg:gap-8">
      <form onSubmit={submit} className="min-w-0 space-y-6 rounded-lg border border-line bg-surface p-5" noValidate>
        <FormMessage state={restoreNote.status !== "idle" ? restoreNote : state} />
        {err("_form") && <Notice tone="danger">{err("_form")}</Notice>}
        <Fields fields={fields} value={content} path={[]} onChange={(path, v) => setContent((c) => setAt(c, path, v))} err={err} options={options} />
        <div className="sticky bottom-0 -mx-5 -mb-5 flex flex-wrap items-center gap-3 rounded-b-lg border-t border-line bg-surface/95 px-5 py-4 backdrop-blur">
          <Button type="submit" name="intent" value="save" variant="outline" disabled={pending}>
            {pending ? "Saving…" : "Save draft"}
          </Button>
          <Button type="submit" name="intent" value="publish" disabled={pending}>
            Save and publish
          </Button>
          <span role="status" className="text-sm text-ink/75">
            {dirty ? "You have unsaved edits." : "All edits saved."}
          </span>
          {dirty && (
            <button type="button" onClick={() => setContent(saved)} className="ml-auto text-sm font-medium text-ink/75 underline-offset-2 hover:text-danger hover:underline">
              Undo unsaved edits
            </button>
          )}
        </div>
      </form>

      <aside className="mt-8 space-y-4 lg:sticky lg:top-6 lg:mt-0">
        {aside}
        <section className="rounded-lg border border-line bg-surface p-4">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink/70">
            <History className="size-4" aria-hidden />
            Earlier versions
          </h2>
          {revisions.length === 0 ? (
            <p className="text-sm text-ink/75">Nothing has been published yet.</p>
          ) : (
            <ol className="divide-y divide-line text-sm">
              {revisions.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0">
                    <span className="block font-medium">{REVISION_LABEL[r.action] ?? r.action}</span>
                    <span className="block text-ink/70">
                      {formatDate(r.createdAt, { dateStyle: "medium", timeStyle: "short" })} · {r.author}
                    </span>
                  </span>
                  <Button type="button" size="sm" variant="ghost" disabled={restoring || pending} onClick={() => restore(r.id)} aria-label={`Restore the version from ${formatDate(r.createdAt, { dateStyle: "medium", timeStyle: "short" })}`}>
                    Restore
                  </Button>
                </li>
              ))}
            </ol>
          )}
          <p className="mt-2 text-xs text-ink/70">Restoring copies a version into the draft. Nothing changes on the site until you publish.</p>
        </section>
      </aside>
    </div>
  );
}

type FieldsProps = {
  fields: FieldSpec[];
  value: Obj;
  path: (string | number)[];
  onChange: (path: (string | number)[], value: unknown) => void;
  err: (path: string) => string | undefined;
  options: EditorOptions;
};

function Fields({ fields, value, path, onChange, err, options }: FieldsProps) {
  return (
    <>
      {fields.map((f) => (
        <FieldControl key={f.name} field={f} value={value[f.name]} path={[...path, f.name]} onChange={onChange} err={err} options={options} />
      ))}
    </>
  );
}

function FieldControl({ field, value, path, onChange, err, options }: Omit<FieldsProps, "fields" | "value"> & { field: FieldSpec; value: unknown }) {
  const key = path.join(".");
  const set = (v: unknown) => onChange(path, v);
  const common = { label: field.label, name: key, idPrefix: "cms-", hint: field.hint, error: err(key) };

  switch (field.kind) {
    case "text":
      return (
        <Field {...common} optional={!field.required}>
          {(p) => <Input {...p} value={String(value ?? "")} maxLength={field.max} onChange={(e) => set(e.target.value)} />}
        </Field>
      );
    case "textarea":
      return (
        <Field {...common} optional={!field.required}>
          {(p) => (
            <Textarea
              {...p}
              value={String(value ?? "")}
              rows={field.rows ?? 3}
              maxLength={field.max}
              onChange={(e) => set(e.target.value)}
              className={field.markdown ? "font-mono text-sm" : undefined}
            />
          )}
        </Field>
      );
    case "count":
      return (
        <Field {...common}>
          {(p) => (
            <Select {...p} value={String(value ?? field.min)} onChange={(e) => set(Number(e.target.value))} className="max-w-28">
              {Array.from({ length: field.max - field.min + 1 }, (_, i) => field.min + i).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
          )}
        </Field>
      );
    case "link": {
      const link = value as { label: string; href: string } | null | undefined;
      return (
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">{field.label}</legend>
          {field.optional && (
            <label className="flex cursor-pointer items-center gap-2.5 text-[0.9375rem]">
              <input type="checkbox" checked={Boolean(link)} onChange={(e) => set(e.target.checked ? { label: "", href: "" } : null)} className="size-4 accent-[var(--brand-primary)]" />
              Show this link
            </label>
          )}
          {link && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Text" name={`${key}.label`} idPrefix="cms-" error={err(`${key}.label`)}>
                {(p) => <Input {...p} value={link.label} maxLength={40} onChange={(e) => set({ ...link, label: e.target.value })} />}
              </Field>
              <Field label="Goes to" name={`${key}.href`} idPrefix="cms-" hint="A path like /hostels or a full https:// link." error={err(`${key}.href`)}>
                {(p) => <Input {...p} value={link.href} maxLength={300} onChange={(e) => set({ ...link, href: e.target.value })} />}
              </Field>
            </div>
          )}
        </fieldset>
      );
    }
    case "media": {
      const chosen = options.media.find((m) => m.id === value);
      return (
        <Field {...common} optional>
          {(p) => (
            <div className="flex flex-wrap items-start gap-4">
              <Select {...p} value={String(value ?? "")} onChange={(e) => set(e.target.value || null)} className="max-w-sm flex-1">
                <option value="">No image</option>
                {options.media.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.alt || "Untitled image"}
                    {m.illustrative ? " (illustrative)" : ""}
                  </option>
                ))}
              </Select>
              {chosen && (
                <div className="relative aspect-[4/3] w-36 overflow-hidden rounded-md bg-sunken">
                  <SafeImage src={chosen.url} alt={chosen.alt} fill sizes="144px" className="object-cover" />
                </div>
              )}
            </div>
          )}
        </Field>
      );
    }
    case "choices": {
      const picked = Array.isArray(value) ? (value as string[]) : [];
      const list = options[field.source];
      const full = picked.length >= field.max;
      return (
        <fieldset aria-describedby={field.hint ? `cms-${key}-hint` : undefined}>
          <legend className="flex w-full items-baseline justify-between text-sm font-medium">
            {field.label}
            <span className="text-xs font-normal text-ink/70">
              {picked.length} of up to {field.max}
            </span>
          </legend>
          {field.hint && (
            <p id={`cms-${key}-hint`} className="mt-1 text-[0.8125rem] text-muted">
              {field.hint}
            </p>
          )}
          {list.length === 0 ? (
            <p className="mt-2 text-sm text-ink/75">Nothing to choose from yet.</p>
          ) : (
            <div className="mt-2 grid max-h-64 gap-1.5 overflow-y-auto rounded-md border border-line p-3 sm:grid-cols-2">
              {list.map((o) => {
                const on = picked.includes(o.value);
                return (
                  <label key={o.value} className="flex cursor-pointer items-start gap-2 text-sm has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60">
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={!on && full}
                      onChange={() => set(on ? picked.filter((s) => s !== o.value) : [...picked, o.value])}
                      className="mt-0.5 size-4 shrink-0 accent-[var(--brand-primary)]"
                    />
                    {o.label}
                  </label>
                );
              })}
            </div>
          )}
          {err(key) && <p className="mt-1.5 text-[0.8125rem] font-medium text-danger">{err(key)}</p>}
        </fieldset>
      );
    }
    case "list": {
      const items = Array.isArray(value) ? (value as Obj[]) : [];
      const move = (from: number, to: number) => {
        const next = [...items];
        [next[from], next[to]] = [next[to], next[from]];
        set(next);
      };
      return (
        <fieldset>
          <legend className="text-sm font-medium">{field.label}</legend>
          {field.hint && <p className="mt-1 text-[0.8125rem] text-muted">{field.hint}</p>}
          {err(key) && <p className="mt-1.5 text-[0.8125rem] font-medium text-danger">{err(key)}</p>}
          <ol className="mt-3 space-y-3">
            {items.map((item, i) => (
              <li key={i} className="rounded-md border border-line bg-bg p-4">
                <fieldset className="space-y-3" aria-labelledby={`cms-${key}-${i}-legend`}>
                  <legend className="flex w-full items-center justify-between gap-2 text-sm font-semibold">
                    <span id={`cms-${key}-${i}-legend`}>
                      {field.itemLabel} {i + 1}
                    </span>
                    <span className="flex gap-1">
                      <IconButton label={`Move ${field.itemLabel.toLowerCase()} ${i + 1} up`} disabled={i === 0} onClick={() => move(i, i - 1)}>
                        <ArrowUp className="size-4" aria-hidden />
                      </IconButton>
                      <IconButton label={`Move ${field.itemLabel.toLowerCase()} ${i + 1} down`} disabled={i === items.length - 1} onClick={() => move(i, i + 1)}>
                        <ArrowDown className="size-4" aria-hidden />
                      </IconButton>
                      <IconButton label={`Remove ${field.itemLabel.toLowerCase()} ${i + 1}`} disabled={items.length <= field.min} onClick={() => set(items.filter((_, j) => j !== i))}>
                        <Trash2 className="size-4" aria-hidden />
                      </IconButton>
                    </span>
                  </legend>
                  <Fields fields={field.fields} value={item} path={[...path, i]} onChange={onChange} err={err} options={options} />
                </fieldset>
              </li>
            ))}
          </ol>
          <Button type="button" size="sm" variant="outline" className="mt-3" disabled={items.length >= field.max} onClick={() => set([...items, emptyItem(field.fields)])}>
            <Plus className="size-4" aria-hidden />
            Add {field.itemLabel.toLowerCase()}
          </Button>
        </fieldset>
      );
    }
  }
}

function IconButton({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex size-8 items-center justify-center rounded-md text-ink/75 hover:bg-sunken hover:text-ink disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
    </button>
  );
}
