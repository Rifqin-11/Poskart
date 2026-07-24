export type GlobalSearchResultKind =
  | "transaction"
  | "device"
  | "gallery"
  | "voucher"
  | "template"
  | "theme";

export type GlobalSearchResult = {
  id: string;
  kind: GlobalSearchResultKind;
  title: string;
  description: string;
  href: string;
};

export type GlobalSearchResponse = {
  query: string;
  results: GlobalSearchResult[];
};
