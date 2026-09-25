/*
 * Single source of truth for the invitation.
 * Edit the values here — every text, link, countdown and calendar entry reads from it.
 */
window.INVITE = {
  event: {
    name: "Âu Trung Phong",
    date: "2026-09-27",
    startTime: "10:00",
    endTime: "12:00",
    timezone: "Asia/Bangkok",
    utcOffset: "+07:00", // GMT+7 (Asia/Bangkok has no daylight saving)
    venue: "Đại học Bách khoa Hà Nội",
    address: "Số 1 Đại Cồ Việt, phường Bạch Mai, Hà Nội",
    profileImage: "profile.jpg" // file inside /public — .jpg, .jpeg, .png or .webp
  },

  // Attendance is stored in Supabase. The anon/publishable key is public by design:
  // Row Level Security (see supabase/schema.sql) only lets it INSERT, never read.
  // Leave empty to fill in from GitHub repository secrets at deploy time instead.
  attendance: {
    supabaseUrl: "",
    supabaseAnonKey: "",
    table: "attendance"
  }
};
