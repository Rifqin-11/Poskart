export const defaultLocale = "en";
export const supportedLocales = ["en", "id"] as const;

export type Locale = (typeof supportedLocales)[number];

export const dictionaries = {
  en: {
    "nav.dashboard": "Dashboard",
    "nav.pos": "POS Cashier",
    "nav.queue": "Queue",
    "nav.money": "Finance",
    "nav.transactions": "Transactions",
    "nav.withdraw": "Withdraw",
    "nav.pricing": "Pricing",
    "nav.devices": "Devices",
    "nav.themes": "Themes",
    "nav.templates": "Templates",
    "nav.showcase": "Showcase",
    "nav.gallery": "Gallery",
    "nav.vouchers": "Vouchers",
    "nav.superAdmin": "Super Admin",
    "nav.settings": "Settings",
    "common.organization": "Organization",
    "common.active": "Active",
    "common.locked": "Locked",
    "common.exp": "Exp",
    "common.language": "Language",
    "common.english": "English",
    "common.indonesian": "Indonesian",
    "topbar.signedInAs": "Signed in as",
    "notifications.title": "Notifications",
    "notifications.description": "Summary of important activity from the last hour.",
    "notifications.markAllRead": "Mark all as read",
    "notifications.allRead": "All read",
    "notifications.emptyTitle": "No important notifications",
    "notifications.emptyBody":
      "All dashboard services are running normally. Transaction, device, and print job notifications will appear here.",
    "notifications.openDetail": "Open detail",
    "notifications.justNow": "Just now",
    "account.preference": "Account preference",
    "account.changeSubscription": "Change subscription",
    "account.logout": "Logout",
    "transactions.bulk.actionSelected": "Action selected",
    "transactions.action.verify": "Verify",
    "transactions.action.refund": "Refund",
    "transactions.action.archive": "Archive",
    "transactions.action.markTesting": "Mark as test mode",
    "transactions.action.unmarkTesting": "Unmark test mode",
    "transactions.status.archive": "Archived",
    "transactions.status.testing": "Test mode",
    "payout.page.title": "Payout / Withdraw",
    "payout.page.description":
      "Monitor verified QRIS photobooth revenue and request organization withdrawals.",
    "gallery.noOrg": "This account is not connected to an organization.",
    "gallery.empty":
      "Photobooth results will appear after the kiosk creates a QR code and completes the upload.",
    "gallery.openResult": "Open photo result",
    "profile.fullNamePlaceholder": "Full name",
    "profile.identityDesc":
      "Manage the account identity used for the POSKART dashboard.",
    "settings.watermarkDesc": "Apply watermark to media output.",
    "settings.orgIdentityDesc":
      "Organization identity, join code, and workspace access status.",
    "settings.subscriptionDesc":
      "Plan summary, status, device limit, and organization subscription period.",
    "settings.payoutAccountDesc":
      "Bank account for withdrawing photobooth revenue from POSKART payment gateway.",
    "settings.membersDesc":
      "Manage members and invitations with access to this workspace.",
    "settings.changeRoleFailed": "Failed to change role",
    "settings.transferOwnershipSuccess": "Ownership transferred successfully",
    "settings.transferOwnershipFailed": "Failed to transfer ownership",
    "settings.acceptRequestFailed": "Failed to accept request",
    "settings.rejectRequestFailed": "Failed to reject request",
    "settings.leaveOrgDesc": "Leave this organization / workspace.",
    "settings.duitkuMerchantRequired":
      "Merchant code is required for Private Payment.",
    "superadmin.showPosDesc":
      "Show the POS Cashier page for manual sales input.",
    "superadmin.showMoneyDesc":
      "Show the Finance page for wallets, income, expenses, and transfers.",
    "tour.welcomeTitle": "Welcome to POSKART",
    "tour.welcomeDesc":
      "Manage all photobooth operations from one connected workspace.",
    "tour.navDesc":
      "Navigate to transactions, devices, templates, gallery, and settings from this menu.",
    "tour.searchTitle": "Search faster",
    "tour.searchDesc":
      "Use search to open pages or find important data without browsing the menu one by one.",
    "tour.orgStatusTitle": "Organization status",
    "tour.orgStatusDesc":
      "View the active workspace, subscription expiry, and organization settings access here.",
    "tour.profileTitle": "Profile and help",
    "tour.profileDesc":
      "Open the profile menu to set preferences, change language, or run this tutorial again at any time.",
    "voucher.timeSeconds": "sec",
    "voucher.timeMinuteSuffix": "m",
    "voucher.timeSecondSuffix": "s",
    "voucher.timeLeft": "Time left",
    "voucher.useVoucher": "Use Voucher",
    "gallery.kiosk.subtitle": "Raw and framed photo results from the kiosk.",
  },
  id: {
    "nav.dashboard": "Dashboard",
    "nav.pos": "POS Kasir",
    "nav.queue": "Antrian",
    "nav.money": "Keuangan",
    "nav.transactions": "Transaksi",
    "nav.withdraw": "Penarikan",
    "nav.pricing": "Pricing",
    "nav.devices": "Perangkat",
    "nav.themes": "Themes",
    "nav.templates": "Templates",
    "nav.showcase": "Showcase",
    "nav.gallery": "Gallery",
    "nav.vouchers": "Voucher",
    "nav.superAdmin": "Super Admin",
    "nav.settings": "Settings",
    "common.organization": "Organization",
    "common.active": "Active",
    "common.locked": "Locked",
    "common.exp": "Exp",
    "common.language": "Bahasa",
    "common.english": "English",
    "common.indonesian": "Indonesia",
    "topbar.signedInAs": "Signed in as",
    "notifications.title": "Notifications",
    "notifications.description": "Ringkasan aktivitas penting dari 1 jam terakhir.",
    "notifications.markAllRead": "Tandai semua dibaca",
    "notifications.allRead": "Dibaca semua",
    "notifications.emptyTitle": "Tidak ada notifikasi penting",
    "notifications.emptyBody":
      "Semua layanan dashboard berjalan normal. Notifikasi transaksi, device, dan print job akan tampil di sini.",
    "notifications.openDetail": "Buka detail",
    "notifications.justNow": "Baru saja",
    "account.preference": "Account preference",
    "account.changeSubscription": "Change subscription",
    "account.logout": "Logout",
    "transactions.bulk.actionSelected": "Action selected",
    "transactions.action.verify": "Verifikasi",
    "transactions.action.refund": "Refund",
    "transactions.action.archive": "Arsip",
    "transactions.action.markTesting": "Tandai mode testing",
    "transactions.action.unmarkTesting": "Batalkan mode testing",
    "transactions.status.archive": "Arsip",
    "transactions.status.testing": "Mode testing",
    "payout.page.title": "Pencairan / Penarikan",
    "payout.page.description":
      "Pantau saldo hasil QRIS photobooth dan ajukan pencairan dana organisasi.",
    "gallery.noOrg": "Akun ini belum terhubung ke organisasi.",
    "gallery.empty":
      "Hasil photobooth akan muncul setelah kiosk membuat QR dan menyelesaikan upload.",
    "gallery.openResult": "Buka hasil foto",
    "profile.fullNamePlaceholder": "Nama lengkap",
    "profile.identityDesc":
      "Kelola identitas akun yang dipakai untuk dashboard POSKART.",
    "settings.watermarkDesc": "Terapkan watermark pada output media.",
    "settings.orgIdentityDesc":
      "Identitas organisasi, join code, dan status akses workspace.",
    "settings.subscriptionDesc":
      "Ringkasan plan, status, limit perangkat, dan masa aktif organisasi.",
    "settings.payoutAccountDesc":
      "Rekening tujuan pencairan hasil photobooth dari payment gateway POSKART.",
    "settings.membersDesc":
      "Kelola member dan invitation yang memiliki akses ke workspace.",
    "settings.changeRoleFailed": "Gagal mengubah role",
    "settings.transferOwnershipSuccess": "Kepemilikan berhasil dipindahkan",
    "settings.transferOwnershipFailed": "Gagal memindahkan kepemilikan",
    "settings.acceptRequestFailed": "Gagal menerima permintaan",
    "settings.rejectRequestFailed": "Gagal menolak permintaan",
    "settings.leaveOrgDesc": "Keluar dari organisasi/workspace ini.",
    "settings.duitkuMerchantRequired":
      "Merchant code Duitku wajib diisi untuk Payment Private.",
    "superadmin.showPosDesc":
      "Tampilkan halaman POS Kasir untuk input penjualan manual.",
    "superadmin.showMoneyDesc":
      "Tampilkan halaman Keuangan untuk dompet, pemasukan, pengeluaran, dan transfer.",
    "tour.welcomeTitle": "Selamat datang di POSKART",
    "tour.welcomeDesc":
      "Kelola seluruh operasional photobooth dari satu workspace yang terhubung.",
    "tour.navDesc":
      "Pindah ke transaksi, device, template, galeri, dan pengaturan dari menu ini.",
    "tour.searchTitle": "Cari lebih cepat",
    "tour.searchDesc":
      "Gunakan pencarian untuk membuka halaman atau menemukan data penting tanpa menelusuri menu satu per satu.",
    "tour.orgStatusTitle": "Status organisasi",
    "tour.orgStatusDesc":
      "Lihat workspace aktif, masa berlaku langganan, dan akses pengaturan organisasi di sini.",
    "tour.profileTitle": "Profil dan bantuan",
    "tour.profileDesc":
      "Buka menu profil untuk mengatur preferensi, mengganti bahasa, atau menjalankan tutorial ini kembali kapan saja.",
    "voucher.timeSeconds": "detik",
    "voucher.timeMinuteSuffix": "m",
    "voucher.timeSecondSuffix": "d",
    "voucher.timeLeft": "Sisa",
    "voucher.useVoucher": "Gunakan Voucher",
    "gallery.kiosk.subtitle": "Hasil raw dan framed photo dari kiosk.",
  },
} as const;

export type DictionaryKey = keyof typeof dictionaries.en;

export function isLocale(value: string | null | undefined): value is Locale {
  return supportedLocales.includes(value as Locale);
}
