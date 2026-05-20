const { PrismaClient } = require('./generated/prisma');
const prisma = new PrismaClient();

const map = {
  "Cl??udio": "Cláudio",
  "Silv??rio": "Silvério",
  "Jos??": "José",
  "T??c": "Téc",
  "Jo??o": "João",
  "Ant??nio": "Antônio",
  "M??rcio": "Márcio",
  "Concei????o": "Conceição",
  "S??o": "São",
  "J??lio": "Júlio",
  "Fl??vio": "Flávio",
  "M??rio": "Mário",
  "S??rgio": "Sérgio",
  "Andr??": "André",
  "F??bio": "Fábio",
  "S??nia": "Sônia",
  "M??nica": "Mônica",
  "V??toria": "Vitória",
  "Vit??ria": "Vitória",
  "Lu??s": "Luís",
  "C??sar": "César",
  "S??lvia": "Sílvia",
  "Ren??": "Renê",
  "L??cia": "Lúcia",
  "C??lia": "Célia",
  "H??lio": "Hélio"
};

async function fixNames() {
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
    console.log("Fim da correção de clientes.");
  } catch(e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

fixNames();
