import { query } from "./_generated/server";
import { v } from "convex/values";
import { wajibRole } from "./lib";

export const daftar = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await wajibRole(ctx, token, ["admin", "pengawas"]);
    return await ctx.db.query("log").order("desc").take(150);
  },
});
