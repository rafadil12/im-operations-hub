"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLang } from "@/lib/i18n";

type SubmissionStatus = "completed" | "not_submitted" | "not_applicable" | "case_found";
type ActivityType =
  | "training"
  | "routine-meeting"
  | "hse-tuesday"
  | "ert"
  | "fire-drill"
  | "monthly-meeting"
  | "five-s"
  | "potential-hazard"
  | "hazard-case"
  | "safety-ppt"
  | "reward-finding";

type UploadKind = "image-video" | "image" | "video-excel" | "before-after" | "ppt" | "none";

type FilePreview = {
  name: string;
  type: string;
  url: string;
  size: number;
};

type SubmissionDetail = {
  date: string;
  location?: string;
  description: string;
  pic: string;
  fileNames?: string[];
  fileUrls?: string[];
  filePreviews?: FilePreview[];
  verifiedBy?: string;
  verifiedAt?: string;
};

type WeeklyRecord = {
  week: number;
  startDate: string;
  endDate: string;
  training: SubmissionStatus;
  routineMeeting: SubmissionStatus;
  hseTuesday: SubmissionStatus;
  ert: SubmissionStatus;
  fiveS: SubmissionStatus;
  potentialHazard: SubmissionStatus;
  trainingData?: SubmissionDetail;
  routineMeetingData?: SubmissionDetail;
  hseTuesdayData?: SubmissionDetail;
  ertData?: SubmissionDetail;
  fiveSData?: SubmissionDetail;
  potentialHazardData?: SubmissionDetail;
};

type MonthlyRecord = {
  fireDrill: SubmissionStatus;
  monthlyMeeting: SubmissionStatus;
  hazardCase: SubmissionStatus;
  safetyPpt: SubmissionStatus;
  rewardFinding: SubmissionStatus;
  fireDrillData?: SubmissionDetail;
  monthlyMeetingData?: SubmissionDetail;
  hazardCaseData?: SubmissionDetail;
  safetyPptData?: SubmissionDetail;
  rewardFindingData?: SubmissionDetail;
  rewardCount: number;
};

type WeeklyDatabaseRow = {
  id: number;
  year: number;
  month: number;
  period_type: "weekly";
  week: number;
  activity_type: string;
  status: SubmissionStatus;
  completed_count?: number;
  submission_date: string | null;
  pic: string | null;
  location: string | null;
  description: string | null;
  file_name: string | null;
  file_url: string | null;
};

type WeeklyStatusKey =
  | "training"
  | "routineMeeting"
  | "hseTuesday"
  | "ert"
  | "fiveS"
  | "potentialHazard";

type WeeklyDataKey =
  | "trainingData"
  | "routineMeetingData"
  | "hseTuesdayData"
  | "ertData"
  | "fiveSData"
  | "potentialHazardData";

type ActivityConfig = {
  id: ActivityType;
  recordKey?: WeeklyStatusKey;
  dataKey?: WeeklyDataKey;
  title: string;
  shortTitle: string;
  description: string;
  requirement: string;
  icon: string;
  frequency: string;
  uploadKind: UploadKind;
  weekly: boolean;
};

const WEEKLY_ACTIVITIES: ActivityConfig[] = [
  {
    id: "training",
    recordKey: "training",
    dataKey: "trainingData",
    title: "Catatan Pelatihan",
    shortTitle: "Pelatihan",
    description: "Dokumentasi pelatihan safety satu kali setiap minggu.",
    requirement: "1x / minggu",
    frequency: "Mingguan",
    icon: "🎓",
    uploadKind: "image-video",
    weekly: true,
  },
  {
    id: "routine-meeting",
    recordKey: "routineMeeting",
    dataKey: "routineMeetingData",
    title: "Rapat Rutin",
    shortTitle: "Rapat",
    description: "Rapat rutin satu kali setiap minggu dengan dokumentasi foto dan video.",
    requirement: "1x / minggu",
    frequency: "Mingguan",
    icon: "👥",
    uploadKind: "image-video",
    weekly: true,
  },
  {
    id: "hse-tuesday",
    recordKey: "hseTuesday",
    dataKey: "hseTuesdayData",
    title: "Rapat Rutin HSE",
    shortTitle: "HSE Selasa",
    description: "Rapat rutin HSE setiap hari Selasa. Jika ikut, cukup checklist.",
    requirement: "Setiap Selasa",
    frequency: "Selasa",
    icon: "☑️",
    uploadKind: "none",
    weekly: true,
  },
  {
    id: "ert",
    recordKey: "ert",
    dataKey: "ertData",
    title: "Laporan ERT",
    shortTitle: "ERT",
    description: "Laporan ERT satu kali setiap minggu dengan video dan file Excel.",
    requirement: "1x / minggu",
    frequency: "Mingguan",
    icon: "🚨",
    uploadKind: "video-excel",
    weekly: true,
  },
  {
    id: "five-s",
    recordKey: "fiveS",
    dataKey: "fiveSData",
    title: "5S",
    shortTitle: "5S",
    description: "Dokumentasi kondisi before dan after satu kali setiap minggu.",
    requirement: "1x / minggu",
    frequency: "Mingguan",
    icon: "🧹",
    uploadKind: "before-after",
    weekly: true,
  },
  {
    id: "potential-hazard",
    recordKey: "potentialHazard",
    dataKey: "potentialHazardData",
    title: "Potensi Bahaya",
    shortTitle: "Potensi Bahaya",
    description: "Dokumentasi potensi bahaya before dan after satu kali setiap minggu.",
    requirement: "1x / minggu",
    frequency: "Mingguan",
    icon: "⚠️",
    uploadKind: "before-after",
    weekly: true,
  },
];

