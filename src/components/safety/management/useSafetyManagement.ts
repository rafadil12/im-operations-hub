"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useLang } from "@/lib/i18n";
import {
  type ActivityType,
  type FilePreview,
  type MonthlyDatabaseRow,
  type MonthlyRecord,
  type SafetyLanguage,
  type SubmissionDetail,
  type SubmissionStatus,
  type UserOption,
  type WeeklyDatabaseFile,
  type WeeklyDatabaseRow,
  type WeeklyRecord,
  INITIAL_MONTHLY_RECORD,
  MONTHLY_ACTIVITIES,
  WEEKLY_ACTIVITIES,
  convertDisplayDateToInput,
  defaultSafetyDateInput,
  databaseActivityToUiActivity,
  formatDate,
  getFileMimeType,
  getMonthlyEvidence,
  getWeekEvidence,
  uiActivityToDatabaseActivity,
} from "@/lib/safety";

export function useSafetyManagement() {
  const { lang } = useLang();
  const { canCreateSafetySubmission, canUpdateSafetySubmission } = useRoleAccess();
  const canMutateSafety = canCreateSafetySubmission || canUpdateSafetySubmission;
  const safetyLanguage: SafetyLanguage = lang;
  const [records, setRecords] = useState<WeeklyRecord[]>([]);
  const [monthly, setMonthly] = useState<MonthlyRecord>(INITIAL_MONTHLY_RECORD);
  const [selectedWeek, setSelectedWeek] = useState(4);
  const [selectedActivity, setSelectedActivity] = useState<ActivityType | null>(null);
  const [selectedMonthlySubmissionId, setSelectedMonthlySubmissionId] = useState<number | null>(
    null
  );
  const [viewDetail, setViewDetail] = useState<{
    title: string;
    detail: SubmissionDetail;
    status: SubmissionStatus;
  } | null>(null);
  const [showEvidenceGallery, setShowEvidenceGallery] = useState(false);
  const [selectedEvidenceIndex, setSelectedEvidenceIndex] = useState(0);
  const [showMonthlyEvidenceGallery, setShowMonthlyEvidenceGallery] = useState(false);
  const [selectedMonthlyEvidenceIndex, setSelectedMonthlyEvidenceIndex] = useState(0);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [filePreviews, setFilePreviews] = useState<FilePreview[]>([]);
  const [descriptionEn, setDescriptionEn] = useState("");
  const [descriptionCn, setDescriptionCn] = useState("");
  const [location, setLocation] = useState("");
  const [pic, setPic] = useState("");
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [date, setDate] = useState(() => defaultSafetyDateInput());
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Bulan aktif untuk seluruh dashboard.
  const initialDate = new Date();
  const [selectedYear, setSelectedYear] = useState(initialDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(initialDate.getMonth() + 1);
  const [safetyPoints, setSafetyPoints] = useState(0);

  const safetyPointsStorageKey = `safety-points-${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(safetyPointsStorageKey);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate points from localStorage
      setSafetyPoints(saved !== null ? Number(saved) || 0 : 0);
    } catch (error) {
      console.error("LOAD SAFETY POINTS ERROR:", error);
      setSafetyPoints(0);
    }
  }, [safetyPointsStorageKey]);

  function handleSafetyPointsChange(value: string) {
    const nextValue = Math.max(0, Number(value) || 0);
    setSafetyPoints(nextValue);

    try {
      window.localStorage.setItem(safetyPointsStorageKey, String(nextValue));
    } catch (error) {
      console.error("SAVE SAFETY POINTS ERROR:", error);
    }
  }

  const monthLabel = new Date(selectedYear, selectedMonth - 1, 1).toLocaleDateString(
    safetyLanguage === "cn" ? "zh-CN" : "en-US",
    {
      month: "long",
      year: "numeric",
    }
  );

  function changeMonth(offset: number) {
    const next = new Date(selectedYear, selectedMonth - 1 + offset, 1);

    setSelectedYear(next.getFullYear());
    setSelectedMonth(next.getMonth() + 1);
    setSelectedWeek(1);
    setSelectedActivity(null);
    setShowUploadModal(false);
    setViewDetail(null);
  }

  const weeklyTotal = records.length * WEEKLY_ACTIVITIES.length;
  const weeklyCompleted = useMemo(
    () =>
      records.reduce(
        (sum, r) => sum + WEEKLY_ACTIVITIES.filter((a) => r[a.recordKey!] === "completed").length,
        0
      ),
    [records]
  );
  const weeklyPending = weeklyTotal - weeklyCompleted;
  const monthlyTargets = 1 + 1 + 1 + 1 + 2;
  const monthlyDone =
    (monthly.fireDrill === "completed" ? 1 : 0) +
    (monthly.monthlyMeeting === "completed" ? 1 : 0) +
    (monthly.hazardCase === "case_found" ? -1 : monthly.hazardCase === "not_applicable" ? 1 : 0) +
    (monthly.safetyPpt === "completed" ? 1 : 0) +
    Math.min(monthly.rewardCount, 2);
  const overallTarget = weeklyTotal + monthlyTargets;
  const overallDone = weeklyCompleted + monthlyDone;
  const overallRate = overallTarget ? Math.round((overallDone / overallTarget) * 100) : 0;
  const selectedWeekRecord = records.find((r) => r.week === selectedWeek) ?? null;
  const evidenceForGallery = selectedWeekRecord ? getWeekEvidence(selectedWeekRecord) : [];
  const monthlyEvidenceForGallery = getMonthlyEvidence(monthly);
  const hazardCaseActive = monthly.hazardCase === "case_found";

  const loadWeeklyData = useCallback(async () => {
    try {
      setLoading(true);

      const year = selectedYear;
      const month = selectedMonth;

      const response = await fetch(`/api/safety/weekly?year=${year}&month=${month}`, {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? result.message ?? "Failed to load weekly safety data.");
      }

      const rows: WeeklyDatabaseRow[] = result.data ?? [];

      // Database is the SINGLE source of truth.
      // The four week rows below are only the display structure;
      // every status/detail comes from safety_submissions.
      const weeks: WeeklyRecord[] = Array.from({ length: 4 }, (_, index) => {
        const week = index + 1;
        const startDay = index * 7 + 1;
        const lastDay = new Date(year, month, 0).getDate();
        const endDay = Math.min(startDay + 6, lastDay);

        const record: WeeklyRecord = {
          week,
          startDate: new Date(year, month - 1, startDay).toLocaleDateString(
            safetyLanguage === "cn" ? "zh-CN" : "en-GB",
            {
              day: "2-digit",
              month: "short",
            }
          ),
          endDate: new Date(year, month - 1, endDay).toLocaleDateString(
            safetyLanguage === "cn" ? "zh-CN" : "en-GB",
            {
              day: "2-digit",
              month: "short",
            }
          ),
          training: "not_submitted",
          routineMeeting: "not_submitted",
          hseTuesday: "not_submitted",
          ert: "not_submitted",
          fiveS: "not_submitted",
          potentialHazard: "not_submitted",
        };

        const weekRows = rows.filter((row) => Number(row.week) === week);

        for (const row of weekRows) {
          const uiActivity = databaseActivityToUiActivity(row.activity_type);

          const activity = WEEKLY_ACTIVITIES.find((item) => item.id === uiActivity);

          if (!activity?.recordKey) continue;

          // Status comes directly from MySQL.
          record[activity.recordKey] = row.status;

          if (activity.dataKey) {
            const databaseFiles = row.files ?? [];

            const filePreviews: FilePreview[] =
              databaseFiles.length > 0
                ? databaseFiles.map((file) => ({
                    name: file.original_name,
                    type: file.mime_type || getFileMimeType(file.original_name),
                    url: file.file_url,
                    size: Number(file.file_size) || 0,
                  }))
                : row.file_url
                  ? [
                      {
                        name: row.file_name ?? "Attachment",
                        type: getFileMimeType(row.file_name ?? ""),
                        url: row.file_url,
                        size: 0,
                      },
                    ]
                  : [];

            record[activity.dataKey] = {
              date: row.submission_date ? formatDate(row.submission_date, safetyLanguage) : "—",
              location: row.location ?? undefined,
              description:
                row.description_en ||
                row.description_cn ||
                row.description ||
                "Dokumentasi safety telah diinput.",
              descriptionEn: row.description_en || row.description || "",
              descriptionCn: row.description_cn || row.description || "",
              pic:
                safetyLanguage === "cn"
                  ? row.pic_cn || row.pic_en || row.pic || "—"
                  : row.pic_en || row.pic_cn || row.pic || "—",
              picEn: row.pic_en || row.pic || "",
              picCn: row.pic_cn || row.pic_en || row.pic || "",
              fileNames: filePreviews.map((file) => file.name),
              fileUrls: filePreviews.map((file) => file.url),
              filePreviews,
            };
          }
        }

        return record;
      });

      setRecords(weeks);
    } catch (error) {
      console.error("Failed to load weekly safety data:", error);

      setRecords([]);

      alert(error instanceof Error ? error.message : "Gagal mengambil data safety dari database.");
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedMonth, safetyLanguage]);

  const loadMonthlyData = useCallback(async () => {
    try {
      const year = selectedYear;
      const month = selectedMonth;

      const response = await fetch(`/api/safety/monthly?year=${year}&month=${month}`, {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ?? result.message ?? "Gagal mengambil data Monthly dari database."
        );
      }

      const rows: MonthlyDatabaseRow[] = result.data ?? [];

      // Default monthly record — no dummy data.
      const next: MonthlyRecord = {
        fireDrill: "not_submitted",
        monthlyMeeting: "not_submitted",
        hazardCase: "not_applicable",
        safetyPpt: "not_submitted",
        rewardFinding: "not_submitted",

        fireDrillData: undefined,
        monthlyMeetingData: undefined,
        hazardCaseData: undefined,
        safetyPptData: undefined,
        rewardFindingData: undefined,
        rewardSubmissions: [],

        rewardCount: 0,
      };

      // Keep the latest row per activity_type.
      const latestByActivity = new Map<string, MonthlyDatabaseRow>();

      for (const row of rows) {
        const old = latestByActivity.get(row.activity_type);

        if (!old || Number(row.id) > Number(old.id)) {
          latestByActivity.set(row.activity_type, row);
        }
      }

      const buildDetail = (row: MonthlyDatabaseRow): SubmissionDetail => {
        const files: WeeklyDatabaseFile[] = Array.isArray(row.files) ? row.files : [];

        const previews: FilePreview[] =
          files.length > 0
            ? files.map((file) => ({
                name: file.original_name || "Attachment",

                type: file.mime_type || getFileMimeType(file.original_name || ""),

                url: file.file_url || "",

                size: Number(file.file_size || 0),
              }))
            : row.file_url
              ? [
                  {
                    name: row.file_name || "Attachment",

                    type: getFileMimeType(row.file_name || ""),

                    url: row.file_url,

                    size: 0,
                  },
                ]
              : [];

        return {
          date: row.submission_date ? formatDate(row.submission_date, safetyLanguage) : "—",

          location: row.location || undefined,

          description:
            row.description_en ||
            row.description_cn ||
            row.description ||
            "Dokumentasi safety telah diinput.",

          descriptionEn: row.description_en || row.description || "",

          descriptionCn: row.description_cn || row.description || "",

          pic:
            safetyLanguage === "cn"
              ? row.pic_cn || row.pic_en || row.pic || "—"
              : row.pic_en || row.pic_cn || row.pic || "—",

          picEn: row.pic_en || row.pic || "",

          picCn: row.pic_cn || row.pic_en || row.pic || "",

          fileNames: previews.map((file) => file.name),

          fileUrls: previews.map((file) => file.url),

          filePreviews: previews,

          verifiedBy: row.verified_by || undefined,

          verifiedAt: row.verified_at || undefined,
        };
      };

      /*
       * FIRE DRILL
       */
      const fireDrill = latestByActivity.get("fire_drill");

      if (fireDrill) {
        next.fireDrill = fireDrill.status;

        next.fireDrillData = buildDetail(fireDrill);
      }

      /*
       * MONTHLY MEETING
       */
      const monthlyMeeting = latestByActivity.get("monthly_meeting");

      if (monthlyMeeting) {
        next.monthlyMeeting = monthlyMeeting.status;

        next.monthlyMeetingData = buildDetail(monthlyMeeting);
      }

      /*
       * SAFETY CASE
       */
      const safetyCase = latestByActivity.get("safety_case");

      if (safetyCase) {
        next.hazardCase = safetyCase.status;

        next.hazardCaseData = buildDetail(safetyCase);
      }

      /*
       * MONTHLY PPT
       */
      const monthlyPpt = latestByActivity.get("monthly_ppt");

      if (monthlyPpt) {
        next.safetyPpt = monthlyPpt.status;

        next.safetyPptData = buildDetail(monthlyPpt);
      }

      /*
       * REWARD FINDING
       *
       * Maksimal 2 record per bulan.
       */
      const rewardRows = rows
        .filter((row) => row.activity_type === "reward_finding")
        .sort((a, b) => Number(a.id) - Number(b.id));

      next.rewardCount = rewardRows.filter((row) => row.status === "completed").length;

      next.rewardSubmissions = rewardRows.map((row) => ({
        id: Number(row.id),
        status: row.status,
        detail: buildDetail(row),
      }));

      const latestReward = rewardRows[rewardRows.length - 1];

      if (latestReward) {
        next.rewardFinding = latestReward.status;

        next.rewardFindingData = buildDetail(latestReward);
      }

      /*
       * Simpan hasil database
       */
      setMonthly(next);
    } catch (error) {
      console.error("LOAD MONTHLY DATA ERROR:", error);

      /*
       * Jangan membuat dummy data.
       * Kalau API gagal, state tidak
       * dipalsukan.
       */
    }
  }, [selectedYear, selectedMonth, safetyLanguage]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch weekly/monthly on period change
    void loadWeeklyData();
    void loadMonthlyData();
  }, [loadWeeklyData, loadMonthlyData]);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoadingUsers(true);

        const response = await fetch("/api/safety/users", {
          method: "GET",
          cache: "no-store",
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error ?? result.message ?? "Gagal mengambil data user.");
        }

        setUsers(result.data ?? []);
      } catch (error) {
        console.error("LOAD USERS ERROR:", error);
        setUsers([]);
      } finally {
        setLoadingUsers(false);
      }
    };

    void loadUsers();
  }, []);

  const selectedMonthDefaultDate = defaultSafetyDateInput(selectedYear, selectedMonth);

  useEffect(() => {
    if (!showUploadModal) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset date when upload modal closes / period changes
      setDate(selectedMonthDefaultDate);
    }
  }, [selectedMonthDefaultDate, showUploadModal]);

  function resetForm() {
    setSelectedMonthlySubmissionId(null);
    setFileNames([]);
    setFilePreviews([]);
    setDescriptionEn("");
    setDescriptionCn("");
    setLocation("");
    setPic("");
    setDate(selectedMonthDefaultDate);
  }

  function openUpload(week: number, activity: ActivityType) {
    const config = [...WEEKLY_ACTIVITIES, ...MONTHLY_ACTIVITIES].find((a) => a.id === activity);
    if (!config) return;
    const record = records.find((r) => r.week === week);
    const dataKey = config.dataKey;
    const existing = dataKey ? record?.[dataKey] : undefined;
    const isUpdate = Boolean(existing && typeof existing === "object");
    if (isUpdate ? !canUpdateSafetySubmission : !canCreateSafetySubmission) {
      return;
    }
    resetForm();
    setSelectedWeek(week);
    setSelectedActivity(activity);
    if (existing && typeof existing === "object") {
      const detail = existing as SubmissionDetail;
      setFileNames(detail.fileNames ?? []);
      setFilePreviews(detail.filePreviews ?? []);
      setDescriptionEn(detail.descriptionEn ?? detail.description ?? "");
      setDescriptionCn(detail.descriptionCn ?? detail.description ?? "");
      setLocation(detail.location ?? "");
      setPic(
        safetyLanguage === "cn"
          ? detail.picCn || detail.picEn || detail.pic || ""
          : detail.picEn || detail.picCn || detail.pic || ""
      );
      setDate(
        detail.date
          ? convertDisplayDateToInput(detail.date, selectedMonthDefaultDate)
          : selectedMonthDefaultDate
      );
    }
    setShowUploadModal(true);
  }

  function openMonthlyUpload(activity: ActivityType, submissionId?: number) {
    const config = MONTHLY_ACTIVITIES.find((a) => a.id === activity);
    if (!config) return;
    const isUpdate =
      Boolean(submissionId) ||
      (() => {
        const dataKey =
          config.id === "fire-drill"
            ? "fireDrillData"
            : config.id === "monthly-meeting"
              ? "monthlyMeetingData"
              : config.id === "hazard-case"
                ? "hazardCaseData"
                : config.id === "safety-ppt"
                  ? "safetyPptData"
                  : "rewardFindingData";
        const existing = monthly[dataKey as keyof MonthlyRecord];
        return Boolean(existing && typeof existing === "object");
      })();
    if (isUpdate ? !canUpdateSafetySubmission : !canCreateSafetySubmission) {
      return;
    }
    resetForm();
    setSelectedActivity(activity);
    setSelectedMonthlySubmissionId(activity === "reward-finding" ? (submissionId ?? null) : null);
    const dataKey =
      config.id === "fire-drill"
        ? "fireDrillData"
        : config.id === "monthly-meeting"
          ? "monthlyMeetingData"
          : config.id === "hazard-case"
            ? "hazardCaseData"
            : config.id === "safety-ppt"
              ? "safetyPptData"
              : "rewardFindingData";
    const rewardSubmission =
      activity === "reward-finding" && submissionId
        ? monthly.rewardSubmissions.find((submission) => submission.id === submissionId)
        : undefined;

    const existing = rewardSubmission?.detail ?? monthly[dataKey as keyof MonthlyRecord];
    if (existing && typeof existing === "object") {
      const detail = existing as SubmissionDetail;
      setFileNames(detail.fileNames ?? []);
      setFilePreviews(detail.filePreviews ?? []);
      setDescriptionEn(detail.descriptionEn ?? detail.description ?? "");
      setDescriptionCn(detail.descriptionCn ?? detail.description ?? "");
      setLocation(detail.location ?? "");
      setPic(
        safetyLanguage === "cn"
          ? detail.picCn || detail.picEn || detail.pic || ""
          : detail.picEn || detail.picCn || detail.pic || ""
      );
      setDate(
        detail.date
          ? convertDisplayDateToInput(detail.date, selectedMonthDefaultDate)
          : selectedMonthDefaultDate
      );
    }
    setShowUploadModal(true);
  }

  function openView(title: string, detail: SubmissionDetail, status: SubmissionStatus) {
    setViewDetail({ title, detail, status });
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);

    const previews: FilePreview[] = files.map((file) => ({
      name: file.name,
      type: file.type || getFileMimeType(file.name),
      url: URL.createObjectURL(file),
      size: file.size,
    }));

    setFileNames(files.map((file) => file.name));
    setFilePreviews(previews);
  }

  async function handleSubmit() {
    if (!selectedActivity) return;

    const config = [...WEEKLY_ACTIVITIES, ...MONTHLY_ACTIVITIES].find(
      (a) => a.id === selectedActivity
    );

    if (!config) return;

    const isMonthly = !config.weekly;
    const isHazardCase = isMonthly && selectedActivity === "hazard-case";

    const isCaseFound = isHazardCase && fileNames.length > 0;

    // Weekly membutuhkan week. Monthly tidak.
    if (!isMonthly && !selectedWeek) return;

    // Semua aktivitas tetap wajib upload sesuai requirement,
    // kecuali Safety Case karena No Case boleh submit tanpa file.
    if (!isHazardCase && config.uploadKind !== "none" && fileNames.length === 0) {
      alert("Silakan pilih file terlebih dahulu.");
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      const databaseActivity = uiActivityToDatabaseActivity(selectedActivity);

      formData.append("activityType", databaseActivity);
      formData.append("year", String(selectedYear));
      formData.append("month", String(selectedMonth));
      formData.append("submissionDate", date);

      // PIC disimpan dalam 3 bentuk: legacy, English, dan Chinese.
      // Nilai select tetap memakai name_en sebagai value agar update lama tetap kompatibel.
      const selectedUser = users.find((user) => {
        const nameEn = user.name_en?.trim() || "";
        const nameCn = user.name_cn?.trim() || "";
        return pic === nameEn || pic === nameCn;
      });

      const picEn = selectedUser?.name_en?.trim() || pic;
      const picCn = selectedUser?.name_cn?.trim() || selectedUser?.name_en?.trim() || pic;

      formData.append("pic", picEn);
      formData.append("pic_en", picEn);
      formData.append("pic_cn", picCn);
      formData.append("location", location);
      formData.append("description_en", descriptionEn);
      formData.append("description_cn", descriptionCn);
      formData.append("description", descriptionEn || descriptionCn);
      formData.append("fileGroup", "general");

      // Safety Case:
      // - tanpa evidence = No Case = GREEN
      // - dengan evidence = Case Found = RED
      // Aktivitas lain tetap Completed.
      const submitStatus: SubmissionStatus = isHazardCase
        ? isCaseFound
          ? "case_found"
          : "not_applicable"
        : "completed";

      formData.append("status", submitStatus);

      if (
        isMonthly &&
        selectedActivity === "reward-finding" &&
        selectedMonthlySubmissionId !== null
      ) {
        formData.append("submissionId", String(selectedMonthlySubmissionId));
      }

      // Hanya Weekly yang mengirim week.
      if (!isMonthly && selectedWeek) {
        formData.append("week", String(selectedWeek));
      }

      // Ambil file asli dari input upload.
      const fileInput = document.querySelector<HTMLInputElement>(
        'input[type="file"][data-safety-upload="true"]'
      );

      if (fileInput?.files) {
        for (const file of Array.from(fileInput.files)) {
          formData.append("files", file);
        }
      }

      const apiUrl = isMonthly ? "/api/safety/monthly" : "/api/safety/weekly";

      const response = await fetch(apiUrl, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? result.message ?? "Upload safety gagal.");
      }

      // Setelah submit, selalu baca ulang dari database.
      if (isMonthly) {
        await loadMonthlyData();
      } else {
        await loadWeeklyData();
      }

      resetForm();
      setShowUploadModal(false);
      setSelectedActivity(null);
    } catch (error) {
      console.error("SAFETY UPLOAD ERROR:", error);

      alert(error instanceof Error ? error.message : "Upload safety gagal.");
    } finally {
      setSubmitting(false);
    }
  }

  const allActivities = [...WEEKLY_ACTIVITIES, ...MONTHLY_ACTIVITIES];

  return {
    safetyLanguage,
    canCreateSafetySubmission,
    canUpdateSafetySubmission,
    canMutateSafety,
    records,
    monthly,
    selectedWeek,
    setSelectedWeek,
    selectedActivity,
    setSelectedActivity,
    viewDetail,
    setViewDetail,
    showEvidenceGallery,
    setShowEvidenceGallery,
    selectedEvidenceIndex,
    setSelectedEvidenceIndex,
    showMonthlyEvidenceGallery,
    setShowMonthlyEvidenceGallery,
    selectedMonthlyEvidenceIndex,
    setSelectedMonthlyEvidenceIndex,
    showUploadModal,
    setShowUploadModal,
    fileNames,
    filePreviews,
    descriptionEn,
    setDescriptionEn,
    descriptionCn,
    setDescriptionCn,
    location,
    setLocation,
    pic,
    setPic,
    users,
    loadingUsers,
    date,
    setDate,
    submitting,
    loading,
    monthLabel,
    changeMonth,
    weeklyTotal,
    weeklyCompleted,
    weeklyPending,
    monthlyTargets,
    monthlyDone,
    overallTarget,
    overallDone,
    overallRate,
    selectedWeekRecord,
    evidenceForGallery,
    monthlyEvidenceForGallery,
    hazardCaseActive,
    handleSafetyPointsChange,
    safetyPoints,
    openUpload,
    openMonthlyUpload,
    openView,
    handleFileChange,
    handleSubmit,
    allActivities,
  };
}
