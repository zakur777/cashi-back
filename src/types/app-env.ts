export interface AuthUserContext {
	userId: number;
}

export type AppEnv = {
	Variables: {
		authUser: AuthUserContext;
	};
};
