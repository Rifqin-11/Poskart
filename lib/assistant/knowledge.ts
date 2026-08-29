export type AssistantLocale = "id" | "en";

export type KnowledgeChunk = {
  id: string;
  locale: AssistantLocale;
  title: string;
  content: string;
  keywords: string[];
  url: string;
};

export type KnowledgeResult = KnowledgeChunk & {
  score: number;
};

const KNOWLEDGE_CHUNKS: KnowledgeChunk[] = [
  {
    id: "kiosk-pairing",
    locale: "id",
    title: "Cara menghubungkan tablet kiosk",
    content:
      "Buka aplikasi POSKART Kiosk pada tablet, lalu pilih Login dengan code. " +
      "Tablet akan menampilkan kode pairing 8 karakter. " +
      "Masuk ke POSKART Web Admin, buka Devices lalu Add device, " +
      "kemudian masukkan kode dari tablet.",
    keywords: [
      "pairing",
      "tablet",
      "device",
      "kiosk",
      "hubungkan",
      "sambungkan",
      "kode",
    ],
    url: "https://docs.poskart.my.id/docs/kiosk-pairing",
  },
  {
    id: "kiosk-pairing-expired",
    locale: "id",
    title: "Kode pairing kedaluwarsa",
    content:
      "Kode pairing berlaku selama 10 menit. " +
      "Jika kode kedaluwarsa, tekan Buat kode baru pada tablet " +
      "dan masukkan kode terbaru melalui Devices lalu Add device.",
    keywords: ["pairing", "kode", "expired", "kedaluwarsa", "gagal", "tablet"],
    url: "https://docs.poskart.my.id/docs/kiosk-pairing#3-kode-kedaluwarsa-atau-gagal",
  },
];

const STOP_WORDS = new Set([
  "apa",
  "apakah",
  "bagaimana",
  "cara",
  "yang",
  "dan",
  "di",
  "ke",
  "dari",
  "untuk",
  "saya",
]);

function tokenize(text: string) {
  return text
    .toLocaleLowerCase("id-ID")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((term) => term.length > 1 && !STOP_WORDS.has(term));
}

export function retrieveKnowledge({
  question,
  locale,
  limit = 3,
}: {
  question: string;
  locale: AssistantLocale;
  limit?: number;
}): KnowledgeResult[] {
  const terms = tokenize(question);

  if (terms.length === 0) {
    return [];
  }

  return KNOWLEDGE_CHUNKS.filter((chunk) => chunk.locale === locale)
    .map((chunk) => {
      const title = chunk.title.toLocaleLowerCase("id-ID");
      const content = chunk.content.toLocaleLowerCase("id-ID");
      const keywords = chunk.keywords.map((keyword) =>
        keyword.toLocaleLowerCase("id-ID"),
      );

      const score = terms.reduce((total, term) => {
        if (title.includes(term)) total += 8;
        if (keywords.some((keyword) => keyword.includes(term))) total += 4;
        if (content.includes(term)) total += 1;

        return total;
      }, 0);

      return {
        ...chunk,
        score,
      };
    })
    .filter((chunk) => chunk.score > 0)
    .sort((first, second) => second.score - first.score)
    .slice(0, limit);
}
