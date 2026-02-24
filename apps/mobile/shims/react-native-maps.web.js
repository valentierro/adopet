/**
 * Stub para react-native-maps na build web.
 * O mapa real só existe em iOS/Android; na web evitamos importar o módulo nativo.
 */
const React = require('react');
const { View } = require('react-native');

const MapView = (props) => React.createElement(View, { ...props, style: [{ flex: 1 }, props.style] });
const Marker = () => null;
const PROVIDER_GOOGLE = 'google';

module.exports = { __esModule: true, default: MapView, Marker, PROVIDER_GOOGLE };
