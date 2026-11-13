// Creates (if needed) and migrates the database the browser tests use: the same
// server as DATABASE_URL, with "_test" added to the name. Your own local data in
// DATABASE_URL is never touched by the tests. Prints the test database URL.
import { execSync } from "node:child_process";
import "dotenv/config";
import pg from "pg";

const base = process.env.DATABASE_URL;
if (!base) throw new Error("DATABASE_URL is not set");
const url = new URL(base);
const name = url.pathname.slice(1);
const testName = name.endsWith("_test") ? name : `${name}_test`;
const testUrl = new URL(base);
testUrl.pathname = `/${testName}`;

const client = new pg.Client({ connectionString: base });
await client.connect();
const exists = await client.query("select 1 from pg_database where datname = $1", [testName]);
if (!exists.rowCount) await client.query(`create database "${testName.replace(/"/g, "")}"`);
await client.end();

execSync("npx prisma migrate deploy", { env: { ...process.env, DATABASE_URL: testUrl.toString(), DIRECT_URL: "" }, stdio: ["ignore", "ignore", "inherit"] });
process.stdout.write(testUrl.toString());
