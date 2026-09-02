-- CreateTable
CREATE TABLE "personal" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "rol" TEXT NOT NULL,
    "contrasena_hash" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fecha_creacion" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "tipo_maquina" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fecha_creacion" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "form" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tipo_maquina_id" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fecha_creacion" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "form_tipo_maquina_id_fkey" FOREIGN KEY ("tipo_maquina_id") REFERENCES "tipo_maquina" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "pregunta" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "form_id" INTEGER NOT NULL,
    "texto" TEXT NOT NULL,
    "tipo_dato" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "obligatoria" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "pregunta_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "form" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "equipo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "form_id" INTEGER NOT NULL,
    "qr_token" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fecha_creacion" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "equipo_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "form" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "registro" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "equipo_id" INTEGER NOT NULL,
    "personal_id" INTEGER NOT NULL,
    "fecha_hora" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "registro_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "equipo" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "registro_personal_id_fkey" FOREIGN KEY ("personal_id") REFERENCES "personal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "respuesta" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "registro_id" INTEGER NOT NULL,
    "pregunta_id" INTEGER NOT NULL,
    "valor_boolean" BOOLEAN,
    "valor_texto" TEXT,
    "valor_numero" INTEGER,
    CONSTRAINT "respuesta_registro_id_fkey" FOREIGN KEY ("registro_id") REFERENCES "registro" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "respuesta_pregunta_id_fkey" FOREIGN KEY ("pregunta_id") REFERENCES "pregunta" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "imagen_adjunta" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "registro_id" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "origen" TEXT NOT NULL,
    "fecha_carga" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "imagen_adjunta_registro_id_fkey" FOREIGN KEY ("registro_id") REFERENCES "registro" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "personal_username_key" ON "personal"("username");

-- CreateIndex
CREATE UNIQUE INDEX "tipo_maquina_nombre_key" ON "tipo_maquina"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "form_tipo_maquina_id_key" ON "form"("tipo_maquina_id");

-- CreateIndex
CREATE UNIQUE INDEX "equipo_qr_token_key" ON "equipo"("qr_token");
