import env from "../config/env.js";
import { prisma } from "./prisma.js";

const CACHE_TTL_MS = 60_000;
let cachedOrigins: Set<string> = new Set();
let cacheExpiresAt = 0;

export const normalizeWebsiteOrigin = (raw: string): string | null => {
	const trimmed = raw.trim();
	if (!trimmed) return null;
	try {
		const parsed = new URL(trimmed);
		const isProd = env.node_env === "production";
		const isLocalhost =
			parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";

		if (parsed.protocol === "https:") {
			return parsed.origin.toLowerCase();
		}
		if (!isProd && parsed.protocol === "http:" && isLocalhost) {
			return parsed.origin.toLowerCase();
		}
		return null;
	} catch {
		return null;
	}
};

export const invalidateExternalWebsiteOriginsCache = () => {
	cacheExpiresAt = 0;
};

export const getExternalWebsiteOrigins = async (): Promise<Set<string>> => {
	const now = Date.now();
	if (now < cacheExpiresAt) {
		return cachedOrigins;
	}

	try {
		const rows = await prisma.schoolSetting.findMany({
			where: { externalWebsiteUrl: { not: null } },
			select: { externalWebsiteUrl: true },
		});

		const next = new Set<string>();
		for (const row of rows) {
			if (!row.externalWebsiteUrl) continue;
			const origin = normalizeWebsiteOrigin(row.externalWebsiteUrl);
			if (origin) next.add(origin);
		}

		cachedOrigins = next;
		cacheExpiresAt = now + CACHE_TTL_MS;
		return cachedOrigins;
	} catch {
		return cachedOrigins;
	}
};
