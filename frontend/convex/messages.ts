import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const send = mutation({
  args: {
    taskId: v.id("tasks"),
    agentId: v.id("agents"),
    content: v.string(),
    attachments: v.optional(v.array(v.id("documents"))),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    await ctx.db.insert("messages", {
      taskId: args.taskId,
      fromAgentId: args.agentId,
      content: args.content,
      attachments: args.attachments || [],
    });

    await ctx.db.insert("activities", {
      type: "message",
      agentId: args.agentId,
      message: `commented on "${task.title}"`,
      targetId: args.taskId,
    });
  },
});
