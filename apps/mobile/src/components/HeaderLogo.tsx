import { View, Image, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';

const LogoLight = require('../../assets/brand/logo/logo_horizontal_light.png');
const LogoDark = require('../../assets/brand/logo/logo_dark.png');

export function HeaderLogo() {
  const { isDark } = useTheme();
  return (
    <View style={styles.wrap}>
      <Image
        source={isDark ? LogoDark : LogoLight}
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    height: 32,
    width: 120,
  },
});
