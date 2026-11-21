-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN "anonimizadoEm" DATETIME;
ALTER TABLE "Usuario" ADD COLUMN "consentimentoEm" DATETIME;

-- CreateTable
CREATE TABLE "MovimentoPontos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "usuarioId" TEXT NOT NULL,
    "pedidoId" TEXT,
    "tipo" TEXT NOT NULL,
    "pontos" INTEGER NOT NULL,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MovimentoPontos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MovimentoPontos_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Pedido" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clienteId" TEXT NOT NULL,
    "unidadeId" TEXT NOT NULL,
    "canalPedido" TEXT NOT NULL,
    "formaPagamento" TEXT NOT NULL DEFAULT 'MOCK',
    "status" TEXT NOT NULL DEFAULT 'AGUARDANDO_PAGAMENTO',
    "total" REAL NOT NULL,
    "pontosUsados" INTEGER NOT NULL DEFAULT 0,
    "desconto" REAL NOT NULL DEFAULT 0,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Pedido_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Pedido_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Pedido" ("canalPedido", "clienteId", "criadoEm", "formaPagamento", "id", "status", "total", "unidadeId") SELECT "canalPedido", "clienteId", "criadoEm", "formaPagamento", "id", "status", "total", "unidadeId" FROM "Pedido";
DROP TABLE "Pedido";
ALTER TABLE "new_Pedido" RENAME TO "Pedido";
CREATE INDEX "Pedido_clienteId_idx" ON "Pedido"("clienteId");
CREATE INDEX "Pedido_canalPedido_status_idx" ON "Pedido"("canalPedido", "status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "MovimentoPontos_usuarioId_idx" ON "MovimentoPontos"("usuarioId");
