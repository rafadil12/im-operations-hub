"use client";

import { useEffect, useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { apiGetAbs, getApiErrorMessage } from "@/lib/apiClient";
import { localizedField, localizedName, useLang } from "@/lib/i18n";
import {
  divisionColor,
  trainingText,
  type TrainingDivision,
  type TrainingLanguage,
  type TrainingParticipantName,
  type TrainingSession,
} from "@/lib/training";

type FormState = {
  sessionDate: string;
  divisionId: number | "";
  topicEn: string;
  topicCn: string;
  participants: TrainingParticipantName[];
  file: File | null;
  removeAttachment: boolean;
};

const emptyForm = (defaultDivisionId: number | "" = ""): FormState => ({
  sessionDate: new Date().toISOString().slice(0, 10),
  divisionId: defaultDivisionId,
  topicEn: "",
  topicCn: "",
  participants: [],
  file: null,
  removeAttachment: false,
});

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];
const ctrl =
  "rounded-md border border-border bg-bg/40 px-2.5 py-1.5 text-xs text-text outline-none focus:border-accent";
const th = "px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-text-dim";
const td = "px-3 py-2 align-top text-xs text-text-muted";

function participantKey(person: TrainingParticipantName): string {
  return person.nameEn.trim().toUpperCase();
}

