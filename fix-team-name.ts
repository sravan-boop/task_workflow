import { PrismaClient } from "./prisma/generated/prisma/client/index.js";
const prisma = new PrismaClient();

async function main() {
  const teamId = "cmlkqbb46001g5ywab70cuh1o";
  
  // Find current lead
  const lead = await prisma.teamMember.findFirst({
    where: { teamId, role: "LEAD" },
    include: { user: true }
  });
  
  if (lead && lead.user) {
    const newName = lead.user.name ? `${lead.user.name.toUpperCase()}'s Team` : "Team";
    await prisma.team.update({
      where: { id: teamId },
      data: { name: newName }
    });
    console.log(`Updated team name to ${newName}`);
  } else {
    console.log("No lead found");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
