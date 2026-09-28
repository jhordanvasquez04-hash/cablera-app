import { IsArray, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

// Fusión con Keysls: mismo shape que su plantilla de Excel (ver COLUMNAS_PLANTILLA en
// frontend-keysls/Contratos.jsx) — el parseo del archivo ya pasa client-side, acá solo llega
// el arreglo de filas ya convertidas a objetos. Todo opcional porque una celda vacía de Excel
// llega como '' o undefined, no como error de validación: cada fila se valida por su cuenta
// dentro de ContratosService.importarLote (igual que hace Keysls, fila por fila).
export class ImportarContratoFilaDto {
  contrato?: string;
  docIdentidad?: string;
  abonado?: string;
  direccion?: string;
  referencia?: string;
  sector?: string;
  tipoServicio?: string;
  nombrePlan?: string;
  diaCorte?: string | number;
  telefono?: string;
  cintillo?: string;
  puntoRed?: string;
  ipWan?: string;
  mascara?: string;
  gateway?: string;
  pppoeUsuario?: string;
  pppoePassword?: string;
}

export class ImportarContratosDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportarContratoFilaDto)
  filas!: ImportarContratoFilaDto[];
}
