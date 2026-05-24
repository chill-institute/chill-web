import { initSentry } from "./lib/sentry";
import { setupRuntimeErrorHandlers } from "./lib/runtime-errors";

setupRuntimeErrorHandlers();
initSentry();
