import { assertLocalArcgis, readFrontendConfig } from './parseConfig'

export const config = readFrontendConfig(import.meta.env, import.meta.env.PROD)
assertLocalArcgis(config, window.location.hostname)
