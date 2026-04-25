export function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, "");
  return cleaned.length >= 10 && cleaned.length <= 15;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidSenderId(id: string): boolean {
  if (/^\+?\d+$/.test(id)) return id.replace(/\D/g, "").length >= 10;
  return /^[a-zA-Z0-9]{1,11}$/.test(id);
}

export function isSmsMessageEmpty(message: string): boolean {
  return message.trim().length === 0;
}

export function isSmsMessageTooLong(message: string, maxLength = 1600): boolean {
  return message.length > maxLength;
}
