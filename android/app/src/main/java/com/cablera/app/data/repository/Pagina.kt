package com.cablera.app.data.repository

import kotlinx.serialization.Serializable

/** Cuántos elementos trae cada página de un listado en el celular. */
const val TAMANO_PAGINA = 10

/**
 * Una página de un listado. `hayMas` indica si existe una página siguiente: se sabe pidiendo un
 * elemento de más (11 en vez de 10) y descartándolo, así no hace falta un total en la API.
 */
@Serializable
data class Pagina<T>(val items: List<T>, val hayMas: Boolean)

/** Pide una página: `pedir(limit, offset)` debe devolver hasta `limit` elementos desde `offset`. */
suspend fun <T> paginar(offset: Int, pedir: suspend (limit: Int, offset: Int) -> List<T>): Pagina<T> {
    val recibidos = pedir(TAMANO_PAGINA + 1, offset)
    return Pagina(items = recibidos.take(TAMANO_PAGINA), hayMas = recibidos.size > TAMANO_PAGINA)
}

/** Orden de las listas de servicios técnicos: abiertas primero, luego canceladas y al final completadas. */
const val ORDEN_PRIORIDAD = "prioridad"
