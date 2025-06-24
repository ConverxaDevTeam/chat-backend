terraform {
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = ">= 2.0"
    }
  }
}

# Create PostgreSQL Database
resource "digitalocean_database_cluster" "converxa_db" {
  name       = var.database_name
  engine     = "pg"
  version    = "16"
  size       = var.database_size
  region     = var.database_region
  node_count = 1

  tags = ["converxa", "backend", "prod"]
}

# Create database user
resource "digitalocean_database_user" "converxa_user" {
  cluster_id = digitalocean_database_cluster.converxa_db.id
  name       = var.database_user
}

# Create application database
resource "digitalocean_database_db" "converxa_app_db" {
  cluster_id = digitalocean_database_cluster.converxa_db.id
  name       = "converxa_app"
}

# Database firewall rule to allow droplet access
resource "digitalocean_database_firewall" "converxa_db_fw" {
  cluster_id = digitalocean_database_cluster.converxa_db.id

  rule {
    type  = "tag"
    value = "converxa"
  }

  rule {
    type  = "ip_addr"
    value = "0.0.0.0/0"
  }
}
