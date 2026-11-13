// Removes practice accounts from the database in DATABASE_URL: everyone whose email
// ends in one of the given domains (default: loren.test, the practice team), plus any
// business left with nobody in it. Shows what it would delete; add --yes to delete.
//
//   node scripts/remove-practice-data.mjs              # preview
//   node scripts/remove-practice-data.mjs --yes        # delete
//   node scripts/remove-practice-data.mjs shot.test --yes
import "dotenv/config";
import pg from "pg";

const args = process.argv.slice(2);
const confirm = args.includes("--yes");
const domains = args.filter((a) => a !== "--yes");
if (!domains.length) domains.push("loren.test");
const patterns = domains.map((d) => `%@${d.replace(/^@/, "")}`);

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const { rows } = await client.query("select name, email from users where email like any($1) order by email", [patterns]);
console.log(rows.length ? rows.map((r) => `  ${r.name} <${r.email}>`).join("\n") : "  (no practice accounts found)");

if (rows.length && confirm) {
  await client.query("begin");
  await client.query("delete from users where email like any($1)", [patterns]);
  const empty = await client.query("delete from businesses b where not exists (select 1 from memberships m where m.business_id = b.id) returning name");
  await client.query("commit");
  console.log(`Deleted ${rows.length} people${empty.rowCount ? ` and ${empty.rowCount} empty businesses` : ""}.`);
} else if (rows.length) {
  console.log("\nNothing deleted. Run again with --yes to delete these.");
}
await client.end();
