const bcrypt = require('bcrypt');
const { PrismaClient } = require('./generated/prisma');
const prisma = new PrismaClient();

async function run() {
  try {
    const hash = await bcrypt.hash('asddsa123', 10);
    const users = await prisma.users.findMany();
    for (const u of users) {
      await prisma.users.update({
        where: { id: u.id },
        data: { password: hash }
      });
    }
    console.log('Done!');
  } catch(e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
run();
