// prisma/seed.js
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/index.js";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const adapter = new PrismaMariaDb(process.env.DATABASE_URL);
const prisma = new PrismaClient({ adapter });

async function main() {
  // očisti postojeće (da seed možemo pokretati više puta)
  await prisma.reservation.deleteMany();
  await prisma.space.deleteMany();

  // prostori
  const grupna = await prisma.space.create({
    data: {
      name: "Grupna soba A",
      description: "Soba za grupno učenje s pločom i projektorom.",
      location: "Pula, Zagrebačka 30",
      type: "GROUP_ROOM",
      capacity: 6,
      openFrom: "08:00",
      openTo: "22:00",
      providerId: 2,
    },
  });

  await prisma.space.create({
    data: {
      name: "Tiha soba 1",
      description: "Individualno mjesto za učenje u tišini.",
      location: "Pula, Zagrebačka 30",
      type: "QUIET_ROOM",
      capacity: 1,
      openFrom: "08:00",
      openTo: "20:00",
      providerId: 2,
    },
  });

  await prisma.space.create({
    data: {
      name: "Čitaonica Sjever",
      description: "Velika čitaonica s puno prirodnog svjetla.",
      location: "Pula, Centar",
      type: "READING_ROOM",
      capacity: 20,
      openFrom: "07:00",
      openTo: "23:00",
      providerId: 2,
    },
  });

  // jedna rezervacija na grupnoj sobi
  await prisma.reservation.create({
    data: {
      spaceId: grupna.id,
      userId: 1,
      startTime: new Date("2026-03-15T10:00:00"),
      endTime: new Date("2026-03-15T12:00:00"),
      status: "ACTIVE",
    },
  });

  console.log("Seed gotov.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });