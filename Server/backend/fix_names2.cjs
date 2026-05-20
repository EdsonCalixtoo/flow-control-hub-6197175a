const { PrismaClient } = require('./generated/prisma');
const prisma = new PrismaClient();

const map = {
  "J??nior": "Júnior",
  "Magalh??es": "Magalhães",
  "Via????o": "Viação",
  "paix??o": "paixão",
  "In??cio": "Inácio",
  "Brand??o": "Brandão",
  "Ara??jo": "Araújo",
  "Rog??rio": "Rogério"
};

async function fixNames2() {
  try {
    const clients = await prisma.clients.findMany();
    for (const c of clients) {
      if (c.name.includes('??')) {
        let newName = c.name;
        for (const [bad, good] of Object.entries(map)) {
          newName = newName.replaceAll(bad, good);
        }
        if (newName !== c.name) {
          await prisma.clients.update({
            where: { id: c.id },
            data: { name: newName }
          });
          console.log(`Corrigido: ${c.name} -> ${newName}`);
        }
      }
    }
  } catch(e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

fixNames2();
