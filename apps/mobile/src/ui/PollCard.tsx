import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { PollData } from '@unicampus/shared-types';
import { useTheme } from '../lib/theme.js';
import { Text } from './Text.js';

interface PollCardProps {
  poll: PollData;
  onVote?: (optionId: string) => void;
}

export function PollCard({ poll, onVote }: PollCardProps) {
  const { theme, radius } = useTheme();
  const ended = new Date(poll.endsAt).getTime() < Date.now();
  const voted = poll.myVotes.length > 0;
  const showResults = voted || ended;

  return (
    <View style={{ gap: 8, marginTop: 4 }}>
      <Text weight="600">{poll.question}</Text>
      {poll.options.map((opt) => {
        const pct = poll.totalVotes > 0 ? Math.round((opt.voteCount / poll.totalVotes) * 100) : 0;
        const mine = poll.myVotes.includes(opt.id);
        return (
          <Pressable
            key={opt.id}
            disabled={showResults}
            onPress={() => onVote?.(opt.id)}
            style={{
              borderRadius: radius.md,
              borderWidth: 1.5,
              borderColor: mine ? theme.primary : theme.border,
              overflow: 'hidden',
            }}
          >
            {showResults ? (
              <View
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${pct}%`,
                  backgroundColor: mine ? theme.primary + '33' : theme.surface3,
                }}
              />
            ) : null}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 14,
                paddingVertical: 11,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {mine ? <Ionicons name="checkmark-circle" size={16} color={theme.primary} /> : null}
                <Text>{opt.text}</Text>
              </View>
              {showResults ? (
                <Text variant="caption" tone="muted" weight="600">
                  {pct}%
                </Text>
              ) : null}
            </View>
          </Pressable>
        );
      })}
      <Text variant="micro" tone="muted">
        {poll.totalVotes} oy · {ended ? 'Sona erdi' : 'Açık'}
      </Text>
    </View>
  );
}
