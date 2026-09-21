import { HttpException, HttpStatus, Injectable } from "@nestjs/common";

interface Registro {
  fallos: number;
  desde: number;
}

const VENTANA_MS = 15 * 60_000;
const MAX_FALLOS_POR_CUENTA = 8;
const MAX_FALLOS_POR_IP = 40;
const MAX_REGISTROS = 10_000;

/**
 * Freno a la fuerza bruta en el login, en memoria (una sola instancia del backend). Cuenta los
 * intentos FALLIDOS por par IP+correo y por IP; un login correcto borra el contador de esa cuenta.
 * Al reiniciar el servicio los contadores se reinician: es un freno, no un registro de auditoría.
 */
@Injectable()
export class LoginThrottle {
  private readonly registros = new Map<string, Registro>();

  /** Lanza 429 si esta IP o esta cuenta ya agotó sus intentos fallidos. */
  verificar(ip: string, email: string) {
    if (this.excedido(this.claveIp(ip), MAX_FALLOS_POR_IP) || this.excedido(this.claveCuenta(ip, email), MAX_FALLOS_POR_CUENTA)) {
      throw new HttpException("Demasiados intentos fallidos. Espera unos minutos e inténtalo de nuevo.", HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  registrarFallo(ip: string, email: string) {
    this.sumar(this.claveIp(ip));
    this.sumar(this.claveCuenta(ip, email));
  }

  registrarExito(ip: string, email: string) {
    this.registros.delete(this.claveCuenta(ip, email));
  }

  private claveIp(ip: string) {
    return `ip:${ip}`;
  }

  private claveCuenta(ip: string, email: string) {
    return `cuenta:${ip}|${email.trim().toLowerCase()}`;
  }

  private vigente(clave: string): Registro | undefined {
    const registro = this.registros.get(clave);
    if (registro && Date.now() - registro.desde > VENTANA_MS) {
      this.registros.delete(clave);
      return undefined;
    }
    return registro;
  }

  private excedido(clave: string, maximo: number) {
    return (this.vigente(clave)?.fallos ?? 0) >= maximo;
  }

  private sumar(clave: string) {
    const registro = this.vigente(clave);
    if (registro) {
      registro.fallos++;
      return;
    }
    if (this.registros.size >= MAX_REGISTROS) this.podar();
    this.registros.set(clave, { fallos: 1, desde: Date.now() });
  }

  private podar() {
    const ahora = Date.now();
    for (const [clave, registro] of this.registros) {
      if (ahora - registro.desde > VENTANA_MS) this.registros.delete(clave);
    }
    // Si sigue lleno (ataque masivo), se descartan los más viejos para no crecer sin límite.
    if (this.registros.size >= MAX_REGISTROS) {
      for (const clave of [...this.registros.keys()].slice(0, MAX_REGISTROS / 2)) this.registros.delete(clave);
    }
  }
}
