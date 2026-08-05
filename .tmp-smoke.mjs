import { createClient } from "@supabase/supabase-js";

const URL = "https://fwsempxzolmxvecfpmgl.supabase.co";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3c2VtcHh6b2xteHZlY2ZwbWdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4NDUxOTIsImV4cCI6MjEwMTQyMTE5Mn0.E6kT5c_UJM7cuTCDI07bMaS1tUHV3G5ITwSDUy6TBQc";

const client = createClient(URL, KEY);
const email = "mehmet.orhan.edemen@santiye.com";
const pass = "Santiye2026";

const { data: signIn, error: signInErr } = await client.auth.signInWithPassword({ email, password: pass });
if (signInErr) throw new Error("login: " + signInErr.message);
console.log("login OK, user:", signIn.user?.id);

const me = client.auth.getUser();
const myId = (await me).data.user?.id;

// 1) self-read
const { data: rows, error: rErr } = await client
  .from("kullanicilar").select("id, admin").eq("id", myId);
if (rErr) throw new Error("read: " + rErr.message);
console.log("self-read OK, admin:", rows?.[0]?.admin, "count:", rows?.length);

// 2) self-update (no-op: same admin value, exercises UPDATE policy)
const { error: uErr } = await client
  .from("kullanicilar").update({ admin: rows[0].admin }).eq("id", myId).select();
if (uErr) throw new Error("self-update: " + uErr.message);
console.log("self-update OK");

// 3) forbidden update of another user's row (admin id is different)
const { data: admins } = await client
  .from("kullanicilar").select("id").eq("rol", "admin").limit(2);
const otherId = admins?.find((a) => a.id !== myId)?.id;
if (otherId) {
  const { error: fErr } = await client
    .from("kullanicilar").update({ admin: false }).eq("id", otherId).select();
  console.log("forbidden-update:", fErr ? `BLOCKED (${fErr.code}) OK` : "FAIL: ALLOWED");
} else {
  console.log("forbidden-update: skipped (no other row found)");
}

// 4) rpc helpers still work
const { data: isAdmin } = await client.rpc("santiye_is_admin");
const { data: isPm } = await client.rpc("santiye_is_pm");
console.log("rpc santiye_is_admin:", isAdmin, "| santiye_is_pm:", isPm);

// 5) realtime channel connect (ping)
const ch = client.channel("smoke-test");
await new Promise((res) => {
  ch.subscribe((status) => {
    console.log("realtime status:", status);
    res();
  });
});
await client.removeChannel(ch);

console.log("ALL OK");

