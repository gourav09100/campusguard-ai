import { query } from "./_generated/server";
import { requireUser } from "./helpers";

/** Campus buildings / blocks used by the report form and campus map. */
export const locations = query({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    return await ctx.db.query("locations").collect();
  },
});

/** Departments used for assignment routing. */
export const departments = query({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    return await ctx.db.query("departments").collect();
  },
});
