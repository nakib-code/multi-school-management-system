export interface SignupInput {
	name: string;
	email: string;
	password: string;
	phone?: string | null;
}

export interface LoginInput {
	email: string;
	password: string;
}
