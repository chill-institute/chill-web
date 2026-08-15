export type ClientRequestEvidence = {
  operation: string;
  requestId: string;
};

const clientRequestEvidence = new WeakMap<object, ClientRequestEvidence>();

export function annotateClientRequestEvidence(error: unknown, evidence: ClientRequestEvidence) {
  if (typeof error !== "object" || error === null) return;
  clientRequestEvidence.set(error, evidence);
}

export function getClientRequestEvidence(error: unknown) {
  return typeof error === "object" && error !== null ? clientRequestEvidence.get(error) : undefined;
}
