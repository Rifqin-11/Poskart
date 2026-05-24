export type Template = {
  id: string;
  name: string;
  category: "receipt" | "frame" | "postcard" | "seasonal" | "event";
  status: "published" | "draft" | "archived";
  assignedBooths: number;
  updatedAt: string;
};
