import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface DatosReniec {
  dni: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  nombreCompleto: string;
}

/**
 * Fusión con Keysls: autocompletar nombre/apellidos de un cliente nuevo a partir de su DNI, vía
 * una API de consulta RENIEC (ej. apis.net.pe, decolecta, factiliza — hay varios proveedores de
 * pago que revenden este dato; RENIEC no tiene una API pública gratuita directa).
 *
 * IMPORTANTE — a diferencia del resto de módulos de esta fusión, este NO está probado contra un
 * proveedor real: no tengo una API key de ninguno para hacer la prueba en vivo. Queda armado y
 * listo para conectar (RENIEC_API_URL + RENIEC_API_TOKEN), fail-closed y con un mensaje claro
 * si no está configurado, en vez de fingir que funciona o inventar una respuesta.
 */
@Injectable()
export class ReniecService {
  constructor(private configService: ConfigService) {}

  async consultarDni(dni: string): Promise<DatosReniec> {
    if (!/^\d{8}$/.test(dni)) {
      throw new BadRequestException("El DNI debe tener 8 dígitos");
    }

    const apiUrl = this.configService.get<string>("RENIEC_API_URL");
    const apiToken = this.configService.get<string>("RENIEC_API_TOKEN");
    if (!apiUrl || !apiToken) {
      throw new ServiceUnavailableException(
        "La consulta a RENIEC no está configurada en este servidor (falta RENIEC_API_URL / RENIEC_API_TOKEN)",
      );
    }

    let respuesta: Response;
    try {
      respuesta = await fetch(`${apiUrl}/${dni}`, { headers: { Authorization: `Bearer ${apiToken}` } });
    } catch {
      throw new ServiceUnavailableException("No se pudo conectar con el servicio de RENIEC");
    }

    if (respuesta.status === 404) {
      throw new NotFoundException("No se encontró ese DNI en RENIEC");
    }
    if (!respuesta.ok) {
      throw new ServiceUnavailableException("El servicio de RENIEC no respondió correctamente");
    }

    // Forma de respuesta genérica (nombres/apellidoPaterno/apellidoMaterno) — el proveedor real
    // que se contrate puede variar el nombre exacto de estos campos; ajustar acá al integrar.
    const datos = (await respuesta.json()) as { nombres?: string; apellidoPaterno?: string; apellidoMaterno?: string };
    if (!datos.nombres || !datos.apellidoPaterno) {
      throw new NotFoundException("No se encontró ese DNI en RENIEC");
    }

    const nombreCompleto = [datos.nombres, datos.apellidoPaterno, datos.apellidoMaterno].filter(Boolean).join(" ");
    return { dni, nombres: datos.nombres, apellidoPaterno: datos.apellidoPaterno, apellidoMaterno: datos.apellidoMaterno ?? "", nombreCompleto };
  }
}
