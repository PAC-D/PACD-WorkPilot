import { z } from "zod";

export const entityChangedSchema=z.object({
  type:z.enum(["CLAIM_CHANGED","REQUEST_CHANGED","ACTIVITY_CHANGED","PROJECT_CHANGED","USER_GRANTS_CHANGED","CONFIG_CHANGED"]),
  entityId:z.string(),scope:z.string(),version:z.number().int().positive(),occurredAt:z.string().datetime(),
});
export type EntityChanged=z.infer<typeof entityChangedSchema>;
