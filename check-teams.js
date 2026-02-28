const { PrismaClient } = require('./prisma/generated/prisma/client/index.js');
const prisma = new PrismaClient();

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
        console.log(`Team ID: ${team.id}`);
        console.log(`Team Name: ${team.name}`);
        console.log(`Members:`);
        for (const member of team.members) {
            console.log(`  - ${member.user.name} (${member.role})`);
        }
        console.log('---');
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
