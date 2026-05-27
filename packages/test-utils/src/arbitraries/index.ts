/**
 * Shared fast-check arbitraries for Formlane property-based tests.
 *
 * Import from "@repo/test-utils/arbitraries" in test files.
 *
 * @example
 * import { formArb, fieldArb, slugArb } from "@repo/test-utils/arbitraries";
 * import * as fc from "fast-check";
 *
 * it("property: ...", () => {
 *   fc.assert(fc.property(formArb, (form) => { ... }));
 * });
 */

export { slugArb } from "./slug";
export { optionArb, optionsArb } from "./option";
export type { OptionShape } from "./option";
export { fieldArb } from "./field";
export type { FieldShape, FieldType, FieldConfig } from "./field";
export { formArb, publishedFormArb } from "./form";
export type { FormShape, FormStatus, FormVisibility } from "./form";
export { answersArb, completeAnswersArb } from "./answers";
export type { AnswerShape, AnswersShape } from "./answers";
export { responseArb, responseSetArb } from "./response-set";
export type { ResponseShape } from "./response-set";
export { failingDbArb } from "./failing-db";
export type { FailingDbShape } from "./failing-db";
export { failingMailerArb } from "./failing-mailer";
export type { FailingMailerShape } from "./failing-mailer";
