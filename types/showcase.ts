export type Showcase = {
  id: string;
  name: string;
  description: string;
  publicToken: string;
  templateIds: string[];
  themeIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type ShowcaseInput = {
  name: string;
  description: string;
  templateIds: string[];
  themeIds: string[];
};
