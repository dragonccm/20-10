import { z } from "zod"
import {
  evidenceSchema,
  extractionSchema,
  answerSchema,
} from "./document-knowledge"
import { tutorSchema } from "./learning"
import { photoAdviceSchema } from "./image-regions"
import { companionReply } from "./companion"
import { designActionSchema } from "./design-actions"
const lines = z
  .union([z.string(), z.array(z.string())])
  .transform((v) => (Array.isArray(v) ? v.join("\n") : v))
export const cvCoachSchema = z.object({
  summary: z.string().max(4000),
  experience: z
    .array(z.object({ id: z.string().max(120), bullets: lines }))
    .max(20),
  explanations: z.array(z.string()).max(20),
  questions: z.array(z.string()).max(20),
})
export const citationVerdictSchema = z.object({
  status: z.enum(["supports", "partial", "contradicts", "insufficient"]),
  explanation: z.string().max(6000),
  evidence: z.array(evidenceSchema).max(12),
})
export const AI_CONTRACTS: Record<string, z.ZodTypeAny> = {
  "document-cards": z.object({
    questions: z
      .array(
        z.object({
          id: z.number().int().nonnegative(),
          question: z.string().min(3).max(1200),
        }),
      )
      .max(8),
  }),
  "document-extract": extractionSchema,
  "document-answer": answerSchema,
  "learning-tutor": tutorSchema,
  "photo-advice": photoAdviceSchema,
  companion: companionReply,
  "design-action": designActionSchema,
  "cv-coach": cvCoachSchema,
  "email-compose": z.object({
    subject: z.string().max(1000),
    body: z.string().max(16000),
  }),
  "citation-claims": z.object({
    claims: z
      .array(
        z.object({
          text: z.string().max(10000),
          query: z.string().max(1200),
          why: z.string().max(1800),
        }),
      )
      .max(8),
  }),
  "citation-evidence": citationVerdictSchema,
}
export function schemaInstruction(task: string) {
  const shapes: Record<string, string> = {
    "learning-tutor":
      '{"reply":"string","translation":"string or empty string","feedback":[{"original":"exact user text","suggested":"string","why":"string"}],"next":"string or empty string"}. All six keys use strings except feedback, which is an array. No extra keys.',
    "cv-coach":
      '{"summary":"string","experience":[{"id":"existing id","bullets":"string with newline separators"}],"explanations":["string"],"questions":["string"]}',
  }
  return (
    shapes[task] ||
    "Follow exactly the JSON shape in the system instructions. Use literal source quotes and correct page markers. No extra keys."
  )
}
/** Conservative guard, not a semantic proof: explicit failure to establish a claim cannot support an affirmative conclusion. */
export function guardCitation(
  claim: string,
  verdict: z.infer<typeof citationVerdictSchema>,
) {
  if (!["supports", "partial"].includes(verdict.status)) return verdict
  const noProof =
    /(?:không|chưa)\s+(?:(?:thể|đủ|có|được)\s+){0,3}(?:chứng minh|khẳng định|xác lập|kết luận)|(?:does? not|did not|cannot|not|no)\s+(?:\w+\s+){0,3}(?:prove|proof|establish|demonstrate|evidence)|insufficient evidence|fails? to (?:prove|establish)/iu
  const quoted = verdict.evidence.map((e) => e.quote).join("\n")
  if (!noProof.test(claim) && noProof.test(quoted))
    return {
      ...verdict,
      status: "insufficient" as const,
      explanation:
        "Đoạn dẫn nêu giới hạn hoặc chưa chứng minh được kết luận. Mình chưa đánh dấu nguồn này hỗ trợ nhận định khẳng định; bạn cần đọc ngữ cảnh và điều chỉnh câu nếu cần.",
    }
  return verdict
}