export function TrainingActivitiesClient() {
  const { lang, t } = useLang();
  const language = lang as TrainingLanguage;
  const access = useRoleAccess();
  const { success: toastSuccess, error: toastError } = useToast();

  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [divisions, setDivisions] = useState<TrainingDivision[]>([]);
  const [master, setMaster] = useState<TrainingParticipantName[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [divisionFilter, setDivisionFilter] = useState<number | "all">("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TrainingSession | null>(null);
  const [deleteRow, setDeleteRow] = useState<TrainingSession | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [newNameEn, setNewNameEn] = useState("");
  const [newNameCn, setNewNameCn] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canCreate = access.canCreateTrainingSession;
  const canUpdate = access.canUpdateTrainingSession;
  const canDelete = access.canDeleteTrainingSession;

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (divisionFilter !== "all") qs.set("divisionId", String(divisionFilter));
      if (q.trim()) qs.set("q", q.trim());

      const [sessionsRes, masterRes] = await Promise.all([
        apiGetAbs<{
          success: boolean;
          data: TrainingSession[];
          divisions?: TrainingDivision[];
          error?: string;
        }>(`/api/training/sessions${qs.toString() ? `?${qs}` : ""}`),
        apiGetAbs<{
          success: boolean;
          data: { nameEn: string; nameCn: string }[];
          error?: string;
        }>("/api/training/participants"),
      ]);

      if (!sessionsRes.success) throw new Error(sessionsRes.error ?? "Failed");
      if (!masterRes.success) throw new Error(masterRes.error ?? "Failed");

      setSessions(sessionsRes.data ?? []);
      setDivisions(sessionsRes.divisions ?? []);
      setMaster(
        (masterRes.data ?? []).map((row) => ({
          nameEn: row.nameEn,
          nameCn: row.nameCn,
        }))
      );
    } catch (err) {
      setError(getApiErrorMessage(err) || trainingText("errorLoad", language));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload on filter change
  }, [divisionFilter]);

  const openCreate = () => {
    setEditing(null);
    setNewNameEn("");
    setNewNameCn("");
    setForm(emptyForm(divisions[0]?.id ?? ""));
    setModalOpen(true);
  };

  const openEdit = (session: TrainingSession) => {
    setEditing(session);
    setNewNameEn("");
    setNewNameCn("");
    setForm({
      sessionDate: session.sessionDate,
      divisionId: session.divisionId,
      topicEn: session.topicEn,
      topicCn: session.topicCn,
      participants: [...session.participants],
      file: null,
      removeAttachment: false,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const toggleParticipant = (person: TrainingParticipantName) => {
    const key = participantKey(person);
    setForm((prev) => {
      const exists = prev.participants.some((item) => participantKey(item) === key);
      return {
        ...prev,
        participants: exists
          ? prev.participants.filter((item) => participantKey(item) !== key)
          : [...prev.participants, person],
      };
    });
  };

  const addParticipant = () => {
    const nameEn = newNameEn.trim().toUpperCase();
    const nameCn = newNameCn.trim();
    if (!nameEn || !nameCn) {
      toastError(trainingText("requiredParticipantNames", language));
      return;
    }
    setForm((prev) => {
      const key = nameEn;
      if (prev.participants.some((item) => participantKey(item) === key)) return prev;
      return {
        ...prev,
        participants: [...prev.participants, { nameEn, nameCn }],
      };
    });
    setNewNameEn("");
    setNewNameCn("");
  };

  const save = async () => {
    if (
      !form.sessionDate ||
      !form.divisionId ||
      !(form.topicEn.trim() || form.topicCn.trim())
    ) {
      toastError(trainingText("requiredFields", language));
      return;
    }

    setSaving(true);
    try {
      const body = new FormData();
      body.set("sessionDate", form.sessionDate);
      body.set("divisionId", String(form.divisionId));
      body.set("topicEn", form.topicEn.trim());
      body.set("topicCn", form.topicCn.trim());
      body.set("participants", JSON.stringify(form.participants));
      if (form.file) body.set("file", form.file);
      if (editing && form.removeAttachment) body.set("removeAttachment", "1");

      const url = editing ? `/api/training/sessions/${editing.id}` : "/api/training/sessions";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, { method, body });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? trainingText("errorSave", language));
      }

      closeModal();
      toastSuccess(trainingText("saved", language));
      await load();
    } catch (err) {
      toastError(getApiErrorMessage(err) || trainingText("errorSave", language));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteRow) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/training/sessions/${deleteRow.id}`, { method: "DELETE" });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? trainingText("errorDelete", language));
      }
      setDeleteRow(null);
      toastSuccess(trainingText("deleted", language));
      await load();
    } catch (err) {
      toastError(getApiErrorMessage(err) || trainingText("errorDelete", language));
    } finally {
      setDeleting(false);
    }
  };

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return sessions;
    return sessions.filter(
      (row) =>
        row.topicEn.toLowerCase().includes(term) ||
        row.topicCn.toLowerCase().includes(term) ||
        row.participants.some(
          (person) =>
            person.nameEn.toLowerCase().includes(term) ||
            person.nameCn.toLowerCase().includes(term)
        )
    );
  }, [sessions, q]);

  const participantOptions = useMemo(() => {
    const map = new Map<string, TrainingParticipantName>();
    for (const person of [...master, ...form.participants]) {
      map.set(participantKey(person), person);
    }
    return [...map.values()].sort((a, b) => a.nameEn.localeCompare(b.nameEn));
  }, [master, form.participants]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);
  const from = filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, filtered.length);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-text">{trainingText("activitiesTitle", language)}</h1>
          <p className="text-sm text-text-muted">{trainingText("activitiesDesc", language)}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text hover:bg-surface-hover disabled:opacity-60"
          >
            {loading ? t.common.loading : "Refresh"}
          </button>
          {canCreate ? (
            <button
              type="button"
              onClick={openCreate}
              className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
            >
              + {trainingText("addSession", language)}
            </button>
          ) : null}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-border-subtle bg-surface p-3">
        <div>
          <label className="mb-1 block text-[10px] uppercase text-text-dim">
            {trainingText("filterDivision", language)}
          </label>
          <select
            value={divisionFilter === "all" ? "all" : String(divisionFilter)}
            onChange={(e) => {
              const value = e.target.value;
              setDivisionFilter(value === "all" ? "all" : Number(value));
              setPage(1);
            }}
            className={ctrl}
          >
            <option value="all">{trainingText("allDivisions", language)}</option>
            {divisions.map((item) => (
              <option key={item.id} value={item.id}>
                {localizedName({ name_en: item.nameEn, name_cn: item.nameCn }, lang)}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-40 flex-1">
          <label className="mb-1 block text-[10px] uppercase text-text-dim">{t.common.search}</label>
          <input
            type="text"
            className={`${ctrl} w-full`}
            placeholder={trainingText("search", language)}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {error ? (
        <p className="mb-3 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="rounded-lg border border-border-subtle bg-surface p-8 text-center text-sm text-text-muted">
          {t.common.loading}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-border-subtle bg-surface p-8 text-center text-sm text-text-muted">
          {trainingText("noSessions", language)}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border-subtle bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="border-b border-border-subtle bg-bg/40">
                <tr>
                  <th className={th}>{trainingText("date", language)}</th>
                  <th className={th}>{trainingText("topic", language)}</th>
                  <th className={th}>{trainingText("division", language)}</th>
                  <th className={th}>{trainingText("participants", language)}</th>
                  <th className={th}>{trainingText("count", language)}</th>
                  <th className={th}>{trainingText("attachment", language)}</th>
                  <th className={th}>{t.common.actions}</th>
                </tr>
              </thead>
              <tbody>
                {pagedRows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border-subtle/60 last:border-0 hover:bg-surface-hover/50"
                  >
                    <td className={`${td} whitespace-nowrap`}>{row.sessionDate}</td>
                    <td className={`${td} max-w-sm`}>
                      <span className="line-clamp-2 font-medium text-text">
                        {localizedField(row.topicEn, row.topicCn, lang)}
                      </span>
                    </td>
                    <td className={`${td} whitespace-nowrap`}>
                      <span
                        className="inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium text-white"
                        style={{ backgroundColor: divisionColor(row.divisionNameEn) }}
                      >
                        {localizedName(
                          { name_en: row.divisionNameEn, name_cn: row.divisionNameCn },
                          lang
                        )}
                      </span>
                    </td>
                    <td className={`${td} max-w-sm`}>
                      <span className="line-clamp-2">
                        {row.participants
                          .map((person) =>
                            localizedName(
                              { name_en: person.nameEn, name_cn: person.nameCn },
                              lang
                            )
                          )
                          .join(", ") || "—"}
                      </span>
                    </td>
                    <td className={`${td} whitespace-nowrap text-text`}>{row.participantCount}</td>
                    <td className={`${td} whitespace-nowrap`}>
                      {row.attachment ? (
                        <a
                          href={row.attachment.url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded border border-border px-2 py-1 text-[11px] text-text-muted hover:bg-surface-hover hover:text-text"
                        >
                          {trainingText("viewFile", language)}
                        </a>
                      ) : (
                        <span className="text-text-dim">{trainingText("noFile", language)}</span>
                      )}
                    </td>
                    <td className={`${td} whitespace-nowrap`}>
                      {canUpdate || canDelete ? (
                        <div className="flex gap-1.5">
                          {canUpdate ? (
                            <button
                              type="button"
                              onClick={() => openEdit(row)}
                              className="rounded border border-border px-2 py-1 text-[11px] text-text-muted hover:bg-surface-hover hover:text-text"
                            >
                              {t.common.edit}
                            </button>
                          ) : null}
                          {canDelete ? (
                            <button
                              type="button"
                              onClick={() => setDeleteRow(row)}
                              className="rounded border border-danger/40 px-2 py-1 text-[11px] text-danger hover:bg-danger/10"
                            >
                              {t.common.delete}
                            </button>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-text-dim">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle px-3 py-2.5 text-xs text-text-muted">
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2">
                <span>{t.common.rowsPerPage}</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value) as PageSize);
                    setPage(1);
                  }}
                  className="rounded border border-border bg-surface px-2 py-1 text-xs text-text outline-none focus:border-accent"
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
              <span>
                {t.common.showingRange
                  .replace("{from}", String(from))
                  .replace("{to}", String(to))
                  .replace("{total}", String(filtered.length))}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span>
                {t.common.pageOf
                  .replace("{page}", String(currentPage))
                  .replace("{total}", String(totalPages))}
              </span>
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                className="rounded border border-border px-2.5 py-1 text-[11px] text-text-muted hover:bg-surface-hover hover:text-text disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t.common.previous}
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                className="rounded border border-border px-2.5 py-1 text-[11px] text-text-muted hover:bg-surface-hover hover:text-text disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t.common.next}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalOpen ? (
        <Modal
          title={editing ? trainingText("editSession", language) : trainingText("addSession", language)}
          onClose={closeModal}
          size="lg"
          closeDisabled={saving}
          footer={
            <>
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text-muted hover:bg-surface-hover hover:text-text disabled:pointer-events-none disabled:opacity-50"
              >
                {t.common.cancel}
              </button>
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving}
                aria-busy={saving}
                className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:pointer-events-none disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <span
                      className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white"
                      aria-hidden
                    />
                    {t.common.loading}
                  </>
                ) : (
                  t.common.save
                )}
              </button>
            </>
          }
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-xs text-text-muted">
              {trainingText("date", language)}
              <input
                type="date"
                value={form.sessionDate}
                onChange={(e) => setForm((prev) => ({ ...prev, sessionDate: e.target.value }))}
                className={`mt-1 w-full ${ctrl}`}
              />
            </label>

            <label className="block text-xs text-text-muted">
              {trainingText("division", language)}
              <select
                value={form.divisionId === "" ? "" : String(form.divisionId)}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    divisionId: e.target.value ? Number(e.target.value) : "",
                  }))
                }
                className={`mt-1 w-full ${ctrl}`}
              >
                <option value="" disabled>
                  —
                </option>
                {divisions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {localizedName({ name_en: item.nameEn, name_cn: item.nameCn }, lang)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs text-text-muted">
              {trainingText("topicEn", language)}
              <input
                value={form.topicEn}
                onChange={(e) => setForm((prev) => ({ ...prev, topicEn: e.target.value }))}
                className={`mt-1 w-full ${ctrl}`}
              />
            </label>

            <label className="block text-xs text-text-muted">
              {trainingText("topicCn", language)}
              <input
                value={form.topicCn}
                onChange={(e) => setForm((prev) => ({ ...prev, topicCn: e.target.value }))}
                className={`mt-1 w-full ${ctrl}`}
              />
            </label>

            <div className="md:col-span-2">
              <p className="mb-1 block text-[10px] uppercase text-text-dim">
                {trainingText("selectParticipants", language)}
              </p>
              <div className="rounded-lg border border-border-subtle bg-bg/30 p-3">
                <div className="max-h-40 space-y-1 overflow-y-auto">
                  {participantOptions.length === 0 ? (
                    <p className="text-xs text-text-dim">—</p>
                  ) : (
                    participantOptions.map((person) => {
                      const key = participantKey(person);
                      return (
                        <label key={key} className="flex items-center gap-2 text-sm text-text">
                          <input
                            type="checkbox"
                            checked={form.participants.some((item) => participantKey(item) === key)}
                            onChange={() => toggleParticipant(person)}
                          />
                          {localizedName(
                            { name_en: person.nameEn, name_cn: person.nameCn },
                            lang
                          )}
                        </label>
                      );
                    })
                  )}
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                  <input
                    placeholder={trainingText("nameEn", language)}
                    className={ctrl}
                    value={newNameEn}
                    onChange={(e) => setNewNameEn(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addParticipant();
                      }
                    }}
                  />
                  <input
                    placeholder={trainingText("nameCn", language)}
                    className={ctrl}
                    value={newNameCn}
                    onChange={(e) => setNewNameCn(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addParticipant();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={addParticipant}
                    className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text-muted hover:bg-surface-hover hover:text-text"
                  >
                    {trainingText("addParticipant", language)}
                  </button>
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <p className="mb-1 block text-[10px] uppercase text-text-dim">
                {trainingText("uploadPdf", language)}
              </p>

              {form.file ? (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-border-subtle bg-bg/30 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-text">{form.file.name}</p>
                    <p className="mt-0.5 text-[10px] text-text-dim">
                      {(form.file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 rounded border border-danger/40 px-2 py-1 text-[11px] text-danger hover:bg-danger/10"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        file: null,
                      }))
                    }
                  >
                    {trainingText("removeAttachment", language)}
                  </button>
                </div>
              ) : editing?.attachment && !form.removeAttachment ? (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-border-subtle bg-bg/30 px-3 py-2.5">
                  <a
                    href={editing.attachment.url}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate text-xs font-medium text-accent hover:underline"
                  >
                    {editing.attachment.originalName}
                  </a>
                  <div className="flex shrink-0 gap-1.5">
                    <label className="cursor-pointer rounded border border-border px-2 py-1 text-[11px] text-text-muted hover:bg-surface-hover hover:text-text">
                      {trainingText("replaceAttachment", language)}
                      <input
                        type="file"
                        accept=".pdf,application/pdf"
                        className="sr-only"
                        onChange={(e) => {
                          const next = e.target.files?.[0] ?? null;
                          setForm((prev) => ({
                            ...prev,
                            file: next,
                            removeAttachment: false,
                          }));
                          e.target.value = "";
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      className="rounded border border-danger/40 px-2 py-1 text-[11px] text-danger hover:bg-danger/10"
                      onClick={() => setForm((prev) => ({ ...prev, removeAttachment: true }))}
                    >
                      {trainingText("removeAttachment", language)}
                    </button>
                  </div>
                </div>
              ) : (
                <label className="group flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-bg/30 px-4 py-6 text-center hover:border-accent/60 hover:bg-accent/5">
                  <span className="text-xs font-medium text-text">
                    {trainingText("uploadPdf", language)}
                  </span>
                  <span className="mt-1 text-[10px] text-text-dim">
                    {trainingText("uploadPdfHint", language)}
                  </span>
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    className="sr-only"
                    onChange={(e) => {
                      const next = e.target.files?.[0] ?? null;
                      setForm((prev) => ({
                        ...prev,
                        file: next,
                        removeAttachment: false,
                      }));
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>
          </div>
        </Modal>
      ) : null}

      {deleteRow ? (
        <ConfirmDialog
          title={trainingText("deleteSession", language)}
          message={trainingText("confirmDelete", language)}
          busy={deleting}
          onCancel={() => setDeleteRow(null)}
          onConfirm={confirmDelete}
        />
      ) : null}
    </div>
  );
}
