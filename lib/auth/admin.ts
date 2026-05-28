export const superAdminEmails = [
  "rifqinaufal9009@gmail.com",
  "admin@poskart.id",
  "admin@poskart.my.id",
];

export function isSuperAdminEmail(email?: string | null) {
  return Boolean(email && superAdminEmails.includes(email.toLowerCase()));
}
