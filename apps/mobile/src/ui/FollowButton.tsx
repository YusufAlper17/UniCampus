import { Button } from './Button.js';

export type FollowState = 'none' | 'following' | 'requested';

interface FollowButtonProps {
  state: FollowState;
  onPress: () => void;
  loading?: boolean;
}

export function FollowButton({ state, onPress, loading }: FollowButtonProps) {
  const config = {
    none: { label: 'Takip Et', variant: 'primary' as const },
    following: { label: 'Takip Ediliyor', variant: 'secondary' as const },
    requested: { label: 'İstek Gönderildi', variant: 'outline' as const },
  }[state];

  return (
    <Button
      label={config.label}
      variant={config.variant}
      size="sm"
      fullWidth={false}
      loading={loading}
      onPress={onPress}
    />
  );
}
