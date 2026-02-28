import "dotenv/config";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });

async function main() {
  const res = await pool.query(`
    select t.id as team_id, t.name as team_name, u.name as user_name, m.role 
    from "Team" t 
    left join "TeamMember" m on t.id = m."teamId" 
    left join "User" u on m."userId" = u.id;
  `);

  console.table(res.rows);
}

main().catch(console.error).finally(() => pool.end());
