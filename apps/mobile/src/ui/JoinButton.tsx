import type { JoinMode } from '@unicampus/shared-types';
import { Button } from './Button.js';

export type JoinViewerStatus = 'none' | 'pending' | 'active';

interface JoinButtonProps {
  status: JoinViewerStatus;
  joinMode: JoinMode;
  onJoin: () => void;
  onLeave?: () => void;
  loading?: boolean;
}

export function JoinButton({ status, joinMode, onJoin, onLeave, loading }: JoinButtonProps) {
  if (status === 'active') {
    return <Button label="Üyesin · Ayrıl" variant="outline" loading={loading} onPress={onLeave} />;
  }
  if (status === 'pending') {
    return <Button label="İstek Gönderildi" variant="secondary" disabled />;
  }
  if (joinMode === 'invite') {
    return <Button label="Sadece Davetle" variant="secondary" disabled />;
  }
  const label = joinMode === 'open' ? 'Katıl' : 'Katılma İsteği Gönder';
  return <Button label={label} variant="primary" loading={loading} onPress={onJoin} />;
}
