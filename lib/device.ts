// بصمة الجهاز — معرّف ثابت في localStorage (للويب/PWA)
const KEY = "raslan_device_id";

export function getDeviceId(): string {
  if (typeof localStorage === "undefined") return "";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : "dev-" + Math.random().toString(36).slice(2) + Date.now();
    localStorage.setItem(KEY, id);
  }
  return id;
}
