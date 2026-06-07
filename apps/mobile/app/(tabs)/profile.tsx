import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import type { ContentDomain } from '@unicampus/shared-types';
import { Text } from '../../src/ui/Text.js';
import { Avatar } from '../../src/ui/Avatar.js';
import { Button } from '../../src/ui/Button.js';
import { Badge } from '../../src/ui/Badge.js';
import { SegmentedControl } from '../../src/ui/SegmentedControl.js';
import { Skeleton } from '../../src/ui/Skeleton.js';
import { EmptyState } from '../../src/ui/EmptyState.js';
import { ProjectCard } from '../../src/ui/ProjectCard.js';
import { AcademicInfoCard } from '../../src/ui/AcademicInfoCard.js';
import { useTheme } from '../../src/lib/theme.js';
import { useAuthStore } from '../../src/lib/auth-store.js';
import { getMe } from '../../src/features/users/api.js';
import { getUserProjects } from '../../src/features/career/api.js';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileTab() {
  const { theme, spacing } = useTheme();
  const router = useRouter();
  const signOut = useAuthStore((s) => s.signOut);
  const [tab, setTab] = useState<ContentDomain>('social');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
  });

  const user = data?.user;

  const projectsQuery = useQuery({
    queryKey: ['projects', user?.id],
    queryFn: () => getUserProjects(user!.id),
    enabled: !!user && tab === 'career',
  });

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.bg }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: spacing[3],
          paddingVertical: spacing[2],
        }}
      >
        <Text variant="headingMd">{user ? `@${user.username}` : 'Profil'}</Text>
        <View style={{ flexDirection: 'row', gap: spacing[3] }}>
          <Pressable onPress={() => router.push('/deals')} hitSlop={8}>
            <Ionicons name="pricetag-outline" size={24} color={theme.textPrimary} />
          </Pressable>
          <Pressable onPress={() => router.push('/settings')} hitSlop={8}>
            <Ionicons name="settings-outline" size={24} color={theme.textPrimary} />
          </Pressable>
          <Pressable onPress={() => void signOut()} hitSlop={8}>
            <Ionicons name="log-out-outline" size={24} color={theme.textPrimary} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing[3], gap: spacing[3] }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        {isLoading || !user ? (
          <ProfileSkeleton />
        ) : (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
              <Avatar uri={user.avatarUrl} name={user.displayName} size={84} verified={user.isVerifiedStudent} />
              <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-around' }}>
                <Stat label="Gönderi" value={user.postCount} />
                <Stat label="Takipçi" value={user.followerCount} />
                <Stat label="Bağlantı" value={user.connectionCount} />
              </View>
            </View>

            <View style={{ gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text variant="headingMd">{user.displayName}</Text>
                {user.accountVisibility === 'private' ? (
                  <Ionicons name="lock-closed" size={14} color={theme.textMuted} />
                ) : null}
              </View>
              {user.careerHeadline ? (
                <Badge label={user.careerHeadline} tone="brand" icon="briefcase" />
              ) : null}
              {user.statusText ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {user.statusEmoji ? <Text>{user.statusEmoji}</Text> : null}
                  <Text tone="secondary">{user.statusText}</Text>
                </View>
              ) : null}
              {user.bio ? <Text tone="secondary">{user.bio}</Text> : null}
            </View>

            <Button
              label="Profili Düzenle"
              variant="secondary"
              onPress={() => router.push('/edit-profile')}
            />
            <View style={{ flexDirection: 'row', gap: spacing[2] }}>
              <View style={{ flex: 1 }}>
                <Button
                  label="Akademik"
                  variant="outline"
                  size="sm"
                  onPress={() => router.push('/edit-academic')}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  label="Topluluklarım"
                  variant="outline"
                  size="sm"
                  onPress={() => router.push('/communities')}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  label="Yakın Arkadaş"
                  variant="outline"
                  size="sm"
                  onPress={() => router.push('/close-friends')}
                />
              </View>
            </View>

            {data?.academic ? (
              <AcademicInfoCard
                academic={{
                  faculty: data.academic.faculty,
                  department: data.academic.department,
                  classYear: data.academic.classYear,
                  graduationYear: data.academic.graduationYear,
                  gpa: data.academic.gpa != null ? Number(data.academic.gpa) : null,
                  studentNo: data.academic.studentNo,
                }}
              />
            ) : null}

            <SegmentedControl
              segments={[
                { value: 'social', label: 'Sosyal' },
                { value: 'career', label: 'Kariyer' },
              ]}
              value={tab}
              onChange={setTab}
            />

            <View style={{ minHeight: 240, gap: spacing[3] }}>
              {tab === 'career' && projectsQuery.data?.items.length ? (
                projectsQuery.data.items.map((p) => (
                  <ProjectCard key={p.id} project={p} onPress={() => router.push(`/project/${p.id}`)} />
                ))
              ) : (
                <EmptyState
                  icon={tab === 'social' ? 'images-outline' : 'briefcase-outline'}
                  title={tab === 'social' ? 'Henüz sosyal paylaşım yok' : 'Henüz kariyer paylaşımı yok'}
                  description={
                    tab === 'social'
                      ? 'İlk gönderini paylaşarak başla.'
                      : 'Projelerini ve başarılarını paylaş.'
                  }
                  actionLabel={tab === 'career' ? 'Proje paylaş' : undefined}
                  onAction={tab === 'career' ? () => router.push('/compose/project') : undefined}
                />
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text variant="headingMd">{value}</Text>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
    </View>
  );
}

function ProfileSkeleton() {
  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <Skeleton width={84} height={84} radius={42} />
        <View style={{ flex: 1, gap: 8 }}>
          <Skeleton height={20} />
          <Skeleton height={14} width="60%" />
        </View>
      </View>
      <Skeleton height={48} radius={12} />
      <Skeleton height={40} radius={999} />
    </View>
  );
}
