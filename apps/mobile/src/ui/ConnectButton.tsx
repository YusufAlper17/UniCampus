import { Button } from './Button.js';

export type ConnectState = 'none' | 'pending' | 'connected';

interface ConnectButtonProps {
  state: ConnectState;
  onPress: () => void;
  loading?: boolean;
}

export function ConnectButton({ state, onPress, loading }: ConnectButtonProps) {
  const config = {
    none: { label: 'Bağlantı Kur', variant: 'outline' as const },
    pending: { label: 'İstek Beklemede', variant: 'secondary' as const },
    connected: { label: 'Bağlantılı', variant: 'secondary' as const },
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
