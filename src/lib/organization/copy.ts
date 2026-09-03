export type OrganizationLanguage = "en" | "cn";

type TextPair = readonly [string, string];

export const ORGANIZATION_TEXT = {
  leaveTitle: ["Leave Requests", "请假申请"] as TextPair,
  leaveSubtitle: [
    "Submit and review leave, overtime, and attendance exceptions.",
    "提交并审核请假、加班与出勤异常。",
  ] as TextPair,
  newRequest: ["New Request", "新建申请"] as TextPair,
  employee: ["Employee", "员工"] as TextPair,
  department: ["Department", "部门"] as TextPair,
  date: ["Date", "日期"] as TextPair,
  type: ["Type", "类型"] as TextPair,
  time: ["Time", "时间"] as TextPair,
  start: ["Start", "开始"] as TextPair,
  end: ["End", "结束"] as TextPair,
  reason: ["Reason", "原因"] as TextPair,
  status: ["Status", "状态"] as TextPair,
  createdBy: ["Created By", "创建人"] as TextPair,
  approvedBy: ["Approved By", "审核人"] as TextPair,
  action: ["Action", "操作"] as TextPair,
  loadingRequests: ["Loading requests...", "加载申请记录..."] as TextPair,
  loadingEmployees: ["Loading employees...", "加载员工..."] as TextPair,
  noRequests: ["No leave requests found.", "暂无请假申请。"] as TextPair,
  noEmployees: ["No active employees", "没有可用员工"] as TextPair,
  approve: ["Approve", "批准"] as TextPair,
  reject: ["Reject", "拒绝"] as TextPair,
  submit: ["Submit", "提交"] as TextPair,
  cancel: ["Cancel", "取消"] as TextPair,
  close: ["Close", "关闭"] as TextPair,
  loading: ["Loading...", "加载中..."] as TextPair,
  noAttendanceRecords: [
    "No attendance records found",
    "未找到出勤记录",
  ] as TextPair,
  accountNotIdentified: [
    "Current login account could not be identified. Approval is disabled.",
    "无法识别当前登录账户，无法执行审核。",
  ] as TextPair,
} as const;

export type OrganizationTextKey = keyof typeof ORGANIZATION_TEXT;

export function organizationText(
  key: OrganizationTextKey,
  language: OrganizationLanguage
): string {
  const pair = ORGANIZATION_TEXT[key];
  return pair[language === "cn" ? 1 : 0];
}
