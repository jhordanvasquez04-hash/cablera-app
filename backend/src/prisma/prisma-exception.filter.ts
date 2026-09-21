import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { Response } from "express";

/**
 * Traduce los errores conocidos de la base a respuestas HTTP claras. Sin esto, un duplicado
 * (ej. crear un tipo de servicio que ya existe) llegaba al usuario como "Error interno (500)".
 * No expone nombres de tablas ni de columnas.
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(error: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const respuesta = host.switchToHttp().getResponse<Response>();

    let status: number;
    let message: string;
    switch (error.code) {
      case "P2002": // clave única repetida
        status = HttpStatus.CONFLICT;
        message = "Ya existe un registro con esos datos";
        break;
      case "P2025": // registro requerido no encontrado
        status = HttpStatus.NOT_FOUND;
        message = "No se encontró el registro solicitado";
        break;
      case "P2003": // referencia a un registro que no existe / en uso
        status = HttpStatus.CONFLICT;
        message = "La operación no es posible porque el registro está relacionado con otros datos";
        break;
      default:
        this.logger.error(`Error de base de datos ${error.code}: ${error.message}`);
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        message = "Internal server error";
    }

    respuesta.status(status).json({ statusCode: status, message });
  }
}
