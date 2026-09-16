using './main.bicep'

// Everything here is public, non-secret configuration. No keys, no tokens —
// the deployment token is fetched at run time and never written down.

param name = 'swa-jmcengg-prod'
param location = 'eastasia'
param sku = 'Free'
