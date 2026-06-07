import { useState } from 'react';
import { Image, Modal, Pressable, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme.js';
import { Text } from './Text.js';

interface ChatInputProps {
  onSend: (text: string) => void;
  onSendMedia?: (mediaUrl: string, viewOnce: boolean) => void;
  sending?: boolean;
}

const MEDIA_SAMPLES = [
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600',
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=600',
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=600',
];

export function ChatInput({ onSend, onSendMedia, sending }: ChatInputProps) {
  const { theme, spacing, radius } = useTheme();
  const [text, setText] = useState('');
  const [attachOpen, setAttachOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [viewOnce, setViewOnce] = useState(false);

  function submit() {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    onSend(trimmed);
    setText('');
  }

  function sendMedia() {
    if (!selected || !onSendMedia) return;
    onSendMedia(selected, viewOnce);
    setSelected(null);
    setViewOnce(false);
    setAttachOpen(false);
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 8,
        padding: spacing[2],
        borderTopWidth: 1,
        borderTopColor: theme.border,
        backgroundColor: theme.surface,
      }}
    >
      {onSendMedia ? (
        <Pressable
          onPress={() => setAttachOpen(true)}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: theme.surface2,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="add" size={24} color={theme.textPrimary} />
        </Pressable>
      ) : null}
      <View
        style={{
          flex: 1,
          backgroundColor: theme.surface2,
          borderRadius: 22,
          paddingHorizontal: 16,
          paddingVertical: 8,
          maxHeight: 120,
        }}
      >
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Mesaj yaz..."
          placeholderTextColor={theme.textMuted}
          multiline
          style={{ color: theme.textPrimary, fontSize: 16, maxHeight: 100 }}
        />
      </View>
      <Pressable
        onPress={submit}
        disabled={!text.trim() || sending}
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: text.trim() ? theme.primary : theme.surface3,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="send" size={20} color={text.trim() ? '#fff' : theme.textMuted} />
      </Pressable>

      <Modal visible={attachOpen} transparent animationType="slide" onRequestClose={() => setAttachOpen(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
          onPress={() => setAttachOpen(false)}
        >
          <Pressable
            style={{
              backgroundColor: theme.surface,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              padding: spacing[4],
              gap: spacing[3],
            }}
          >
            <Text variant="headingMd">Medya gönder</Text>
            <View style={{ flexDirection: 'row', gap: spacing[2] }}>
              {MEDIA_SAMPLES.map((url) => (
                <Pressable key={url} onPress={() => setSelected(url)} style={{ flex: 1 }}>
                  <Image
                    source={{ uri: url }}
                    style={{
                      width: '100%',
                      height: 90,
                      borderRadius: 12,
                      borderWidth: selected === url ? 2 : 0,
                      borderColor: theme.primary,
                    }}
                  />
                </Pressable>
              ))}
            </View>
            <Pressable
              onPress={() => setViewOnce((v) => !v)}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="flame-outline" size={20} color={theme.textPrimary} />
                <Text weight="600">Tek görüntülemelik</Text>
              </View>
              <View
                style={{
                  width: 44,
                  height: 26,
                  borderRadius: 13,
                  backgroundColor: viewOnce ? theme.primary : theme.surface3,
                  padding: 3,
                  alignItems: viewOnce ? 'flex-end' : 'flex-start',
                }}
              >
                <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' }} />
              </View>
            </Pressable>
            <Pressable
              onPress={sendMedia}
              disabled={!selected}
              style={{
                height: 48,
                borderRadius: radius.md,
                backgroundColor: selected ? theme.primary : theme.surface3,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: selected ? '#fff' : theme.textMuted, fontWeight: '600' }}>Gönder</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
