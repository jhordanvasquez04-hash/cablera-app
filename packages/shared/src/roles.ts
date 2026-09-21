export const ROLES = ["gestor", "cobrador", "super_admin"] as const;

export type Rol = (typeof ROLES)[number];
