import type { HttpClient } from "../http.js";
import type { SkillDetail, SkillSummary } from "../types.js";

export class SkillsResource {
  constructor(private readonly http: HttpClient) {}

  async list(options: { category?: string } = {}): Promise<SkillSummary[]> {
    const resp = await this.http.request<{ skills: SkillSummary[]; total: number }>({
      method: "GET",
      path: "/api/v3/mcp/skills",
      query: { category: options.category },
    });
    return resp.skills;
  }

  get(skillId: string): Promise<SkillDetail> {
    return this.http.request<SkillDetail>({
      method: "GET",
      path: `/api/v3/mcp/skills/${encodeURIComponent(skillId)}`,
    });
  }
}
