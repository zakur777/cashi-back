import { describe, expectTypeOf, it } from "vitest";
import {
	categoriesRepository,
	type CategoriesRepository,
} from "../../src/repositories/categories.repository.js";
import {
	transactionsRepository,
	type TransactionsRepository,
} from "../../src/repositories/transactions.repository.js";

describe("repository contract types", () => {
	it("exposes repositories that satisfy their explicit contracts", () => {
		expectTypeOf(categoriesRepository).toEqualTypeOf<CategoriesRepository>();
		expectTypeOf(
			transactionsRepository,
		).toEqualTypeOf<TransactionsRepository>();
	});
});
