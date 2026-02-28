import { PrismaClient } from "./prisma/generated/prisma/client/index.js";
const prisma = new PrismaClient();

async function main() {
  const teams = await prisma.team.findMany({
    include: {
      members: {
        where: { role: "LEAD" },
        include: { user: true }
      }
    }
  });

  for (const team of teams) {
    if (team.members[0]?.user) {
      const leadName = team.members[0].user.name;
      if (leadName) {
        const newName = `${leadName.toUpperCase()}'s Team`;
        if (team.name !== newName) {
          await prisma.team.update({
            where: { id: team.id },
            data: { name: newName }
          });
          console.log(`Updated team ${team.id} name to ${newName}`);
        }
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
