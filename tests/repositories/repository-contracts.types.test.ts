import type { Prisma } from "@prisma/client";
import { describe, expectTypeOf, it } from "vitest";
import {
	categoriesRepository,
	type CategoriesRepository,
} from "../../src/repositories/categories.repository.js";
import {
	transactionsRepository,
	type TransactionsRepository,
} from "../../src/repositories/transactions.repository.js";

type TransactionRecord = Prisma.TransactionGetPayload<object>;

type TransactionOwnershipAndMetadata = Pick<
	TransactionRecord,
	"userId" | "receiptUrl" | "latitude" | "longitude"
>;

describe("repository contract types", () => {
	it("exposes repositories that satisfy their explicit contracts", () => {
		expectTypeOf(categoriesRepository).toEqualTypeOf<CategoriesRepository>();
		expectTypeOf(
			transactionsRepository,
		).toEqualTypeOf<TransactionsRepository>();
	});

	it("exposes transaction ownership and receipt metadata fields in Prisma types", () => {
		expectTypeOf<TransactionOwnershipAndMetadata>().toEqualTypeOf<{
			userId: number;
			receiptUrl: string | null;
			latitude: number | null;
			longitude: number | null;
		}>();
	});
});
