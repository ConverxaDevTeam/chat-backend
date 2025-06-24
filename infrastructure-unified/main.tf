terraform {
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.0"
    }
  }
}

provider "digitalocean" {
  token = var.do_token
}

# Data source to find project by name
data "digitalocean_project" "clones" {
  count = var.project_name != null ? 1 : 0
  name  = var.project_name
}

# Database Configuration
module "database" {
  count             = var.enable_database ? 1 : 0
  source            = "./modules/database"
  database_name     = var.database_name
  database_size     = var.database_size
  database_region   = var.region
  database_user     = var.database_user
  database_password = var.database_password
}

# Backend + Frontend Unified Droplet
module "droplet" {
  source           = "./modules/droplet"
  ssh_key          = var.ssh_key
  region           = var.region
  droplet_size     = var.droplet_size
  image            = var.image
  private_key_path = var.private_key_path

  # Frontend configuration
  frontend_repo_url         = var.frontend_repo_url
  backend_repo_url          = var.backend_repo_url
  frontend_prod_api_url     = var.frontend_prod_api_url
  frontend_internal_api_url = var.frontend_internal_api_url
}

# DNS Configuration for all services (Optional)
# Domains will be configured externally by default: app-chat.converxa.com, internal-app.converxa.com,
# back-chat.converxa.com, internal-back-chat.converxa.com
module "dns" {
  count      = var.enable_dns_module ? 1 : 0
  source     = "./modules/dns"
  domain     = "converxa.com"
  droplet_ip = module.droplet.ipv4_address
}

# Project Resources (assign droplet and database to project)
resource "digitalocean_project_resources" "converxa_resources" {
  count   = var.project_id != null || var.project_name != null ? 1 : 0
  project = var.project_id != null ? var.project_id : data.digitalocean_project.clones[0].id
  resources = concat(
    [module.droplet.urn],
    var.enable_database ? [module.database[0].database_urn] : []
  )
}
