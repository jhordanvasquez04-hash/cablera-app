import { BadRequestException, Body, Controller, Delete, Get, Patch, Post, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { writeFile } from "fs/promises";
import { join } from "path";
import { ConfiguracionService } from "./configuracion.service";
import { UpdateConfiguracionDto } from "./dto/update-configuracion.dto";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser, type AuthenticatedUser } from "../auth/decorators/current-user.decorator";

// La extensión sale del tipo validado, nunca del nombre que manda el cliente (un "logo.html"
// declarado como image/png se serviría como HTML desde el dominio de la API).
const EXTENSION_POR_TIPO: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
};
const TIPOS_PERMITIDOS = Object.keys(EXTENSION_POR_TIPO);

/** Comprueba que el contenido real del archivo corresponde al tipo que declara. */
function contenidoCoincide(tipo: string, datos: Buffer): boolean {
  switch (tipo) {
    case "image/png":
      return datos.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    case "image/jpeg":
      return datos.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
    case "image/webp":
      return datos.subarray(0, 4).toString("ascii") === "RIFF" && datos.subarray(8, 12).toString("ascii") === "WEBP";
    case "image/svg+xml":
      return /<svg[\s>]/i.test(datos.subarray(0, 2048).toString("utf8"));
    default:
      return false;
  }
}
const UN_MB = 1_000_000;

@Controller("configuracion")
export class ConfiguracionController {
  constructor(private configuracionService: ConfiguracionService) {}

  // Requiere sesión a propósito: antes de iniciar sesión no hay forma de saber de qué empresa es
  // la persona (varias empresas comparten el mismo dominio/login), así que la pantalla de login usa
  // la marca fija de CableGestion, no la de ninguna empresa en particular. Ver LoginPage.tsx /
  // LoginScreen.kt. Una vez autenticado, cada quien ve solo la configuración de SU empresa.
  @Get()
  get(@CurrentUser() usuario: AuthenticatedUser) {
    return this.configuracionService.getConfiguracion(usuario.empresaId!);
  }

  @Roles("gestor")
  @Patch()
  update(@Body() dto: UpdateConfiguracionDto, @CurrentUser() usuario: AuthenticatedUser) {
    return this.configuracionService.updateConfiguracion(usuario.empresaId!, dto);
  }

  // Se usa el almacenamiento en memoria de multer (igual que la importación de Excel) y se
  // escribe el archivo a disco manualmente: el diskStorage de multer se cuelga en este entorno.
  @Roles("gestor")
  @Post("logo")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: UN_MB },
      fileFilter: (_req, file, callback) => {
        if (!TIPOS_PERMITIDOS.includes(file.mimetype)) {
          return callback(new BadRequestException("Solo se permiten imágenes PNG, JPG, WEBP o SVG"), false);
        }
        callback(null, true);
      },
    }),
  )
  async subirLogo(@UploadedFile() file: Express.Multer.File, @CurrentUser() usuario: AuthenticatedUser) {
    if (!file) {
      throw new BadRequestException("Debes adjuntar una imagen");
    }
    if (!contenidoCoincide(file.mimetype, file.buffer)) {
      throw new BadRequestException("El archivo no corresponde a una imagen válida del tipo indicado");
    }
    const nombreArchivo = `logo-${usuario.empresaId!.slice(0, 8)}-${Date.now()}${EXTENSION_POR_TIPO[file.mimetype]}`;
    await writeFile(join(process.cwd(), "uploads", "logos", nombreArchivo), file.buffer);
    return this.configuracionService.actualizarLogo(usuario.empresaId!, `/uploads/logos/${nombreArchivo}`);
  }

  @Roles("gestor")
  @Delete("logo")
  quitarLogo(@CurrentUser() usuario: AuthenticatedUser) {
    return this.configuracionService.actualizarLogo(usuario.empresaId!, null);
  }
}
