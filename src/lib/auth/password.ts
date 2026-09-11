import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres.")
  .regex(/[A-Z]/, "La contraseña debe incluir al menos una letra mayúscula.")
  .regex(/[0-9]/, "La contraseña debe incluir al menos un número.")
  .regex(/[^A-Za-z0-9]/, "La contraseña debe incluir al menos un símbolo.");

export function meetsPasswordRequirements(password: string): boolean {
  return passwordSchema.safeParse(password).success;
}

/** Temporary password for first-login Auth users. Never shown to the teacher. */
export function randomTempPassword(): string {
  return `${crypto.randomUUID()}Aa1!`;
}
