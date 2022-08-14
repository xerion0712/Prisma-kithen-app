import type { InferQueryOutput } from '@tens/api/src/types';
import { trpc } from '@tens/expo/utils/trpc';
import {
  Actionsheet,
  Box,
  Divider,
  HStack,
  Text,
  useDisclose,
  VStack,
} from 'native-base';
import { ReactElement } from 'react';
import { TouchableOpacity } from 'react-native';
import { ReactionButton } from './ReactionButton/ReactionButton';

type Props = {
  question: InferQueryOutput<'question.list'>[0];
  cursor?: string;
  take: number;
};

const reactions = ['👍', '👎', '❤️', '🙌', '👀', '😄', '😠'];

export const QuestionsItem = ({
  question,
  cursor,
  take,
}: Props): ReactElement => {
  const { isOpen, onOpen, onClose } = useDisclose();

  const queryClient = trpc.useContext();

  const mutation = trpc.useMutation(['vote.toggle'], {
    onMutate: async ({ content, questionId }) => {
      const args = { roomId: question.roomId, cursor, take };

      await queryClient.cancelQuery(['question.list', args]);

      const previous = queryClient.getQueryData(['question.list', args]);

      if (!previous) return {};

      const next = [...previous];
      const counts = [...question.counts];

      const vote = !question.vote
        ? {
            content,
            createdAt: new Date(),
            id: `${Math.random() * 1e16}`,
            questionId,
            userId: question.userId,
          }
        : question.vote.content !== content
        ? { ...question.vote, content }
        : undefined;

      if (!question.vote || question.vote.content !== content) {
        const index = counts.findIndex((e) => e.content === content);
        if (index >= 0) {
          const count = counts[index];
          counts[index] = { ...count, _count: count._count + 1 };
        } else {
          counts.push({ _count: 1, content, questionId });
        }
      }

      if (question.vote) {
        const currentContent = question.vote?.content;
        const index = counts.findIndex((e) => e.content === currentContent);
        if (index >= 0) {
          const count = counts[index];
          counts[index] = { ...count, _count: count._count - 1 };
        }
      }

      const questionIndex = next.findIndex((entry) => entry.id === questionId);
      next[questionIndex] = { ...question, vote, counts: counts };

      queryClient.setQueryData(['question.list', args], next);

      return { previous };
    },
    onError: (_err, _variables, context) => {
      if (!context?.previous) return;
      const args = { roomId: question.roomId, cursor, take };
      queryClient.setQueryData(['question.list', args], context.previous);
    },
    onSettled: () => {
      const args = { roomId: question.roomId, cursor, take };
      queryClient.invalidateQueries(['question.list', args]);
    },
  });

  const handleReactionClick = (content: string) => {
    mutation.mutate({ content, questionId: question.id });
  };

  const votesCount = question.counts.reduce(
    (prev, curr) => prev + curr._count,
    0,
  );

  return (
    <Box bg="white" m={1}>
      <TouchableOpacity onPress={onOpen}>
        <VStack padding={4}>
          <Text>{votesCount}</Text>
          <Text>{question.content}</Text>
          {votesCount ? (
            <HStack w="100%" justifyContent="flex-start" space={1} pt={2}>
              {question.counts.map(
                (count) =>
                  count._count > 0 && (
                    <ReactionButton
                      key={count.content}
                      reaction={count.content}
                      onPress={() => handleReactionClick(count.content)}
                      question={question}
                    />
                  ),
              )}
            </HStack>
          ) : null}
        </VStack>
      </TouchableOpacity>
      <Actionsheet isOpen={isOpen} onClose={onClose}>
        <Actionsheet.Content borderTopRadius="0">
          <HStack w="100%" justifyContent="center" space={1} pb={4}>
            {reactions.map((reaction) => (
              <ReactionButton
                key={reaction}
                reaction={reaction}
                onPress={() => handleReactionClick(reaction)}
                question={question}
              />
            ))}
          </HStack>
          <Divider />
          <Actionsheet.Item>Delete</Actionsheet.Item>
        </Actionsheet.Content>
      </Actionsheet>
    </Box>
  );
};
