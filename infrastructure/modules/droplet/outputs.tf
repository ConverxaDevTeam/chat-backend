output "id" {
  description = "The ID of the droplet"
  value       = digitalocean_droplet.backend.id
}

output "ipv4_address" {
  description = "The public IPv4 address of the droplet"
  value       = digitalocean_droplet.backend.ipv4_address
}

output "ipv4_address_private" {
  description = "The private IPv4 address of the droplet"
  value       = digitalocean_droplet.backend.ipv4_address_private
}

output "urn" {
  description = "The uniform resource name of the droplet"
  value       = digitalocean_droplet.backend.urn
}

output "name" {
  description = "The name of the droplet"
  value       = digitalocean_droplet.backend.name
}

output "region" {
  description = "The region of the droplet"
  value       = digitalocean_droplet.backend.region
}

output "size" {
  description = "The size of the droplet"
  value       = digitalocean_droplet.backend.size
}