const MONTHLY_ACTIVITIES: ActivityConfig[] = [
  {
    id: "fire-drill",
    title: "Latihan Simulasi Kebakaran",
    shortTitle: "Simulasi",
    description: "Latihan simulasi kebakaran satu kali setiap bulan.",
    requirement: "1x / bulan",
    frequency: "Bulanan",
    icon: "🔥",
    uploadKind: "image-video",
    weekly: false,
  },
  {
    id: "monthly-meeting",
    title: "Rapat Bulanan",
    shortTitle: "Rapat Bulanan",
    description: "Rapat safety bulanan dengan dokumentasi foto dan video.",
    requirement: "1x / bulan",
    frequency: "Bulanan",
    icon: "👥",
    uploadKind: "image-video",
    weekly: false,
  },
  {
    id: "hazard-case",
    title: "Penemuan Bahaya / Kasus",
    shortTitle: "Kasus Bahaya",
    description: "Jika ada kasus dalam bulan berjalan, status menjadi merah. Jika tidak ada kasus, tetap hijau.",
    requirement: "Monitoring bulanan",
    frequency: "Bulanan",
    icon: "🛑",
    uploadKind: "image-video",
    weekly: false,
  },
  {
    id: "safety-ppt",
    title: "PPT Safety",
    shortTitle: "PPT Safety",
    description: "Presentasi safety satu kali setiap bulan.",
    requirement: "1x / bulan",
    frequency: "Bulanan",
    icon: "📊",
    uploadKind: "ppt",
    weekly: false,
  },
  {
    id: "reward-finding",
    title: "Penemuan Berhadiah",
    shortTitle: "Berhadiah",
    description: "Target dua penemuan berhadiah setiap bulan dengan foto before dan after.",
    requirement: "2x / bulan",
    frequency: "Bulanan",
    icon: "🏆",
    uploadKind: "before-after",
    weekly: false,
  },
];

const INITIAL_MONTHLY_RECORD: MonthlyRecord = {
  fireDrill: "not_submitted",
  monthlyMeeting: "not_submitted",
  hazardCase: "not_applicable",
  safetyPpt: "not_submitted",
  rewardFinding: "not_submitted",
  rewardCount: 0,
};

const STATUS_CONFIG: Record<SubmissionStatus, { label: string; className: string }> = {
  completed: { label: "Completed", className: "border-success/20 bg-success/10 text-success" },
  not_submitted: { label: "Not Submitted", className: "border-danger/20 bg-danger/10 text-danger" },
  not_applicable: { label: "No Case", className: "border-success/20 bg-success/10 text-success" },
  case_found: { label: "Case Found", className: "border-danger/30 bg-danger/10 text-danger" },
};

function getActivityRecordKey(activity: ActivityType) {
  const config = [...WEEKLY_ACTIVITIES, ...MONTHLY_ACTIVITIES].find((item) => item.id === activity);
  return config?.recordKey;
}

function getActivityDataKey(activity: ActivityType) {
  const config = [...WEEKLY_ACTIVITIES, ...MONTHLY_ACTIVITIES].find((item) => item.id === activity);
  return config?.dataKey;
}

function formatDate(value: string) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function convertDisplayDateToInput(value: string) {
  if (!value) return "2026-08-18";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "2026-08-18";
  return date.toISOString().slice(0, 10);
}

function uiActivityToDatabaseActivity(
  activityType: ActivityType,
): string {
  const map: Record<string, string> = {
    training: "training",
    "routine-meeting": "routine_meeting",
    "hse-tuesday": "hse_tuesday",
    ert: "ert",
    "five-s": "five_s",
    "potential-hazard": "potential_hazard",
  };

  return map[activityType] ?? activityType;
}

function databaseActivityToUiActivity(
  activityType: string,
): ActivityType {
  const map: Record<string, ActivityType> = {
    routine_meeting: "routine-meeting",
    hse_tuesday: "hse-tuesday",
    five_s: "five-s",
    potential_hazard: "potential-hazard",
  };

  return map[activityType] ?? (activityType as ActivityType);
}

