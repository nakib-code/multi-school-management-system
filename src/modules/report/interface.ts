export interface ReportOverview {
	schools: {
		total: number;
		active: number;
		pending: number;
		blocked: number;
		rejected: number;
	};

	users: {
		total: number;
		superAdmin: number;
		admin: number;
		manager: number;
		teacher: number;
		student: number;
		guardian: number;
	};

	subscriptions: {
		total: number;
		active: number;
		pending: number;
		expired: number;
		cancelled: number;
	};

	payments: {
		totalRevenue: number;
		bkashRevenue: number;
		nagadRevenue: number;
		rocketRevenue: number;
		pendingAmount: number;
		totalPayments: number;
		verifiedPayments: number;
		pendingPayments: number;
		rejectedPayments: number;
	};

	packages: {
		total: number;
		active: number;
		inactive: number;
		custom: number;
	};

	customPackageRequests: {
		total: number;
		pending: number;
		approved: number;
		rejected: number;
		cancelled: number;
	};
}
