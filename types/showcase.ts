export type ShowcaseCustomItem = {
  id: string;
  category: string;
  title: string;
  description: string;
  imageUrl: string;
  storagePath: string;
};

export type ShowcaseCustomItemInput = Omit<ShowcaseCustomItem, "id">;

export type Showcase = {
  id: string;
  name: string;
  description: string;
  publicToken: string;
  templateIds: string[];
  themeIds: string[];
  customItems: ShowcaseCustomItem[];
  createdAt: string;
  updatedAt: string;
};

export type ShowcaseInput = {
  name: string;
  description: string;
  templateIds: string[];
  themeIds: string[];
  customItems: ShowcaseCustomItemInput[];
};