export default function SafetyManagementPage() {
  const { t } = useLang();
  const [records, setRecords] = useState<WeeklyRecord[]>([]);
  const [monthly, setMonthly] = useState<MonthlyRecord>(INITIAL_MONTHLY_RECORD);
  const [selectedWeek, setSelectedWeek] = useState(4);
  const [selectedActivity, setSelectedActivity] = useState<ActivityType | null>(null);
  const [viewDetail, setViewDetail] = useState<{ title: string; detail: SubmissionDetail; status: SubmissionStatus } | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [filePreviews, setFilePreviews] = useState<FilePreview[]>([]);
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [pic, setPic] = useState("");
  const [date, setDate] = useState("2026-08-18");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const weeklyTotal = records.length * WEEKLY_ACTIVITIES.length;
  const weeklyCompleted = useMemo(
    () => records.reduce((sum, r) => sum + WEEKLY_ACTIVITIES.filter((a) => r[a.recordKey!] === "completed").length, 0),
    [records],
  );
  const weeklyPending = weeklyTotal - weeklyCompleted;
  const monthlyTargets = 1 + 1 + 1 + 1 + 2;
  const monthlyDone =
    (monthly.fireDrill === "completed" ? 1 : 0) +
    (monthly.monthlyMeeting === "completed" ? 1 : 0) +
    (monthly.hazardCase === "completed" || monthly.hazardCase === "not_applicable" ? 1 : 0) +
    (monthly.safetyPpt === "completed" ? 1 : 0) +
    Math.min(monthly.rewardCount, 2);
  const overallTarget = weeklyTotal + monthlyTargets;
  const overallDone = weeklyCompleted + monthlyDone;
  const overallRate = overallTarget ? Math.round((overallDone / overallTarget) * 100) : 0;
  const selectedWeekRecord = records.find((r) => r.week === selectedWeek) ?? null;
  const hazardCaseActive = monthly.hazardCase === "case_found";

  const loadWeeklyData = useCallback(async () => {
    try {
      setLoading(true);

      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      const response = await fetch(
        `/api/safety/weekly?year=${year}&month=${month}`,
        {
          method: "GET",
          cache: "no-store",
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to load weekly safety data.",
        );
      }

      const rows: WeeklyDatabaseRow[] = result.data ?? [];

      // Database is the SINGLE source of truth.
      // The four week rows below are only the display structure;
      // every status/detail comes from safety_submissions.
      const weeks: WeeklyRecord[] = Array.from(
        { length: 4 },
        (_, index) => {
          const week = index + 1;
          const startDay = index * 7 + 1;
          const lastDay = new Date(year, month, 0).getDate();
          const endDay = Math.min(startDay + 6, lastDay);

          const record: WeeklyRecord = {
            week,
            startDate: new Date(
              year,
              month - 1,
              startDay,
            ).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
            }),
            endDate: new Date(
              year,
              month - 1,
              endDay,
            ).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
            }),
            training: "not_submitted",
            routineMeeting: "not_submitted",
            hseTuesday: "not_submitted",
            ert: "not_submitted",
            fiveS: "not_submitted",
            potentialHazard: "not_submitted",
          };

          const weekRows = rows.filter(
            (row) => Number(row.week) === week,
          );

          for (const row of weekRows) {
            const uiActivity = databaseActivityToUiActivity(
              row.activity_type,
            );

            const activity = WEEKLY_ACTIVITIES.find(
              (item) => item.id === uiActivity,
            );

            if (!activity?.recordKey) continue;

            // Status comes directly from MySQL.
            record[activity.recordKey] = row.status;

            if (activity.dataKey) {
              record[activity.dataKey] = {
                date: row.submission_date
                  ? formatDate(row.submission_date)
                  : "—",
                location: row.location ?? undefined,
                description:
                  row.description ??
                  "Dokumentasi safety telah diinput.",
                pic: row.pic ?? "—",
                fileNames: row.file_name
                  ? [row.file_name]
                  : [],
                fileUrls: row.file_url
                  ? [row.file_url]
                  : [],
                filePreviews: row.file_url
                  ? [
                      {
                        name:
                          row.file_name ??
                          "Attachment",
                        type: getFileMimeType(
                          row.file_name ?? "",
                        ),
                        url: row.file_url,
                        size: 0,
                      },
                    ]
                  : [],
              };
            }
          }

          return record;
        },
      );

      setRecords(weeks);
    } catch (error) {
      console.error(
        "Failed to load weekly safety data:",
        error,
      );

      setRecords([]);

      alert(
        error instanceof Error
          ? error.message
          : "Gagal mengambil data safety dari database.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWeeklyData();
  }, [loadWeeklyData]);

  function resetForm() {
    setFileNames([]);
    setFilePreviews([]);
    setDescription("");
    setLocation("");
    setPic("");
    setDate("2026-08-18");
  }

  function openUpload(week: number, activity: ActivityType) {
    const config = [...WEEKLY_ACTIVITIES, ...MONTHLY_ACTIVITIES].find((a) => a.id === activity);
    if (!config) return;
    resetForm();
    setSelectedWeek(week);
    setSelectedActivity(activity);
    const record = records.find((r) => r.week === week);
    const dataKey = config.dataKey;
    const existing = dataKey ? record?.[dataKey] : undefined;
    if (existing && typeof existing === "object") {
      const detail = existing as SubmissionDetail;
      setFileNames(detail.fileNames ?? []);
      setFilePreviews(detail.filePreviews ?? []);
      setDescription(detail.description ?? "");
      setLocation(detail.location ?? "");
      setPic(detail.pic ?? "");
      setDate(detail.date ? convertDisplayDateToInput(detail.date) : "2026-08-18");
    }
    setShowUploadModal(true);
  }

  function openMonthlyUpload(activity: ActivityType) {
    const config = MONTHLY_ACTIVITIES.find((a) => a.id === activity);
    if (!config) return;
    resetForm();
    setSelectedActivity(activity);
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
    if (existing && typeof existing === "object") {
      const detail = existing as SubmissionDetail;
      setFileNames(detail.fileNames ?? []);
      setFilePreviews(detail.filePreviews ?? []);
      setDescription(detail.description ?? "");
      setLocation(detail.location ?? "");
      setPic(detail.pic ?? "");
      setDate(detail.date ? convertDisplayDateToInput(detail.date) : "2026-08-18");
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

  function toggleHse(week: number) {
    setRecords((current) => current.map((record) => record.week === week ? { ...record, hseTuesday: record.hseTuesday === "completed" ? "not_submitted" : "completed" } : record));
  }

  async function handleSubmit() {
    if (!selectedActivity) return;

    const config = [...WEEKLY_ACTIVITIES, ...MONTHLY_ACTIVITIES].find(
      (a) => a.id === selectedActivity,
    );

    if (!config) return;

    if (!config.weekly) {
      alert(
        "Untuk sementara API yang kita hubungkan adalah data WEEKLY terlebih dahulu.",
      );
      return;
    }

    if (!selectedWeek) return;

    if (config.uploadKind !== "none" && fileNames.length === 0) {
      alert("Silakan pilih file terlebih dahulu.");
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();

      formData.append("activityType", uiActivityToDatabaseActivity(selectedActivity));
      formData.append("year", String(new Date().getFullYear()));
      formData.append("month", String(new Date().getMonth() + 1));
      formData.append("week", String(selectedWeek));
      formData.append("submissionDate", date);
      formData.append("pic", pic);
      formData.append("location", location);
      formData.append("description", description);

      // Ambil file asli dari input file.
      const fileInput =
        document.querySelector<HTMLInputElement>(
          'input[type="file"][data-safety-upload="true"]',
        );

      if (fileInput?.files) {
        for (const file of Array.from(fileInput.files)) {
          formData.append("files", file);
        }
      }

      // HSE Tuesday adalah checklist, tidak membutuhkan file.
      if (selectedActivity === "hse-tuesday") {
        // API saat ini menerima HSE sebagai POST tanpa file.
      }

      const response = await fetch("/api/safety/weekly", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Upload safety gagal.",
        );
      }

      // Database sudah berhasil di-update.
      // Ambil ulang data dari database agar state UI benar-benar
      // mengikuti database dan tetap ada setelah refresh.
      await loadWeeklyData();

      resetForm();
      setShowUploadModal(false);
      setSelectedActivity(null);
    } catch (error) {
      console.error("SAFETY UPLOAD ERROR:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Upload safety gagal.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const allActivities = [...WEEKLY_ACTIVITIES, ...MONTHLY_ACTIVITIES];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2"><span className="size-2 rounded-full bg-success" /><span className="text-[10px] font-medium uppercase tracking-[0.16em] text-text-dim">Safety Management</span></div>
          <h1 className="text-2xl font-semibold tracking-tight text-text">Safety Submission Center</h1>
          <p className="mt-1 max-w-3xl text-sm text-text-muted">Monitoring seluruh kewajiban safety mingguan, rapat HSE setiap Selasa, serta requirement bulanan.</p>
        </div>
        <select defaultValue={new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })} className={selectClass}><option>{new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}</option></select>
      </header>

      {loading && (
        <div className="rounded-xl border border-accent/20 bg-accent/5 px-4 py-3 text-xs text-accent">
          Mengambil data Safety dari database...
        </div>
      )}

      <section className="relative overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="pointer-events-none absolute -right-32 -top-32 size-80 rounded-full bg-accent/5 blur-3xl" />
        <div className="relative grid lg:grid-cols-[1fr_330px]">
          <div className="p-6 md:p-7">
            <span className="rounded-md bg-accent/10 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wide text-accent">{new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }).toUpperCase()}</span>
            <div className="mt-5 flex items-center gap-2"><span className="size-2 rounded-full bg-success" /><span className="text-[10px] font-medium uppercase tracking-[0.16em] text-text-dim">MONTHLY OVERVIEW</span></div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-text">Safety Progress</h2>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-text-muted">Progress dihitung dari seluruh kewajiban mingguan dan target bulanan. HSE Selasa dihitung melalui checklist.</p>
            <div className="mt-8 flex items-end gap-4"><div className="flex items-end"><span className="text-5xl font-semibold leading-none text-text md:text-6xl">{overallDone}</span><span className="mb-1.5 ml-2 text-lg font-medium text-text-dim">/ {overallTarget}</span></div><div className="pb-1.5"><p className="text-[10px] font-medium text-text-muted">Completed requirements</p><p className="mt-1 text-[9px] text-text-dim">6 weekly controls × 4 minggu + monthly targets</p></div></div>
            <div className="mt-8 max-w-3xl"><div className="mb-2 flex items-end justify-between"><div><p className="text-[10px] font-medium text-text-muted">Overall completion</p><p className="mt-1 text-[9px] text-text-dim">{weeklyCompleted}/{weeklyTotal} weekly · {monthlyDone}/{monthlyTargets} monthly</p></div><span className="text-xl font-semibold text-accent">{overallRate}%</span></div><div className="h-2.5 overflow-hidden rounded-full bg-bg"><div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${overallRate}%` }} /></div></div>
            <div className="mt-6 flex flex-wrap gap-2"><StatusPill label="Completed" value={weeklyCompleted + monthlyDone} tone="success" /><StatusPill label="Pending" value={weeklyPending + (monthlyTargets - monthlyDone)} tone="danger" /></div>
          </div>
          <div className="border-t border-border-subtle bg-bg/20 lg:border-l lg:border-t-0"><div className="grid h-full grid-rows-3"><ProgressStatus label="Weekly" description="6 controls setiap minggu" value={weeklyCompleted} total={weeklyTotal} tone="success" /><ProgressStatus label="Monthly" description="Fire drill, rapat, kasus, PPT & reward" value={monthlyDone} total={monthlyTargets} tone="warning" /><ProgressStatus label="Hazard Case" description={hazardCaseActive ? "Ada kasus yang perlu perhatian" : "Tidak ada kasus bulan ini"} value={hazardCaseActive ? 1 : 0} total={1} tone={hazardCaseActive ? "danger" : "success"} /></div></div>
        </div>
      </section>

      <section>
        <div className="mb-3"><h2 className="text-base font-semibold text-text">Weekly Control</h2><p className="mt-1 text-xs text-text-muted">Monitoring status mingguan. Bagian ini hanya untuk melihat status; Upload, Update, dan Checklist dilakukan pada panel Week Submission di bawah.</p></div>
        <div className="overflow-hidden rounded-2xl border border-border bg-surface"><div className="overflow-x-auto"><div className="min-w-[1250px]">
          <div className="grid grid-cols-[145px_repeat(6,1fr)_90px] border-b border-border-subtle bg-bg/30">
            <div className="px-4 py-3 text-[9px] font-semibold uppercase tracking-wide text-text-dim">Week</div>
            {WEEKLY_ACTIVITIES.map((a) => <div key={a.id} className="border-l border-border-subtle px-3 py-3"><div className="flex items-center gap-1.5"><span>{a.icon}</span><span className="text-[9px] font-semibold uppercase tracking-wide text-text-dim">{a.shortTitle}</span></div><p className="mt-1 text-[8px] text-text-dim">{a.frequency}</p></div>)}
            <div className="border-l border-border-subtle px-3 py-3 text-center text-[9px] font-semibold uppercase tracking-wide text-text-dim">Progress</div>
          </div>
          {records.map((record) => {
            const done = WEEKLY_ACTIVITIES.filter((a) => record[a.recordKey!] === "completed").length;
            const rate = Math.round((done / WEEKLY_ACTIVITIES.length) * 100);
            return <div key={record.week} className={`grid grid-cols-[145px_repeat(6,1fr)_90px] border-b border-border-subtle last:border-b-0 ${selectedWeek === record.week ? "bg-accent/[0.04]" : "hover:bg-surface-hover"}`}>
              <button type="button" onClick={() => setSelectedWeek(record.week)} className="cursor-pointer px-4 py-4 text-left"><div className="flex items-center gap-2"><span className={`flex size-7 items-center justify-center rounded-md text-[10px] font-semibold ${selectedWeek === record.week ? "bg-accent text-white" : "bg-bg text-text-muted"}`}>W{record.week}</span><div><p className="text-xs font-semibold text-text">Week {record.week}</p><p className="mt-0.5 text-[9px] text-text-dim">{record.startDate} – {record.endDate}</p></div></div></button>
              {WEEKLY_ACTIVITIES.map((activity) => <div key={activity.id} className="flex items-center border-l border-border-subtle px-3 py-4"><StatusCell
  status={record[activity.recordKey!] as SubmissionStatus}
  hasDetail={Boolean(record[activity.dataKey!])}
  onView={() => {
    const detail = record[activity.dataKey!] as SubmissionDetail | undefined;
    if (detail) {
      openView(
        activity.title,
        detail,
        record[activity.recordKey!] as SubmissionStatus,
      );
    }
  }}
  checklist={activity.id === "hse-tuesday"}
/></div>)}
              <div className="flex flex-col items-center justify-center border-l border-border-subtle px-3 py-4"><span className="text-xs font-semibold text-text">{done}/6</span><div className="mt-2 h-1 w-12 overflow-hidden rounded-full bg-bg"><div className="h-full rounded-full bg-accent" style={{ width: `${rate}%` }} /></div></div>
            </div>;
          })}
        </div></div></div>
      </section>

      {selectedWeekRecord && <section className="rounded-2xl border border-border bg-surface p-5"><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><span className="rounded-md bg-accent/10 px-2 py-1 text-[9px] font-semibold text-accent">WEEK {selectedWeekRecord.week}</span><h2 className="mt-2 text-base font-semibold text-text">Week {selectedWeekRecord.week} Submission</h2><p className="mt-1 text-xs text-text-muted">Tempat melakukan Upload, Update, atau Checklist untuk minggu yang dipilih.</p></div><div className="text-right"><p className="text-[9px] uppercase tracking-wide text-text-dim">Week Status</p><p className="mt-1 text-lg font-semibold text-text">{WEEKLY_ACTIVITIES.filter((a) => selectedWeekRecord[a.recordKey!] === "completed").length}/6</p></div></div><div className="mt-5 grid gap-3 lg:grid-cols-3">{WEEKLY_ACTIVITIES.map((activity) => <ActivitySubmissionCard key={activity.id} activity={activity} status={selectedWeekRecord[activity.recordKey!] as SubmissionStatus} hasDetail={Boolean(selectedWeekRecord[activity.dataKey!])} onView={() => { const detail = selectedWeekRecord[activity.dataKey!] as SubmissionDetail | undefined; if (detail) openView(activity.title, detail, selectedWeekRecord[activity.recordKey!] as SubmissionStatus); }} onUpload={() => activity.id === "hse-tuesday" ? toggleHse(selectedWeekRecord.week) : openUpload(selectedWeekRecord.week, activity.id)} checklist={activity.id === "hse-tuesday"} />)}</div></section>}

      <section><div className="mb-3"><h2 className="text-base font-semibold text-text">Monthly Requirements</h2><p className="mt-1 text-xs text-text-muted">Requirement bulanan: simulasi kebakaran, rapat bulanan, kasus bahaya, PPT Safety, dan 2 penemuan berhadiah.</p></div><div className="grid gap-3 md:grid-cols-2">
        {MONTHLY_ACTIVITIES.map((activity) => {
          const status =
            activity.id === "fire-drill"
              ? monthly.fireDrill
              : activity.id === "monthly-meeting"
                ? monthly.monthlyMeeting
                : activity.id === "hazard-case"
                  ? monthly.hazardCase
                  : activity.id === "safety-ppt"
                    ? monthly.safetyPpt
                    : monthly.rewardFinding;

          const detail =
            activity.id === "fire-drill"
              ? monthly.fireDrillData
              : activity.id === "monthly-meeting"
                ? monthly.monthlyMeetingData
                : activity.id === "hazard-case"
                  ? monthly.hazardCaseData
                  : activity.id === "safety-ppt"
                    ? monthly.safetyPptData
                    : monthly.rewardFindingData;
          const rewardLabel = activity.id === "reward-finding" ? `${monthly.rewardCount}/2 submitted` : activity.requirement;
          return <MonthlyRequirementCard key={activity.id} activity={activity} status={status} rewardLabel={rewardLabel} hasDetail={Boolean(detail)} hazardCase={activity.id === "hazard-case"} onView={() => detail && openView(activity.title, detail, status)} onUpload={() => openMonthlyUpload(activity.id)} />;
        })}
      </div></section>

      <section><div className="mb-3"><h2 className="text-base font-semibold text-text">Requirement Rules</h2><p className="mt-1 text-xs text-text-muted">Ringkasan aturan upload sesuai requirement yang kamu tentukan.</p></div><div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">{allActivities.map((a) => <div key={a.id} className="rounded-xl border border-border bg-surface p-4"><div className="flex items-start gap-3"><div className="flex size-9 items-center justify-center rounded-lg bg-accent/10 text-base">{a.icon}</div><div className="min-w-0"><p className="text-xs font-semibold text-text">{a.title}</p><p className="mt-1 text-[10px] text-text-muted">{a.requirement}</p><p className="mt-1 text-[9px] text-text-dim">{a.uploadKind === "none" ? "Checklist saja" : a.uploadKind === "before-after" ? "Foto Before + After" : a.uploadKind === "image-video" ? "Foto + Video" : a.uploadKind === "video-excel" ? "Video + Excel" : "File PPT"}</p></div></div></div>)}</div></section>

      {showUploadModal && selectedActivity && (
        <UploadModal
          activity={
            [...WEEKLY_ACTIVITIES, ...MONTHLY_ACTIVITIES].find(
              (a) => a.id === selectedActivity,
            )!
          }
          date={date}
          location={location}
          description={description}
          pic={pic}
          fileNames={fileNames}
          filePreviews={filePreviews}
          submitting={submitting}
          setDate={setDate}
          setLocation={setLocation}
          setDescription={setDescription}
          setPic={setPic}
          onFileChange={handleFileChange}
          onClose={() => {
            if (!submitting) {
              setShowUploadModal(false);
              setSelectedActivity(null);
            }
          }}
          onSubmit={handleSubmit}
        />
      )}
      {viewDetail && <ViewSubmissionModal title={viewDetail.title} status={viewDetail.status} detail={viewDetail.detail} onClose={() => setViewDetail(null)} />}
    </div>
  );
}

function StatusCell({
  status,
  hasDetail,
  onView,
  checklist = false,
}: {
  status: SubmissionStatus;
  hasDetail: boolean;
  onView: () => void;
  checklist?: boolean;
}) {
  const config = STATUS_CONFIG[status];

  return (
    <div className="flex items-center gap-2">
      <span
        className={`flex size-7 shrink-0 items-center justify-center rounded-full border text-xs ${config.className}`}
      >
        {status === "completed" || status === "not_applicable" ? "✓" : "!"}
      </span>

      <div className="min-w-0">
        <p
          className={`text-xs font-medium ${
            status === "completed" || status === "not_applicable"
              ? "text-success"
              : "text-danger"
          }`}
        >
          {checklist && status === "completed"
            ? "Participated"
            : config.label}
        </p>

        {hasDetail && (
          <button
            type="button"
            onClick={onView}
            className="mt-0.5 cursor-pointer text-[10px] font-medium text-accent hover:underline"
          >
            View
          </button>
        )}
      </div>
    </div>
  );
}

function ActivitySubmissionCard({ activity, status, hasDetail, onView, onUpload, checklist }: { activity: ActivityConfig; status: SubmissionStatus; hasDetail: boolean; onView: () => void; onUpload: () => void; checklist?: boolean }) {
  const config = STATUS_CONFIG[status];
  return <div className={`rounded-xl border p-4 transition-all ${status === "completed" || status === "not_applicable" ? "border-success/20 bg-success/[0.025]" : "border-danger/20 bg-danger/[0.025]"}`}><div className="flex items-start justify-between gap-3"><div className="flex size-10 items-center justify-center rounded-lg bg-accent/10 text-lg">{activity.icon}</div><span className={`rounded-md border px-2 py-1 text-[9px] font-medium ${config.className}`}>{config.label}</span></div><h3 className="mt-4 text-sm font-semibold text-text">{activity.title}</h3><p className="mt-1 min-h-[36px] text-xs leading-5 text-text-muted">{activity.description}</p><div className="mt-4 flex items-center justify-between border-t border-border-subtle pt-3"><span className="text-[9px] text-text-dim">{activity.requirement}</span><div className="flex items-center gap-2">{hasDetail && <button type="button" onClick={onView} className="cursor-pointer rounded-md border border-border px-3 py-1.5 text-[10px] font-medium text-text-muted hover:bg-surface-hover">View</button>}<button type="button" onClick={onUpload} className={`cursor-pointer rounded-md px-3 py-1.5 text-[10px] font-medium ${checklist ? "bg-accent text-white" : status === "not_submitted" ? "bg-accent text-white" : "border border-border text-text-muted hover:bg-surface-hover"}`}>{checklist ? status === "completed" ? "Uncheck" : "✓ Check" : status === "not_submitted" ? "+ Upload" : "Update"}</button></div></div></div>;
}

function MonthlyRequirementCard({ activity, status, rewardLabel, hasDetail, hazardCase, onView, onUpload }: { activity: ActivityConfig; status: SubmissionStatus; rewardLabel: string; hasDetail: boolean; hazardCase?: boolean; onView: () => void; onUpload: () => void }) {
  const config = STATUS_CONFIG[status];
  const isGreen = status === "completed" || status === "not_applicable";
  return <div className={`rounded-xl border p-5 transition-all ${hazardCase && isGreen ? "border-success/20 bg-success/[0.025]" : hazardCase ? "border-danger/30 bg-danger/[0.035]" : "border-border bg-surface"}`}><div className="flex items-start justify-between gap-3"><div className="flex size-11 items-center justify-center rounded-xl bg-accent/10 text-xl">{activity.icon}</div><span className={`rounded-md border px-2 py-1 text-[9px] font-medium ${config.className}`}>{hazardCase && isGreen ? "No Case · GREEN" : hazardCase && !isGreen ? "CASE FOUND · RED" : config.label}</span></div><h3 className="mt-4 text-sm font-semibold text-text">{activity.title}</h3><p className="mt-1 text-xs leading-5 text-text-muted">{activity.description}</p><div className="mt-3 rounded-lg border border-border-subtle bg-bg/30 px-3 py-2"><p className="text-[9px] uppercase tracking-wide text-text-dim">Target</p><p className="mt-1 text-xs font-medium text-text">{rewardLabel}</p></div><div className="mt-4 flex gap-2">{hasDetail && <button type="button" onClick={onView} className="flex-1 rounded-md border border-border px-3 py-2 text-[10px] font-medium text-text-muted hover:bg-surface-hover">View</button>}<button type="button" onClick={onUpload} className="flex-1 rounded-md bg-accent px-3 py-2 text-[10px] font-medium text-white hover:opacity-90">{hazardCase ? "Report / Clear Case" : "Upload"}</button></div></div>;
}

function UploadModal({
  activity,
  date,
  location,
  description,
  pic,
  fileNames,
  filePreviews,
  submitting,
  setDate,
  setLocation,
  setDescription,
  setPic,
  onFileChange,
  onClose,
  onSubmit,
}: {
  activity: ActivityConfig;
  date: string;
  location: string;
  description: string;
  pic: string;
  fileNames: string[];
  filePreviews: FilePreview[];
  submitting: boolean;
  setDate: (v: string) => void;
  setLocation: (v: string) => void;
  setDescription: (v: string) => void;
  setPic: (v: string) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const accept = activity.uploadKind === "ppt" ? ".ppt,.pptx" : activity.uploadKind === "video-excel" ? ".mp4,.mov,.avi,.xlsx,.xls" : activity.uploadKind === "before-after" ? ".jpg,.jpeg,.png,.webp" : ".jpg,.jpeg,.png,.webp,.mp4,.mov,.avi";
  const uploadText = activity.uploadKind === "none" ? "Checklist" : activity.uploadKind === "before-after" ? "Upload 2 foto: BEFORE + AFTER" : activity.uploadKind === "image-video" ? "Upload foto dan video" : activity.uploadKind === "video-excel" ? "Upload video dan Excel" : "Upload file PPT";
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"><div className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"><div className="flex items-start justify-between border-b border-border-subtle p-5"><div className="flex items-start gap-3"><div className="flex size-11 items-center justify-center rounded-xl bg-accent/10 text-xl">{activity.icon}</div><div><h2 className="text-base font-semibold text-text">{activity.title}</h2><p className="mt-1 text-xs text-text-muted">{activity.requirement} · {uploadText}</p></div></div><button type="button" onClick={onClose} disabled={submitting} className="cursor-pointer text-xl text-text-dim">×</button></div><div className="max-h-[70vh] space-y-4 overflow-y-auto p-5"><div className="grid gap-4 md:grid-cols-2"><FormField label="Date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} /></FormField><FormField label="PIC"><input value={pic} onChange={(e) => setPic(e.target.value)} placeholder="Enter PIC" className={inputClass} /></FormField></div>{activity.id !== "hazard-case" && <FormField label="Location"><input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Enter location" className={inputClass} /></FormField>}<FormField label="Description"><textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={activity.id === "hazard-case" ? "Isi detail kasus. Jika tidak ada kasus, kosongkan file dan submit untuk status GREEN." : "Describe the activity or finding..."} rows={4} className={`${inputClass} resize-none`} /></FormField>{activity.uploadKind !== "none" && <FormField label="Attachment"><label className="group flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-bg/30 px-4 py-8 text-center hover:border-accent/60 hover:bg-accent/5"><div className="flex size-11 items-center justify-center rounded-full bg-accent/10 text-lg">↑</div><span className="mt-3 text-xs font-medium text-text">Click to upload</span><span className="mt-1 text-[10px] text-text-dim">{uploadText}</span><input data-safety-upload="true" type="file" multiple className="hidden" accept={accept} onChange={onFileChange} /></label>{filePreviews.length > 0 && (
  <div className="mt-3 grid gap-2 sm:grid-cols-2">
    {filePreviews.map((file) => {
      const kind = getPreviewKind(file.name, file.type);

      return (
        <div
          key={`${file.name}-${file.url}`}
          className="overflow-hidden rounded-xl border border-border-subtle bg-bg/30"
        >
          {kind === "image" ? (
            <img
              src={file.url}
              alt={file.name}
              className="h-32 w-full object-cover"
            />
          ) : kind === "video" ? (
            <video
              src={file.url}
              controls
              className="h-32 w-full bg-black object-contain"
            />
          ) : (
            <div className="flex h-32 items-center justify-center bg-bg/50">
              <div className="text-center">
                <div className="text-3xl">{getFileIcon(kind)}</div>
                <p className="mt-2 text-[10px] font-medium text-text">
                  {getFileTypeLabel(kind)}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 border-t border-border-subtle px-3 py-2">
            <span className="shrink-0 text-xs text-success">✓</span>
            <p className="truncate text-[10px] font-medium text-text">
              {file.name}
            </p>
          </div>
        </div>
      );
    })}
  </div>
)}</FormField>}{activity.id === "hazard-case" && <div className="rounded-lg border border-success/20 bg-success/5 p-3"><p className="text-[10px] font-medium text-success">Tidak ada kasus?</p><p className="mt-1 text-[9px] leading-4 text-text-muted">Biarkan attachment kosong lalu Submit. Sistem akan mencatat bulan ini sebagai <strong>GREEN · No Case</strong>.</p></div>}{activity.id === "hse-tuesday" && <div className="rounded-lg border border-accent/20 bg-accent/5 p-3 text-xs text-text-muted">Rapat HSE setiap hari Selasa cukup checklist. Tidak perlu upload file.</div>}</div><div className="flex justify-end gap-2 border-t border-border-subtle p-5"><button type="button" onClick={onClose} disabled={submitting} className="cursor-pointer rounded-md border border-border px-4 py-2 text-xs font-medium text-text-muted">Cancel</button><button type="button" onClick={onSubmit} disabled={submitting} className="cursor-pointer rounded-md bg-accent px-5 py-2 text-xs font-medium text-white disabled:opacity-50">{submitting ? "Submitting..." : activity.id === "hazard-case" && fileNames.length === 0 ? "Set GREEN · No Case" : "Submit"}</button></div></div></div>;
}

function ViewSubmissionModal({
  title,
  status,
  detail,
  onClose,
}: {
  title: string;
  status: SubmissionStatus;
  detail: SubmissionDetail;
  onClose: () => void;
}) {
  const files = detail.filePreviews ?? [];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between border-b border-border-subtle p-5">
          <div>
            <h2 className="text-lg font-semibold text-text">{title}</h2>

            <span
              className={`mt-2 inline-flex rounded-md border px-2 py-1 text-[9px] font-medium ${
                STATUS_CONFIG[status].className
              }`}
            >
              {status === "not_applicable"
                ? "No Case · GREEN"
                : status === "case_found"
                  ? "CASE FOUND · RED"
                  : STATUS_CONFIG[status].label}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer text-2xl leading-none text-text-dim hover:text-text"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {/* Metadata */}
          <div className="grid gap-3 md:grid-cols-2">
            <DetailItem
              label="Submission Date"
              value={detail.date}
            />

            <DetailItem
              label="PIC"
              value={detail.pic}
            />

            <DetailItem
              label="Location"
              value={detail.location ?? "—"}
            />

            <DetailItem
              label="Attachment"
              value={
                detail.fileNames?.length
                  ? `${detail.fileNames.length} file(s)`
                  : "No attachment"
              }
            />
          </div>

          {/* Description */}
          <div className="mt-4 rounded-xl border border-border-subtle bg-bg/30 p-4">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-text-dim">
              Description
            </p>

            <p className="mt-2 text-xs leading-6 text-text-muted">
              {detail.description}
            </p>
          </div>

          {/* Attachments */}
          <div className="mt-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-text">
                  Attachments
                </p>

                <p className="mt-1 text-[10px] text-text-dim">
                  Preview uploaded photos, videos and documents.
                </p>
              </div>

              <span className="rounded-md bg-accent/10 px-2 py-1 text-[9px] font-medium text-accent">
                {files.length} file(s)
              </span>
            </div>

            {files.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-bg/30 p-8 text-center">
                <div className="text-3xl">📎</div>

                <p className="mt-2 text-xs font-medium text-text">
                  No preview available
                </p>

                <p className="mt-1 text-[10px] text-text-dim">
                  This submission has no stored preview files.
                </p>

                {detail.fileNames?.length ? (
                  <div className="mt-4 space-y-2 text-left">
                    {detail.fileNames.map((name) => (
                      <div
                        key={name}
                        className="rounded-lg border border-border-subtle bg-surface px-3 py-2 text-xs text-text-muted"
                      >
                        {name}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {files.map((file) => (
                  <AttachmentPreview
                    key={`${file.name}-${file.url}`}
                    file={file}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Verified */}
          {status === "completed" && (
            <div className="mt-5 rounded-xl border border-success/20 bg-success/5 p-4 text-xs text-success">
              ✓ Submission Verified
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 justify-end border-t border-border-subtle p-5">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-md border border-border px-4 py-2 text-xs font-medium text-text-muted hover:bg-surface-hover"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function AttachmentPreview({
  file,
}: {
  file: FilePreview;
}) {
  const kind = getPreviewKind(file.name, file.type);
  const canOfficePreview =
    (kind === "ppt" || kind === "excel") &&
    /^https?:\/\//i.test(file.url);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-bg/20">
      {/* Preview */}
      <div className="min-h-[220px] bg-bg/40">
        {kind === "image" ? (
          <img
            src={file.url}
            alt={file.name}
            className="max-h-[420px] min-h-[220px] w-full object-contain"
          />
        ) : kind === "video" ? (
          <video
            src={file.url}
            controls
            playsInline
            className="max-h-[420px] min-h-[220px] w-full bg-black object-contain"
          />
        ) : kind === "pdf" ? (
          <iframe
            src={file.url}
            title={file.name}
            className="h-[420px] w-full bg-white"
          />
        ) : canOfficePreview ? (
          <iframe
            src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
              file.url,
            )}`}
            title={file.name}
            className="h-[420px] w-full bg-white"
          />
        ) : (
          <div className="flex min-h-[220px] flex-col items-center justify-center px-6 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-accent/10 text-3xl">
              {getFileIcon(kind)}
            </div>

            <p className="mt-4 text-sm font-semibold text-text">
              {getFileTypeLabel(kind)}
            </p>

            <p className="mt-1 max-w-sm text-[10px] leading-5 text-text-dim">
              {kind === "ppt"
                ? "PowerPoint preview will work automatically when the file is stored at an accessible HTTP/HTTPS URL. You can open the uploaded file now."
                : kind === "excel"
                  ? "Excel files are shown as document attachments. You can open the uploaded file now."
                  : "This file type does not have an in-browser preview."}
            </p>
          </div>
        )}
      </div>

      {/* File information */}
      <div className="border-t border-border-subtle p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-text">
              {file.name}
            </p>

            <p className="mt-1 text-[9px] text-text-dim">
              {getFileTypeLabel(kind)} · {formatFileSize(file.size)}
            </p>
          </div>

          <a
            href={file.url}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 rounded-md border border-border px-3 py-1.5 text-[10px] font-medium text-text-muted hover:bg-surface-hover"
          >
            Open
          </a>
        </div>
      </div>
    </div>
  );
}

