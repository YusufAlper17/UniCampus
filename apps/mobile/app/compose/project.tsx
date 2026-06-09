import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Screen } from '../../src/ui/Screen.js';
import { Input } from '../../src/ui/Input.js';
import { Button } from '../../src/ui/Button.js';
import { useToast } from '../../src/ui/Toast.js';
import { useTheme } from '../../src/lib/theme.js';
import { createProject } from '../../src/features/career/api.js';
import { ApiError } from '../../src/lib/api.js';

export default function ComposeProject() {
  const { spacing } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();

  const [title, setTitle] = useState('');
  const [role, setRole] = useState('');
  const [description, setDescription] = useState('');
  const [techTags, setTechTags] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [demoUrl, setDemoUrl] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (title.trim().length < 2) {
      toast.show('Proje adı gerekli', 'error');
      return;
    }
    setSaving(true);
    try {
      await createProject({
        title: title.trim(),
        role: role.trim() || undefined,
        description: description.trim() || undefined,
        techTags: techTags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
          .slice(0, 12),
        githubUrl: githubUrl.trim() || undefined,
        demoUrl: demoUrl.trim() || undefined,
        mediaUrls: [],
      });
      await qc.invalidateQueries({ queryKey: ['feed'] });
      toast.show('Proje paylaşıldı', 'success');
      router.back();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : 'Paylaşılamadı', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen scroll edges={['bottom']} contentStyle={{ gap: spacing[3] }}>
      <Input label="Proje adı" placeholder="Örn. UniCampus" value={title} onChangeText={setTitle} autoCapitalize="sentences" />
      <Input label="Rolün" placeholder="Örn. Full-stack geliştirici" value={role} onChangeText={setRole} autoCapitalize="sentences" />
      <Input label="Açıklama" placeholder="Ne yaptın, ne öğrendin?" value={description} onChangeText={setDescription} multiline autoCapitalize="sentences" />
      <Input label="Teknolojiler (virgülle)" placeholder="react, node, postgres" value={techTags} onChangeText={setTechTags} />
      <Input label="GitHub URL" placeholder="https://github.com/..." leftIcon="logo-github" value={githubUrl} onChangeText={setGithubUrl} keyboardType="url" />
      <Input label="Demo URL" placeholder="https://..." leftIcon="link" value={demoUrl} onChangeText={setDemoUrl} keyboardType="url" />
      <Button label="Projeyi Paylaş" loading={saving} onPress={submit} style={{ marginTop: spacing[2] }} />
    </Screen>
  );
}
