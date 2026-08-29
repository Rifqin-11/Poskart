import {
  retrieveKnowledge,
  type AssistantLocale,
} from "@/lib/assistant/knowledge";
import { safeApiError } from "@/lib/http/safe-api-error";
import { getAdminContext, getAdminMembership } from "@/server/admin/context";

const MIN_QUESTION_LENGTH = 2;
const MAX_QUESTION_LENGTH = 500;

type SearchRequest = {
  question?: unknown;
  locale?: unknown;
};

export async function POST(request: Request) {
  try {
    await getAdminContext();

    const membership = await getAdminMembership();

    if(!membership) {
      return Response.json(
        {
          message: "Organization tidak ditemukan.",
        },
        {
          status: 403,
        },
      );
    }

    const body = (await request.json().catch(() => null)) as
      | SearchRequest
      | null;

    const question = typeof body?.question === "string" ? body.question.trim() : "";

    const locale: AssistantLocale = body?.locale === "en" ? "en" : "id";

    if(question.length < MIN_QUESTION_LENGTH) {
      return Response.json(
        {
          message: "Pertanyaan terlalu pendek.",
        },
        {
          status: 400,
        },
      );
    };

    if (question.length > MAX_QUESTION_LENGTH) {
      return Response.json(
        {
          message: `Pertanyaan maksimal ${MAX_QUESTION_LENGTH} karakter.`,
        },
        {
          status: 400,
        },
      );
    }

    const results = retrieveKnowledge({
      question,
      locale,
      limit: 3,
    });

    return Response.json({
      question,
      locale,
      results,
    });;
  } catch (error) {
    return safeApiError(error, {
      context: "api/admin/assistant/search",
      message: "Dokumentasi POSKART belum dapat dicari.",
    });
  }
}
