// 에란겔 + 태이고 기본 맵 데이터 삽입 시드
import { PrismaClient, MapType } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  await prisma.map.upsert({
    where: { type: MapType.erangel },
    update: {},
    create: { type: MapType.erangel, name: '에란겔' },
  });

  await prisma.map.upsert({
    where: { type: MapType.taego },
    update: {},
    create: { type: MapType.taego, name: '태이고' },
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
