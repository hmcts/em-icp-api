provider "azurerm" {
  features {}
}

locals {
  app_full_name = "${var.product}-${var.component}"
  local_env           = var.env == "preview" ? "aat" : var.env
  s2s_key             = data.azurerm_key_vault_secret.s2s_key.value
  # list of the thumbprints of the SSL certificates that should be accepted by the API (gateway)
  allowed_certificate_thumbprints = [
    # API tests
    var.api_gateway_test_certificate_thumbprint,
    "29390B7A235C692DACD93FA0AB90081867177BEC"
  ]
  thumbprints_in_quotes     = formatlist("&quot;%s&quot;", local.allowed_certificate_thumbprints)
  thumbprints_in_quotes_str = join(",", local.thumbprints_in_quotes)
  api_policy                = replace(file("template/api-policy.xml"), "ALLOWED_CERTIFICATE_THUMBPRINTS", local.thumbprints_in_quotes_str)
  api_base_path             = "${var.product}-icp-api"
  api_mgmt_name             = "core-api-mgmt-${var.env}"
}

resource "azurerm_resource_group" "rg" {
  name     = "${var.product}-${var.component}-${var.env}"
  location = var.location

  tags = var.common_tags
}

data "azurerm_user_assigned_identity" "em-shared-identity" {
  name                = "rpa-${var.env}-mi"
  resource_group_name = "managed-identities-${var.env}-rg"
}

resource "azurerm_application_insights" "appinsights" {
  name                = "${var.product}-${var.component}-appinsights-${var.env}"
  location            = var.appinsights_location
  resource_group_name = azurerm_resource_group.rg.name
  application_type    = "web"

  tags = var.common_tags
}

module "local_key_vault" {
  source                     = "git@github.com:hmcts/cnp-module-key-vault?ref=master"
  product                    = local.app_full_name
  env                        = var.env
  tenant_id                  = var.tenant_id
  object_id                  = var.jenkins_AAD_objectId
  resource_group_name        = azurerm_resource_group.rg.name
  product_group_object_id    = "5d9cd025-a293-4b97-a0e5-6f43efce02c0"
  common_tags                = var.common_tags
  managed_identity_object_ids = ["${data.azurerm_user_assigned_identity.em-shared-identity.principal_id}","${var.managed_identity_object_id}"]
}

data "azurerm_key_vault" "s2s_vault" {
  name                = "s2s-${local.local_env}"
  resource_group_name = "rpe-service-auth-provider-${local.local_env}"
}

data "azurerm_key_vault_secret" "s2s_key" {
  name         = "microservicekey-em-icp"
  key_vault_id = data.azurerm_key_vault.s2s_vault.id
}

resource "azurerm_key_vault_secret" "local_s2s_key" {
  name         = "microservicekey-em-icp"
  value        = data.azurerm_key_vault_secret.s2s_key.value
  key_vault_id = module.local_key_vault.key_vault_id
}

# Load AppInsights key from rpa vault
data "azurerm_key_vault" "rpa_vault" {
  name                = "rpa-${local.local_env}"
  resource_group_name = "rpa-${local.local_env}"
}


data "azurerm_key_vault_secret" "app_insights_key" {
  name      = "AppInsightsInstrumentationKey"
  key_vault_id = data.azurerm_key_vault.rpa_vault.id
}

resource "azurerm_key_vault_secret" "local_app_insights_key" {
  name         = "AppInsightsInstrumentationKey"
  value        = data.azurerm_key_vault_secret.app_insights_key.value
  key_vault_id = module.local_key_vault.key_vault_id
}



#Redis
data "azurerm_subnet" "core_infra_redis_subnet" {
  name                 = "core-infra-subnet-1-${var.env}"
  virtual_network_name = "core-infra-vnet-${var.env}"
  resource_group_name = "core-infra-${var.env}"
}

module "em-icp-redis-cache" {
  source   = "git@github.com:hmcts/cnp-module-redis?ref=master"
  product  = "${var.product}-${var.component}-redis-cache"
  location = var.location
  env      = var.env
  subnetid = data.azurerm_subnet.core_infra_redis_subnet.id
  common_tags  = var.common_tags
}

resource "azurerm_key_vault_secret" "local_redis_password" {
  name = "redis-password"
  value = module.em-icp-redis-cache.access_key
  key_vault_id = module.local_key_vault.key_vault_id
}

# region API (gateway)

module "em-icp-api" {
  source = "git@github.com:hmcts/cnp-module-api-mgmt-product?ref=master"

  api_mgmt_name = "core-api-mgmt-${var.env}"
  api_mgmt_rg   = "core-infra-${var.env}"
  name = "em-icp-api"
}


module "api" {
  source        = "git@github.com:hmcts/cnp-module-api-mgmt-api?ref=master"
  name          = "${var.product}-icp-api"
  api_mgmt_rg   = "core-infra-${var.env}"
  api_mgmt_name = "core-api-mgmt-${var.env}"
  display_name  = "${var.product}-icp"
  revision      = "1"
  product_id    = module.em-icp-api.product_id
  path          = local.api_base_path
  service_url   = "http://em-icp-${var.env}.service.core-compute-${var.env}.internal"
  swagger_url   = "https://raw.githubusercontent.com/hmcts/reform-api-docs/master/docs/specs/em-icp.json"
}

module "policy" {
  source                 = "git@github.com:hmcts/cnp-module-api-mgmt-api-policy?ref=master"
  api_mgmt_name          = "core-api-mgmt-${var.env}"
  api_mgmt_rg            = "core-infra-${var.env}"
  api_name               = module.api.name
  api_policy_xml_content = local.api_policy
}

resource "azurerm_web_pubsub" "ped_web_pubsub" {
  name                          = "${local.app_full_name}-webpubsub-${var.env}"
  location                      = var.location
  resource_group_name           = "${local.app_full_name}-${var.env}"
  sku                           = "Standard_S1"
  capacity                      = 1
  public_network_access_enabled = true
  live_trace {
    enabled                     = true
    messaging_logs_enabled      = true
    connectivity_logs_enabled   = false
  }
  tags                          = var.common_tags

  identity {
   type         = "UserAssigned"
   identity_ids = [data.azurerm_user_assigned_identity.em-shared-identity.id]
  }
}

resource "azurerm_key_vault_secret" "em_icp_web_pubsub_primary_connection_string" {
  name         = "em-icp-web-pubsub-primary-connection-string"
  value        = azurerm_web_pubsub.ped_web_pubsub.primary_connection_string
  key_vault_id = module.local_key_vault.key_vault_id
}

