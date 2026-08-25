"use client";

import { UploadModal, ViewSubmissionModal } from "@/components/safety/management";
import { EvidenceGalleryModal } from "@/components/safety/management/EvidenceGalleryModal";
import { MonthlyRequirementsSection } from "@/components/safety/management/MonthlyRequirementsSection";
import { RequirementRulesSection } from "@/components/safety/management/RequirementRulesSection";
import { SafetyManagementHeader } from "@/components/safety/management/SafetyManagementHeader";
import { SafetyProgressOverview } from "@/components/safety/management/SafetyProgressOverview";
import { useSafetyManagement } from "@/components/safety/management/useSafetyManagement";
import { WeekActivityPanel } from "@/components/safety/management/WeekActivityPanel";
import { WeeklyControlGrid } from "@/components/safety/management/WeeklyControlGrid";
import { MONTHLY_ACTIVITIES, WEEKLY_ACTIVITIES, localizeActivity, safetyText } from "@/lib/safety";

export function SafetyManagementClient() {
  const {
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
  } = useSafetyManagement();

  return (
    <div className="space-y-6">
      <SafetyManagementHeader
        language={safetyLanguage}
        monthLabel={monthLabel}
        onChangeMonth={changeMonth}
      />

      {loading && (
        <div className="rounded-xl border border-accent/20 bg-accent/5 px-4 py-3 text-xs text-accent">
          {safetyText("loadingDatabase", safetyLanguage)}
        </div>
      )}

      <SafetyProgressOverview
        language={safetyLanguage}
        monthLabel={monthLabel}
        overallDone={overallDone}
        overallTarget={overallTarget}
        overallRate={overallRate}
        weeklyCompleted={weeklyCompleted}
        weeklyTotal={weeklyTotal}
        weeklyPending={weeklyPending}
        monthlyDone={monthlyDone}
        monthlyTargets={monthlyTargets}
        hazardCaseActive={hazardCaseActive}
      />

      <WeeklyControlGrid
        language={safetyLanguage}
        records={records}
        selectedWeek={selectedWeek}
        weeklyCompleted={weeklyCompleted}
        weeklyPending={weeklyPending}
        onSelectWeek={setSelectedWeek}
      />

      {selectedWeekRecord && (
        <WeekActivityPanel
          language={safetyLanguage}
          selectedWeekRecord={selectedWeekRecord}
          canCreateSafetySubmission={canCreateSafetySubmission}
          canUpdateSafetySubmission={canUpdateSafetySubmission}
          onOpenView={openView}
          onOpenUpload={openUpload}
          onOpenEvidenceGallery={(index) => {
            setSelectedEvidenceIndex(index);
            setShowEvidenceGallery(true);
          }}
        />
      )}

      {showEvidenceGallery && evidenceForGallery.length > 0 && (
        <EvidenceGalleryModal
          items={evidenceForGallery}
          selectedIndex={selectedEvidenceIndex}
          onSelectIndex={setSelectedEvidenceIndex}
          onClose={() => setShowEvidenceGallery(false)}
          language={safetyLanguage}
          variant="weekly"
        />
      )}

      <MonthlyRequirementsSection
        language={safetyLanguage}
        monthly={monthly}
        monthlyEvidenceForGallery={monthlyEvidenceForGallery}
        canCreateSafetySubmission={canCreateSafetySubmission}
        canUpdateSafetySubmission={canUpdateSafetySubmission}
        canMutateSafety={canMutateSafety}
        onOpenView={openView}
        onOpenMonthlyUpload={openMonthlyUpload}
        onOpenMonthlyEvidenceGallery={(index) => {
          setSelectedMonthlyEvidenceIndex(index);
          setShowMonthlyEvidenceGallery(true);
        }}
      />

      {showMonthlyEvidenceGallery && monthlyEvidenceForGallery.length > 0 && (
        <EvidenceGalleryModal
          items={monthlyEvidenceForGallery}
          selectedIndex={selectedMonthlyEvidenceIndex}
          onSelectIndex={setSelectedMonthlyEvidenceIndex}
          onClose={() => setShowMonthlyEvidenceGallery(false)}
          language={safetyLanguage}
          variant="monthly"
        />
      )}

      <RequirementRulesSection
        language={safetyLanguage}
        safetyPoints={safetyPoints}
        onSafetyPointsChange={handleSafetyPointsChange}
        allActivities={allActivities}
      />

      {showUploadModal && selectedActivity && (
        <UploadModal
          language={safetyLanguage}
          activity={localizeActivity(
            [...WEEKLY_ACTIVITIES, ...MONTHLY_ACTIVITIES].find((a) => a.id === selectedActivity)!,
            safetyLanguage
          )}
          date={date}
          location={location}
          descriptionEn={descriptionEn}
          descriptionCn={descriptionCn}
          pic={pic}
          users={users}
          loadingUsers={loadingUsers}
          fileNames={fileNames}
          filePreviews={filePreviews}
          submitting={submitting}
          setDate={setDate}
          setLocation={setLocation}
          setDescriptionEn={setDescriptionEn}
          setDescriptionCn={setDescriptionCn}
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
      {viewDetail && (
        <ViewSubmissionModal
          language={safetyLanguage}
          title={viewDetail.title}
          status={viewDetail.status}
          detail={viewDetail.detail}
          onClose={() => setViewDetail(null)}
        />
      )}
    </div>
  );
}
