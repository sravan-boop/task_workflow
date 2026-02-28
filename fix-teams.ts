const { PrismaClient } = require('./prisma/generated/prisma/client/index.js');
const prisma = new PrismaClient();

async function main() {
  const workspaceId = "cmlkqbb40001e5ywaku8uwydy";
  
  const owner = await prisma.workspaceMember.findFirst({
    where: { role: "OWNER" }
  });
  if (!owner) { console.log("No owner found"); return; }
  
  const targetTeam = await prisma.team.findFirst({
    where: { name: { contains: "SRAVAN" } }
  });
  if (!targetTeam) { console.log("Team not found"); return; }
  
  console.log(`Adding users to team: ${targetTeam.name}`);
  
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId: owner.workspaceId }
  });
  
  for (const m of members) {
    const existing = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: targetTeam.id, userId: m.userId } }
    });
    
    if (!existing) {
      console.log(`Adding user ${m.userId} to team`);
      await prisma.teamMember.create({
        data: {
          teamId: targetTeam.id,
          userId: m.userId,
          role: "MEMBER"
        }
      });
    }
  }
  console.log("Done");
}

main().catch(console.error).finally(() => prisma.$disconnect());
