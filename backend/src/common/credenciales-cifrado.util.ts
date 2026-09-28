import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGORITMO = "aes-256-gcm";
// Salt fija (no secreta): la clave real es OLT_CREDENTIALS_KEY (el secreto). Sirve solo para
// que scrypt derive una clave de 32 bytes a partir de esa passphrase, de forma determinística
// (mismo secreto → misma clave siempre, sin tener que guardar la salt por registro).
const SALT_DERIVACION = "cablera-credenciales-olt-v1";

function obtenerClave(configService: { getOrThrow<T>(clave: string): T }): Buffer {
  const secreto = configService.getOrThrow<string>("OLT_CREDENTIALS_KEY");
  return scryptSync(secreto, SALT_DERIVACION, 32);
}

/**
 * Cifra/descifra credenciales sensibles (ej. la clave SSH/Telnet de un OLT) con AES-256-GCM —
 * fusión con Keysls, que ya hacía esto para no guardar esas claves en texto plano en la BD.
 * El resultado es "iv.tag.datosCifrados" en base64, todo en un solo string para que quepa en
 * una sola columna de texto sin tener que partirlo en 3 campos.
 */
export function cifrarCredencial(configService: { getOrThrow<T>(clave: string): T }, textoPlano: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITMO, obtenerClave(configService), iv);
  const cifrado = Buffer.concat([cipher.update(textoPlano, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, cifrado].map((buffer) => buffer.toString("base64")).join(".");
}

export function descifrarCredencial(configService: { getOrThrow<T>(clave: string): T }, valorCifrado: string): string {
  const [ivB64, tagB64, datosB64] = valorCifrado.split(".");
  if (!ivB64 || !tagB64 || !datosB64) {
    throw new Error("Formato de credencial cifrada inválido");
  }
  const decipher = createDecipheriv(ALGORITMO, obtenerClave(configService), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(datosB64, "base64")), decipher.final()]).toString("utf8");
}
