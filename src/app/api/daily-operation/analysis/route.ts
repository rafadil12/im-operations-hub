import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { resolveRange } from "@/lib/dateRange";
import type {
  AnalysisResult,
  CountItem,
  DurationPoint,
  NamedCount,
  TopPicItem,
  TrendItem,
  UserRankItem,
} from "@/lib/types";

type CountRow = { label: string | null; count: number };
type NamedRow = { name_en: string | null; name_cn: string | null; count: number };
type UserRow = NamedRow & { division: string | null };
type TrendRow = { date: string; count: number };
type DurationRow = { division: string | null; duration_hours: number | null };
type AvgRow = { avg_minutes: number | null };

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const { start, end } = resolveRange(sp.get("start"), sp.get("end"));
    const range = [start, end];
    const filter = "m.deleted_at IS NULL AND m.start_time BETWEEN ? AND ?";

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
      query<CountRow[]>(
        `SELECT m.status AS label, COUNT(*) AS count
         FROM mes_data m WHERE ${filter} GROUP BY m.status`,
        range,
      ),
      query<NamedRow[]>(
        `SELECT c.name_en, c.name_cn, COUNT(*) AS count
         FROM mes_data m
         LEFT JOIN categories c ON m.category_id = c.id
         WHERE ${filter}
         GROUP BY c.id, c.name_en, c.name_cn ORDER BY count DESC`,
        range,
      ),
      query<NamedRow[]>(
        `SELECT s.name_en, s.name_cn, COUNT(*) AS count
         FROM mes_data m
         LEFT JOIN subcategories s ON m.subcategory_id = s.id
         WHERE ${filter}
         GROUP BY s.id, s.name_en, s.name_cn ORDER BY count DESC`,
        range,
      ),
      query<NamedRow[]>(
        `SELECT d.name_en, d.name_cn, COUNT(*) AS count
         FROM mes_data m
         LEFT JOIN divisions d ON m.division_id = d.id
         WHERE ${filter}
         GROUP BY d.id, d.name_en, d.name_cn ORDER BY count DESC`,
        range,
      ),
      query<CountRow[]>(
        `SELECT m.type AS label, COUNT(*) AS count
         FROM mes_data m WHERE ${filter} GROUP BY m.type ORDER BY count DESC`,
        range,
      ),
      query<TrendRow[]>(
        `SELECT DATE(m.start_time) AS date, COUNT(*) AS count
         FROM mes_data m WHERE ${filter}
         GROUP BY DATE(m.start_time) ORDER BY date ASC`,
        range,
      ),
      query<CountRow[]>(
        `SELECT u.name_en AS label, COUNT(*) AS count
         FROM mes_data m
         LEFT JOIN users u ON m.user_id = u.id
         WHERE ${filter}
         GROUP BY u.name_en ORDER BY count DESC LIMIT 5`,
        range,
      ),
      query<UserRow[]>(
        `SELECT u.name_en, u.name_cn, d.name_en AS division, COUNT(*) AS count
         FROM mes_data m
         LEFT JOIN users u ON m.user_id = u.id
         LEFT JOIN divisions d ON u.division_id = d.id
         WHERE ${filter}
         GROUP BY u.id, u.name_en, u.name_cn, d.name_en ORDER BY count DESC`,
        range,
      ),
      query<DurationRow[]>(
        `SELECT d.name_en AS division,
                TIMESTAMPDIFF(MINUTE, m.start_time, m.end_time) / 60 AS duration_hours
         FROM mes_data m
         LEFT JOIN divisions d ON m.division_id = d.id
         WHERE ${filter} AND m.end_time IS NOT NULL`,
        range,
      ),
      query<AvgRow[]>(
        `SELECT AVG(TIMESTAMPDIFF(MINUTE, m.start_time, m.end_time)) AS avg_minutes
         FROM mes_data m WHERE ${filter} AND m.end_time IS NOT NULL`,
        range,
      ),
    ]);

    const toItems = (rows: CountRow[]): CountItem[] =>
      rows.map((r) => ({ label: r.label ?? "Unknown", count: Number(r.count) }));

    const toNamed = (rows: NamedRow[]): NamedCount[] =>
      rows.map((r) => ({
        name_en: r.name_en,
        name_cn: r.name_cn,
        count: Number(r.count),
      }));

    const total = byStatus.reduce((sum, r) => sum + Number(r.count), 0);

    const result: AnalysisResult = {
      total,
      byStatus: toItems(byStatus),
      byCategory: toNamed(byCategory),
      bySubcategory: toNamed(bySubcategory),
      byDivision: toNamed(byDivision),
      byType: toItems(byType),
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
    return NextResponse.json(
      { error: "Failed to load analysis." },
      { status: 500 },
    );
  }
}
