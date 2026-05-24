import { safeParse, type BaseIssue, type BaseSchema } from "valibot";

type ReadStorageOptions<TParsed, TValue> = {
  createValue: (parsed: TParsed) => TValue;
  failureMessage: string;
  invalidMessage: string;
  key: string;
  schema: BaseSchema<unknown, TParsed, BaseIssue<unknown>>;
};

type WriteStorageOptions<TValue, TStored> = {
  createStoredValue: (value: TValue) => TStored;
  failureMessage: string;
  key: string;
  value: TValue;
};

function warnStorageFailure(message: string, error?: unknown) {
  if (error === undefined) {
    console.warn(`[chill] ${message}`);
    return;
  }

  console.warn(`[chill] ${message}`, error);
}

function parseStoredJSON(raw: string) {
  return JSON.parse(raw, (_, value) =>
    typeof value === "string" && /^-?\d+n$/.test(value) ? BigInt(value.slice(0, -1)) : value,
  );
}

function stringifyStoredJSON(value: unknown) {
  return JSON.stringify(value, (_, next) => (typeof next === "bigint" ? `${next}n` : next));
}

function readStorageValue<TParsed, TValue>({
  createValue,
  failureMessage,
  invalidMessage,
  key,
  schema,
}: ReadStorageOptions<TParsed, TValue>): TValue | undefined {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return undefined;

    const parsed = parseStoredJSON(raw);
    const result = safeParse(schema, parsed);
    if (!result.success) {
      warnStorageFailure(invalidMessage);
      return undefined;
    }

    return createValue(result.output);
  } catch (error) {
    warnStorageFailure(failureMessage, error);
    return undefined;
  }
}

function writeStorageValue<TValue, TStored>({
  createStoredValue,
  failureMessage,
  key,
  value,
}: WriteStorageOptions<TValue, TStored>) {
  try {
    localStorage.setItem(key, stringifyStoredJSON(createStoredValue(value)));
  } catch (error) {
    warnStorageFailure(failureMessage, error);
  }
}

export { readStorageValue, writeStorageValue };