function getPreviewKind(
  name: string,
  mimeType?: string,
): "image" | "video" | "pdf" | "ppt" | "excel" | "other" {
  const lowerName = name.toLowerCase();
  const type = (mimeType ?? "").toLowerCase();

  if (
    type.startsWith("image/") ||
    /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(lowerName)
  ) {
    return "image";
  }

  if (
    type.startsWith("video/") ||
    /\.(mp4|mov|avi|mkv|webm|m4v)$/i.test(lowerName)
  ) {
    return "video";
  }

  if (
    type === "application/pdf" ||
    lowerName.endsWith(".pdf")
  ) {
    return "pdf";
  }

  if (
    type.includes("presentation") ||
    /\.(ppt|pptx)$/i.test(lowerName)
  ) {
    return "ppt";
  }

  if (
    type.includes("spreadsheet") ||
    type.includes("excel") ||
    /\.(xls|xlsx|csv)$/i.test(lowerName)
  ) {
    return "excel";
  }

  return "other";
}

function getFileMimeType(name: string): string {
  const lowerName = name.toLowerCase();

  if (/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(lowerName)) {
    return "image/*";
  }

  if (/\.(mp4|mov|avi|mkv|webm|m4v)$/i.test(lowerName)) {
    return "video/*";
  }

  if (lowerName.endsWith(".pdf")) {
    return "application/pdf";
  }

  if (/\.(ppt|pptx)$/i.test(lowerName)) {
    return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  }

  if (/\.(xls|xlsx|csv)$/i.test(lowerName)) {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }

  return "application/octet-stream";
}

