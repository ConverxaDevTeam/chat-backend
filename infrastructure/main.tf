terraform {
  required_providers {
    digitalocean = {
      source = "digitalocean/digitalocean"
      version = "~> 2.0"
    }
  }
}

provider "digitalocean" {
  token = var.do_token
}

module "droplet" {
  source = "./modules/droplet"
  ssh_key = var.ssh_key
  region = var.region
  droplet_size = var.droplet_size
  image = var.image
  private_key_path = var.private_key_path
}

module "dns" {
  source = "./modules/dns"
  domain = "sofiacall.com"
  droplet_ip = module.droplet.ipv4_address
}

resource "digitalocean_project_resources" "backend_v2" {
  project = "11c677b1-897a-469c-ae6f-a1bce63196eb"
  resources = [
    module.droplet.urn
  ]
}