import type {
	Prisma,
	SequenceDocumentType,
} from "../generated/prisma/client.js";
import { toDhakaDateKey } from "./dhakaDate.js";

const DOC_PREFIX: Record<SequenceDocumentType, string> = {
	FEE_RECEIPT: "RCP",
	DONATION_RECEIPT: "DON",
	EXPENSE_VOUCHER: "VCH",
};

export const formatDocumentNumber = (
	docType: SequenceDocumentType,
	year: number,
	seqValue: number,
): string => {
	const prefix = DOC_PREFIX[docType];
	return `${prefix}-${year}-${String(seqValue).padStart(4, "0")}`;
};

/**
 * Generates a per-school, per-year gap-free sequential document number inside a transaction.
 */
export const generateNextDocumentNumber = async (
	tx: Prisma.TransactionClient,
	schoolId: number,
	docType: SequenceDocumentType,
	date: Date = new Date(),
): Promise<string> => {
	const year = Number(toDhakaDateKey(date).slice(0, 4)) || 2026;
	const seq = await tx.schoolDocumentSequence.upsert({
		where: {
			schoolId_docType_year: {
				schoolId,
				docType,
				year,
			},
		},
		create: {
			schoolId,
			docType,
			year,
			lastValue: 1,
		},
		update: {
			lastValue: { increment: 1 },
		},
		select: { lastValue: true },
	});
	return formatDocumentNumber(docType, year, seq.lastValue);
};
