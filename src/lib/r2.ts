import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

export const ALLOWED_RECEIPT_MIME_TYPES = {
	JPEG: "image/jpeg",
	PNG: "image/png",
	WEBP: "image/webp",
} as const;

export const RECEIPT_EXTENSIONS_BY_MIME_TYPE = {
	[ALLOWED_RECEIPT_MIME_TYPES.JPEG]: "jpg",
	[ALLOWED_RECEIPT_MIME_TYPES.PNG]: "png",
	[ALLOWED_RECEIPT_MIME_TYPES.WEBP]: "webp",
} as const;

export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;

type ReceiptMimeType = keyof typeof RECEIPT_EXTENSIONS_BY_MIME_TYPE;

interface R2Config {
	accountId: string;
	accessKeyId: string;
	secretAccessKey: string;
	bucketName: string;
	publicUrl: string;
}

export interface UploadReceiptToR2Input {
	key: string;
	body: Uint8Array;
	contentType: ReceiptMimeType;
}

function readRequiredEnv(name: string): string {
	const value = process.env[name];

	if (!value) {
		throw new Error(`${name} is required.`);
	}

	return value;
}

function getR2Config(): R2Config {
	return {
		accountId: readRequiredEnv("R2_ACCOUNT_ID"),
		accessKeyId: readRequiredEnv("R2_ACCESS_KEY_ID"),
		secretAccessKey: readRequiredEnv("R2_SECRET_ACCESS_KEY"),
		bucketName: readRequiredEnv("R2_BUCKET_NAME"),
		publicUrl: readRequiredEnv("R2_PUBLIC_URL"),
	};
}

export function isAllowedReceiptMimeType(
	mimeType: string,
): mimeType is ReceiptMimeType {
	return Object.hasOwn(RECEIPT_EXTENSIONS_BY_MIME_TYPE, mimeType);
}

export function getReceiptExtension(mimeType: ReceiptMimeType): string {
	return RECEIPT_EXTENSIONS_BY_MIME_TYPE[mimeType];
}

export function buildR2PublicUrl(publicUrl: string, key: string): string {
	const normalizedPublicUrl = publicUrl.replace(/\/+$/, "");
	const normalizedKey = key.replace(/^\/+/, "");
	return `${normalizedPublicUrl}/${normalizedKey}`;
}

function createR2Client(config: R2Config): S3Client {
	return new S3Client({
		region: "auto",
		endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
		credentials: {
			accessKeyId: config.accessKeyId,
			secretAccessKey: config.secretAccessKey,
		},
	});
}

export async function uploadReceiptToR2(
	input: UploadReceiptToR2Input,
): Promise<string> {
	const config = getR2Config();
	const client = createR2Client(config);

	await client.send(
		new PutObjectCommand({
			Bucket: config.bucketName,
			Key: input.key,
			Body: input.body,
			ContentType: input.contentType,
		}),
	);

	return buildR2PublicUrl(config.publicUrl, input.key);
}
