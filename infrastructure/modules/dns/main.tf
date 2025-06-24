terraform {
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = ">= 2.0"
    }
  }
}

resource "digitalocean_record" "backend_dns" {
  domain = var.domain
  type   = "A"
  name   = "dev-sofia-chat"
  value  = var.droplet_ip
  ttl    = 3600
}

resource "digitalocean_record" "internal_backend_dns" {
  domain = var.domain
  type   = "A"
  name   = "internal-dev-sofia-chat"
  value  = var.droplet_ip
  ttl    = 3600
}
