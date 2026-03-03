import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: 'Voltar',
        headerShadowVisible: false,
        headerTitleAlign: 'center',
      }}
    >
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ title: 'Entrar', headerTitle: 'Entrar' }} />
      <Stack.Screen name="signup" options={{ title: 'Cadastro', headerTitle: 'Cadastro' }} />
      <Stack.Screen name="forgot-password" options={{ title: 'Esqueci minha senha', headerTitle: 'Esqueci minha senha' }} />
    </Stack>
  );
}
