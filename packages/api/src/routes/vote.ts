import { z } from 'zod';
import { protectedProcedure, t } from '../trpc';

export const voteRouter = t.router({
  toggle: protectedProcedure
    .input(
      z.object({
        questionId: z.string().uuid(),
        content: z.string().min(1).max(32),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { questionId, content } = input;

      // Fetch the question to validate its existence and get its roomId
      const question = await ctx.prisma.question.findFirstOrThrow({
        where: { id: questionId },
      });

      // Validate that the user is a member of the room
      await ctx.prisma.member.findFirstOrThrow({
        where: { roomId: question.roomId, userId: ctx.user.id },
      });

      // Check if the user has already voted on this question
      const existingVote = await ctx.prisma.vote.findFirst({
        where: { questionId, userId: ctx.user.id },
      });

      // If the vote content matches the new input, remove the vote
      if (existingVote?.content === content) {
        await ctx.prisma.vote.delete({
          where: { id: existingVote.id },
        });
        return { success: true, message: 'Vote removed' };
      }

      // If not, upsert the vote (create or update)
      const upsertedVote = await ctx.prisma.vote.upsert({
        where: {
          questionId_userId: {
            questionId,
            userId: ctx.user.id,
          },
        },
        create: {
          questionId,
          content,
          userId: ctx.user.id,
        },
        update: {
          content,
        },
      });

      return { success: true, message: 'Vote updated', vote: upsertedVote };
    }),
});
