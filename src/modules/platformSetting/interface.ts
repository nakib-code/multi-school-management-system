import type { MobileAccountType } from "../../generated/prisma/enums.js";

export interface UpdatePlatformSettingInput {
	platformName?: string | undefined;
	supportPhone?: string | null | undefined;
	bkashNumber?: string | null | undefined;
	bkashType?: MobileAccountType | undefined;
	nagadNumber?: string | null | undefined;
	nagadType?: MobileAccountType | undefined;
	rocketNumber?: string | null | undefined;
	rocketType?: MobileAccountType | undefined;
	paymentInstruction?: string | null | undefined;
}
