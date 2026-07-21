const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const assess = await prisma.skillAssessment.findFirst({
    where: { title: { contains: "ES6+" } },
    include: {
      questions: { orderBy: { id: "asc" } }
    }
  });
  console.log("ASSESSMENT QUESTIONS:");
  assess.questions.forEach((q, i) => {
    console.log(`${i+1}. id=${q.id} text="${q.questionText}" options="${q.options}" correct=${q.correctOption}`);
  });
}
main().catch(console.error).finally(() => prisma.$disconnect());
