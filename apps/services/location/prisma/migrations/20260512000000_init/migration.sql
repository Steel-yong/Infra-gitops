-- CreateEnum
CREATE TYPE "MapType" AS ENUM ('erangel', 'taego');

-- CreateEnum
CREATE TYPE "LocationTier" AS ENUM ('S', 'A', 'B');

-- CreateTable
CREATE TABLE "Map" (
    "id" TEXT NOT NULL,
    "type" "MapType" NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Map_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "mapId" TEXT NOT NULL,
    "coordX" DOUBLE PRECISION NOT NULL,
    "coordY" DOUBLE PRECISION NOT NULL,
    "tier" "LocationTier" NOT NULL,
    "proTeamNames" TEXT[],
    "usageCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CirclePhase" (
    "id" TEXT NOT NULL,
    "mapId" TEXT NOT NULL,
    "phaseNumber" INTEGER NOT NULL,
    "waitSeconds" INTEGER NOT NULL,
    "shrinkSeconds" INTEGER NOT NULL,

    CONSTRAINT "CirclePhase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "mapType" "MapType" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Map_type_key" ON "Map"("type");

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "Map"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CirclePhase" ADD CONSTRAINT "CirclePhase_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "Map"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
