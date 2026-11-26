import crypto from "node:crypto";

/**
 * Strips spaces, hyphens, parentheses, and dots from a phone string.
 * Normalizes Bangladesh numbers (+8801XXXXXXXXX / 8801XXXXXXXXX) to canonical 01XXXXXXXXX.
 */
export const normalizePhone = (raw: string): string => {
	const cleaned = raw.trim().replace(/[\s\-().]/g, "");
	if (/^\+8801\d{9}$/.test(cleaned)) {
		return `0${cleaned.slice(4)}`;
	}
	if (/^8801\d{9}$/.test(cleaned)) {
		return `0${cleaned.slice(3)}`;
	}
	return cleaned;
};

/**
 * Returns all plausible stored variants for a phone input so login and
 * deduplication match regardless of whether the DB holds 017..., 88017..., or +88017...
 */
export const getPhoneLookupVariants = (raw: string): string[] => {
	const trimmed = raw.trim();
	const normalized = normalizePhone(trimmed);
	const variants = new Set<string>([trimmed, normalized]);

	if (/^01\d{9}$/.test(normalized)) {
		const withoutZero = normalized.slice(1);
		variants.add(`880${withoutZero}`);
		variants.add(`+880${withoutZero}`);
	}

	return Array.from(variants).filter(Boolean);
};

/**
 * Generates a strong, easy-to-read 10-character temporary password.
 */
export const generateTemporaryPassword = (): string => {
	const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
	const lower = "abcdefghjkmnpqrstuvwxyz";
	const digits = "23456789";
	const symbols = "@#$!";
	const all = upper + lower + digits + symbols;

	const chars = [
		upper[crypto.randomInt(upper.length)]!,
		lower[crypto.randomInt(lower.length)]!,
		digits[crypto.randomInt(digits.length)]!,
		symbols[crypto.randomInt(symbols.length)]!,
	];
	for (let i = 0; i < 6; i++) {
		chars.push(all[crypto.randomInt(all.length)]!);
	}
	for (let i = chars.length - 1; i > 0; i--) {
		const j = crypto.randomInt(i + 1);
		[chars[i], chars[j]] = [chars[j]!, chars[i]!];
	}
	return chars.join("");
};
