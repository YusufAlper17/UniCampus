import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Screen } from '../src/ui/Screen.js';
import { Text } from '../src/ui/Text.js';
import { Input } from '../src/ui/Input.js';
import { Button } from '../src/ui/Button.js';
import { SegmentedControl } from '../src/ui/SegmentedControl.js';
import { useToast } from '../src/ui/Toast.js';
import { useTheme } from '../src/lib/theme.js';
import { getMe, updateAcademic } from '../src/features/users/api.js';
import { ApiError } from '../src/lib/api.js';

type FieldVis = 'public' | 'connections' | 'private';

const VIS_SEGMENTS = [
  { value: 'public' as FieldVis, label: 'Herkese' },
  { value: 'connections' as FieldVis, label: 'Bağlantılar' },
  { value: 'private' as FieldVis, label: 'Gizli' },
];

export default function EditAcademic() {
  const { spacing } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();

  const { data } = useQuery({ queryKey: ['me'], queryFn: getMe });

  const [faculty, setFaculty] = useState('');
  const [department, setDepartment] = useState('');
  const [classYear, setClassYear] = useState('');
  const [gpa, setGpa] = useState('');
  const [studentNo, setStudentNo] = useState('');
  const [graduationYear, setGraduationYear] = useState('');
  const [gpaVis, setGpaVis] = useState<FieldVis>('private');
  const [studentNoVis, setStudentNoVis] = useState<FieldVis>('private');
  const [classYearVis, setClassYearVis] = useState<FieldVis>('public');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const a = data?.academic;
    if (!a) return;
    setFaculty(a.faculty ?? '');
    setDepartment(a.department ?? '');
    setClassYear(a.classYear != null ? String(a.classYear) : '');
    setGpa(a.gpa != null ? String(a.gpa) : '');
    setStudentNo(a.studentNo ?? '');
    setGraduationYear(a.graduationYear != null ? String(a.graduationYear) : '');
    try {
      const vis = JSON.parse(a.fieldVisibility) as Record<string, FieldVis>;
      if (vis.gpa) setGpaVis(vis.gpa);
      if (vis.studentNo) setStudentNoVis(vis.studentNo);
      if (vis.classYear) setClassYearVis(vis.classYear);
    } catch {
      /* varsayılanları koru */
    }
  }, [data]);

  async function submit() {
    setSaving(true);
    try {
      await updateAcademic({
        faculty: faculty.trim() || undefined,
        department: department.trim() || undefined,
        classYear: classYear ? Number(classYear) : undefined,
        gpa: gpa ? Number(gpa) : undefined,
        studentNo: studentNo.trim() || undefined,
        graduationYear: graduationYear ? Number(graduationYear) : undefined,
        fieldVisibility: { gpa: gpaVis, studentNo: studentNoVis, classYear: classYearVis },
      });
      await qc.invalidateQueries({ queryKey: ['me'] });
      toast.show('Akademik profil güncellendi', 'success');
      router.back();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : 'Kaydedilemedi', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen scroll edges={['bottom']} contentStyle={{ gap: spacing[3] }}>
      <Stack.Screen options={{ title: 'Akademik Profil', headerShown: true }} />

      <Input label="Fakülte" placeholder="Örn. Mühendislik Fakültesi" value={faculty} onChangeText={setFaculty} autoCapitalize="words" />
      <Input label="Bölüm" placeholder="Örn. Bilgisayar Mühendisliği" value={department} onChangeText={setDepartment} autoCapitalize="words" />
      <Input label="Sınıf" placeholder="1-8" keyboardType="number-pad" value={classYear} onChangeText={setClassYear} />
      <Input label="GPA" placeholder="0.00 - 4.00" keyboardType="decimal-pad" value={gpa} onChangeText={setGpa} />
      <Input label="Öğrenci No" placeholder="Örn. 150200001" value={studentNo} onChangeText={setStudentNo} />
      <Input label="Mezuniyet Yılı" placeholder="Örn. 2027" keyboardType="number-pad" value={graduationYear} onChangeText={setGraduationYear} />

      <View style={{ gap: spacing[3], marginTop: spacing[2] }}>
        <Text variant="caption" tone="muted">
          Alan Gizliliği
        </Text>

        <View style={{ gap: 8 }}>
          <Text variant="caption" tone="secondary">
            GPA kimler görsün
          </Text>
          <SegmentedControl<FieldVis> segments={VIS_SEGMENTS} value={gpaVis} onChange={setGpaVis} />
        </View>

        <View style={{ gap: 8 }}>
          <Text variant="caption" tone="secondary">
            Öğrenci No kimler görsün
          </Text>
          <SegmentedControl<FieldVis> segments={VIS_SEGMENTS} value={studentNoVis} onChange={setStudentNoVis} />
        </View>

        <View style={{ gap: 8 }}>
          <Text variant="caption" tone="secondary">
            Sınıf kimler görsün
          </Text>
          <SegmentedControl<FieldVis> segments={VIS_SEGMENTS} value={classYearVis} onChange={setClassYearVis} />
        </View>
      </View>

      <Button label="Kaydet" loading={saving} onPress={submit} style={{ marginTop: spacing[2] }} />
    </Screen>
  );
}