function getFileIcon(
  kind: ReturnType<typeof getPreviewKind>,
): string {
  switch (kind) {
    case "image":
      return "🖼️";
    case "video":
      return "🎬";
    case "pdf":
      return "📄";
    case "ppt":
      return "📊";
    case "excel":
      return "📗";
    default:
      return "📎";
  }
}

function getFileTypeLabel(
  kind: ReturnType<typeof getPreviewKind>,
): string {
  switch (kind) {
    case "image":
      return "Image";
    case "video":
      return "Video";
    case "pdf":
      return "PDF";
    case "ppt":
      return "PowerPoint";
    case "excel":
      return "Excel";
    default:
      return "File";
  }
}

function formatFileSize(size: number): string {
  if (!size) return "—";

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function DetailItem({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-border-subtle bg-bg/30 p-3"><p className="text-[9px] font-semibold uppercase tracking-wide text-text-dim">{label}</p><p className="mt-1.5 truncate text-xs font-medium text-text">{value}</p></div>; }
function StatusPill({ label, value, tone }: { label: string; value: number; tone: "success" | "warning" | "danger" }) { const c = { success: "bg-success/10 border-success/20 text-success", warning: "bg-warning/10 border-warning/20 text-warning", danger: "bg-danger/10 border-danger/20 text-danger" }[tone]; return <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${c}`}><span className="text-[10px] font-medium">{label}</span><span className="text-xs font-semibold">{value}</span></div>; }
function ProgressStatus({ label, description, value, total, tone }: { label: string; description: string; value: number; total: number; tone: "success" | "warning" | "danger" }) { const c = { success: "text-success bg-success/[0.025]", warning: "text-warning bg-warning/[0.025]", danger: "text-danger bg-danger/[0.025]" }[tone]; const pct = total ? Math.round((value / total) * 100) : 0; return <div className={`flex items-center justify-between gap-4 border-b border-border-subtle px-5 py-5 last:border-b-0 ${c}`}><div><p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-text-dim">{label}</p><p className="mt-1 text-[10px] text-text-muted">{description}</p></div><div className="text-right"><p className="text-2xl font-semibold leading-none">{value}</p><p className="mt-1 text-[9px] text-text-dim">{pct}%</p></div></div>; }
function FormField({ label, children }: { label: string; children: React.ReactNode }) { return <div><label className="mb-1.5 block text-xs font-medium text-text">{label}</label>{children}</div>; }

const selectClass = "cursor-pointer rounded-md border border-border bg-surface px-3 py-2 text-xs text-text outline-none focus:border-accent";
const inputClass = "w-full rounded-md border border-border bg-bg/40 px-3 py-2 text-xs text-text outline-none placeholder:text-text-dim focus:border-accent";
