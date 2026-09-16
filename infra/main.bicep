// JMC Engineering — jmcengg.com hosting.
//
// Scope: an existing resource group. You create the resource group once in the
// portal (Central India), then this template owns everything inside it. Keeping
// the template resource-group-scoped means the GitHub identity only ever needs
// rights on this one group, never on the whole subscription.
//
// Deploy:   az deployment group create \
//             --resource-group rg-jmcengg-prod \
//             --template-file infra/main.bicep \
//             --parameters infra/main.bicepparam
//
// The workflow .github/workflows/azure-infra.yml does exactly that, on demand.

targetScope = 'resourceGroup'

@description('Name of the Static Web App resource.')
param name string = 'swa-jmcengg-prod'

@description('''
Region for the Static Web App. The Free tier is only offered in a handful of
regions and Central India is NOT one of them, so the resource itself lives in
East Asia (Hong Kong) — the closest option to Chennai. This does not decide
where visitors are served from: the static content is pushed to Azure's global
edge either way. The region only decides where the control plane and any
managed functions run.
''')
@allowed([
  'eastasia'
  'centralus'
  'eastus2'
  'westus2'
  'westeurope'
])
param location string = 'eastasia'

@description('Free is enough for a static marketing site. Standard adds a 99.95% SLA, private endpoints and bring-your-own functions — worth revisiting only when the admin panel needs them.')
@allowed([
  'Free'
  'Standard'
])
param sku string = 'Free'

@description('Tags applied to every resource, so the bill can be read by purpose later.')
param tags object = {
  application: 'jmcengg.com'
  environment: 'production'
  managedBy: 'bicep'
}

resource site 'Microsoft.Web/staticSites@2023-01-01' = {
  name: name
  location: location
  tags: tags
  sku: {
    name: sku
    tier: sku
  }
  properties: {
    // 'Custom' means: this app is deployed by our own GitHub Actions workflow.
    // Azure must not try to generate or commit a workflow file of its own.
    provider: 'Custom'
    // Lets staticwebapp.config.json in the build output take effect.
    allowConfigFileUpdates: true
    // Every pull request gets its own throwaway preview URL.
    stagingEnvironmentPolicy: 'Enabled'
    enterpriseGradeCdnStatus: 'Disabled'
  }
}

@description('Resource ID — used when assigning roles or wiring later resources.')
output staticSiteId string = site.id

@description('The azurestaticapps.net hostname. Test against this before moving DNS.')
output defaultHostname string = site.properties.defaultHostname

@description('Resource name, echoed for the deploy workflow.')
output staticSiteName string = site.name
