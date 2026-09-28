import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { TecnicosService } from "../tecnicos/tecnicos.service";
import { LoginThrottle } from "./login-throttle";
import { mensajeEmpresaBloqueada } from "./mensaje-empresa-bloqueada.util";
import type { LoginDto } from "./dto/login.dto";

// Mismo mecanismo que AuthService.HASH_RELLENO: compara igual contra un hash real aunque el
// correo no exista, para que la respuesta tarde lo mismo con o sin cuenta (evita enumerar).
const HASH_RELLENO = bcrypt.hashSync("relleno-sin-cuenta", 10);

/** Login del portal de campo — ver el comentario en tecnico-auth.guard.ts sobre por qué está
 * separado de AuthService (que autentica Usuario, no Tecnico). Comparte LoginThrottle: el freno
 * de fuerza bruta es por IP+correo, sin importar a qué tabla pertenezca la cuenta. */
@Injectable()
export class TecnicoAuthService {
  constructor(
    private tecnicosService: TecnicosService,
    private jwtService: JwtService,
    private throttle: LoginThrottle,
  ) {}

  async login(dto: LoginDto, ip: string) {
    const email = dto.email.trim().toLowerCase();
    this.throttle.verificar(ip, email);

    const tecnico = await this.tecnicosService.findByEmail(email);
    const passwordValida = await bcrypt.compare(dto.password, tecnico?.passwordHash ?? HASH_RELLENO);
    if (!tecnico || !passwordValida) {
      this.throttle.registrarFallo(ip, email);
      throw new UnauthorizedException("Credenciales inválidas");
    }

    // `!== "activa"` — ver el comentario en auth.service.ts (cubre "morosa" también).
    if (tecnico.empresa.estado !== "activa") {
      throw new UnauthorizedException(mensajeEmpresaBloqueada(tecnico.empresa.estado));
    }
    if (!tecnico.activo) {
      throw new UnauthorizedException("Esta cuenta fue desactivada. Contacta a tu gestor.");
    }

    this.throttle.registrarExito(ip, email);
    const payload = { sub: tecnico.id, email: tecnico.email, tipo: "tecnico" as const, empresaId: tecnico.empresaId };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      tecnico: { id: tecnico.id, nombre: tecnico.nombre, apellido: tecnico.apellido, email: tecnico.email },
    };
  }
}
