import "dotenv/config";
import { PrismaClient } from "./generated/prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    const teams = await prisma.team.findMany({
        include: {
            members: {
                include: {
                    user: true
                }
            }
        }
    });

    for (const team of teams) {
        console.log(`Team: ${team.name} (ID: ${team.id})`);
        for (const member of team.members) {
            console.log(`  - ${member.user?.name} (${member.role})`);
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
