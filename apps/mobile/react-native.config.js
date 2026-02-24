/**
 * Configuração para o React Native (Expo prebuild / native).
 * Inclui unstable_reactLegacyComponentNames para react-native-maps funcionar
 * com Fabric (New Architecture) no Android e evitar o crash:
 * "addViewAt: failed to insert view into parent" / "The specified child already has a parent"
 * @see https://github.com/react-native-maps/react-native-maps/issues/5043
 * @see https://github.com/react-native-maps/react-native-maps/discussions/5355
 */
module.exports = {
  project: {
    android: {
      unstable_reactLegacyComponentNames: [
        'AIRGoogleMap',
        'AIRMap',
        'AIRMapMarker',
        'AIRMapPolyline',
        'AIRMapPolygon',
        'AIRMapCircle',
        'AIRMapUrlTile',
        'AIRMapLocalTile',
        'AIRMapOverlay',
        'PanoramaView',
      ],
    },
    ios: {
      unstable_reactLegacyComponentNames: [
        'RCTMapView',
        'RCTMapMarker',
      ],
    },
  },
};
