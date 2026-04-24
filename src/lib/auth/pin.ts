import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export function validatePinFormat(pin: string) {
  return /^\d{4,6}$/.test(pin);
}

export async function hashPin(pin: string) {
  if (!validatePinFormat(pin)) {
    throw new Error("PIN must be 4-6 digits");
  }
  return bcrypt.hash(pin, SALT_ROUNDS);
}

export async function comparePin(pin: string, hash: string) {
  if (!validatePinFormat(pin)) return false;
  return bcrypt.compare(pin, hash);
}
