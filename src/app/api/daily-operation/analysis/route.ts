import { NextRequest, NextResponse } from "next/server";
import { PERMISSIONS, requirePermission } from "@/lib/auth";
import { query } from "@/lib/db";
import { resolveRange } from "@/lib/dateRange";
import type {
  AnalysisResult,
  DurationPoint,
  NamedCount,
  TopPicItem,
  TrendItem,
  UserRankItem,
} from "@/lib/types";

type NamedRow = { name_en: string | null; name_cn: string | null; count: number };
type CountRow = { label: string | null; count: number };
type UserRow = NamedRow & { division: string | null };
type TrendRow = { date: string; count: number };
type DurationRow = { division: string | null; duration_hours: number | null };
type AvgRow = { avg_minutes: number | null };

export async function GET(request: NextRequest) {
  const gate = await requirePermission(PERMISSIONS.dailyAnalysisView);
  if (gate instanceof NextResponse) return gate;

  try {
    const sp = request.nextUrl.searchParams;
    const division = sp.get("division");
    const { start, end } = resolveRange(sp.get("start"), sp.get("end"));
    const params: (string | Date)[] = [start, end];
    let filter = "m.deleted_at IS NULL AND m.start_time BETWEEN ? AND ?";
    if (division && division !== "All") {
      filter += " AND d.name_en = ?";
      params.push(division);
    }

    const [
      byStatus,
      byCategory,
      bySubcategory,
      byDivision,
      byType,
      trend,
      topPic,
      userRanking,
      durationRows,
      avg,
    ] = await Promise.all([
      query<NamedRow[]>(
        `SELECT st.name_en, st.name_cn, COUNT(*) AS count
         FROM mes_record m
         LEFT JOIN mes_status st ON m.status_id = st.id
         LEFT JOIN divisions d ON m.division_id = d.id
         WHERE ${filter}
         GROUP BY st.id, st.name_en, st.name_cn`,
        params
      ),
      query<NamedRow[]>(
        `SELECT c.name_en, c.name_cn, COUNT(*) AS count
         FROM mes_record m
         LEFT JOIN categories c ON m.category_id = c.id
         LEFT JOIN divisions d ON m.division_id = d.id
         
         WHERE ${filter}
         GROUP BY c.id, c.name_en, c.name_cn ORDER BY count DESC`,
        params
      ),
      query<NamedRow[]>(
        `SELECT s.name_en, s.name_cn, COUNT(*) AS count
         FROM mes_record m
         LEFT JOIN subcategories s ON m.subcategory_id = s.id
         LEFT JOIN divisions d ON m.division_id = d.id
         WHERE ${filter}
         GROUP BY s.id, s.name_en, s.name_cn ORDER BY count DESC`,
        params
      ),
      query<NamedRow[]>(
        `SELECT d.name_en, d.name_cn, COUNT(*) AS count
         FROM mes_record m
         LEFT JOIN divisions d ON m.division_id = d.id
         WHERE ${filter}
         GROUP BY d.id, d.name_en, d.name_cn ORDER BY count DESC`,
        params
      ),
      query<NamedRow[]>(
        `SELECT t.name_en, t.name_cn, COUNT(*) AS count
         FROM mes_record m
         LEFT JOIN mes_type t ON m.type_id = t.id
         LEFT JOIN divisions d ON m.division_id = d.id
         WHERE ${filter}
         GROUP BY t.id, t.name_en, t.name_cn ORDER BY count DESC`,
        params
      ),
      query<TrendRow[]>(
        `SELECT DATE(m.start_time) AS date, COUNT(*) AS count
         FROM mes_record m 
         LEFT JOIN divisions d ON m.division_id = d.id
         WHERE ${filter}
         GROUP BY DATE(m.start_time) ORDER BY date ASC`,
        params
      ),
      query<CountRow[]>(
        `SELECT u.name_en AS label, COUNT(*) AS count
         FROM mes_record m
         LEFT JOIN users u ON m.user_id = u.id
         LEFT JOIN divisions d ON m.division_id = d.id
         WHERE ${filter}
         GROUP BY u.name_en ORDER BY count DESC LIMIT 5`,
        params
      ),
      query<UserRow[]>(
        `SELECT u.name_en, u.name_cn, d.name_en AS division, COUNT(*) AS count
         FROM mes_record m
         LEFT JOIN users u ON m.user_id = u.id
         LEFT JOIN divisions d ON u.division_id = d.id
         WHERE ${filter}
         GROUP BY u.id, u.name_en, u.name_cn, d.name_en ORDER BY count DESC`,
        params
      ),
      query<DurationRow[]>(
        `SELECT d.name_en AS division,
                TIMESTAMPDIFF(MINUTE, m.start_time, m.end_time) / 60 AS duration_hours
         FROM mes_record m
         LEFT JOIN divisions d ON m.division_id = d.id
         WHERE ${filter} AND m.end_time IS NOT NULL`,
        params
      ),
      query<AvgRow[]>(
        `SELECT AVG(TIMESTAMPDIFF(MINUTE, m.start_time, m.end_time)) AS avg_minutes
         FROM mes_record m 
         LEFT JOIN divisions d ON m.division_id = d.id
         WHERE ${filter} AND m.end_time IS NOT NULL`,
        params
      ),
    ]);

    const toNamed = (rows: NamedRow[]): NamedCount[] =>
      rows.map((r) => ({
        name_en: r.name_en,
        name_cn: r.name_cn,
        count: Number(r.count),
      }));

    const total = byStatus.reduce((sum, r) => sum + Number(r.count), 0);
    const totalUsers = userRanking.length;
    const avgTasks = totalUsers > 0 ? Math.round((total / totalUsers) * 10) / 10 : 0;

    const result: AnalysisResult = {
      total,
      totalUsers,
      avgTasks,
      byStatus: toNamed(byStatus),
      byCategory: toNamed(byCategory),
      bySubcategory: toNamed(bySubcategory),
      byDivision: toNamed(byDivision),
      byType: toNamed(byType),
      trend: trend.map<TrendItem>((r) => ({
        date: r.date,
        count: Number(r.count),
      })),
      topPic: topPic.map<TopPicItem>((r) => ({
        name: r.label ?? "Unknown",
        count: Number(r.count),
      })),
      userRanking: userRanking.map<UserRankItem>((r) => ({
        name_en: r.name_en,
        name_cn: r.name_cn,
        division: r.division,
        count: Number(r.count),
      })),
      durationPerDivision: durationRows
        .filter((r) => r.duration_hours != null)
        .map<DurationPoint>((r) => ({
          division: r.division,
          duration_hours: Math.round(Number(r.duration_hours) * 100) / 100,
        })),
      avgDurationMinutes: Math.round(Number(avg[0]?.avg_minutes ?? 0)),
    };

    return NextResponse.json({ result, range: { start, end } });
  } catch (error) {
    console.error("GET /analysis failed", error);
    return NextResponse.json({ error: "Failed to load analysis." }, { status: 500 });
  }
}
