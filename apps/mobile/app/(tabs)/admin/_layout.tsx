import { Stack } from 'expo-router';
import { useTheme } from '../../../src/hooks/useTheme';

export default function AdminLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.headerBg },
        headerTintColor: colors.textPrimary,
        headerTitleAlign: 'center',
        headerBackTitle: 'Voltar',
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Administração',
        }}
      />
      <Stack.Screen name="panel" options={{ title: 'Painel completo' }} />
      <Stack.Screen name="pending-kyc" options={{ title: 'KYC pendentes' }} />
      <Stack.Screen name="pending-pets" options={{ title: 'Pets pendentes' }} />
      <Stack.Screen name="reports" options={{ title: 'Denúncias' }} />
      <Stack.Screen name="adoptions" options={{ title: 'Adoções' }} />
      <Stack.Screen name="verifications" options={{ title: 'Verificações' }} />
      <Stack.Screen name="users" options={{ title: 'Usuários' }} />
      <Stack.Screen name="partners" options={{ title: 'Parceiros' }} />
      <Stack.Screen name="bug-reports" options={{ title: 'Bug reports' }} />
      <Stack.Screen name="feature-flags" options={{ title: 'Feature flags' }} />
      <Stack.Screen name="satisfaction" options={{ title: 'Pesquisa de satisfação' }} />
      <Stack.Screen name="top-tutors-pf" options={{ title: 'Top tutores PF' }} />
    </Stack>
  );
}
