# Backend DNS Outputs
output "id" {
  description = "The ID of the backend DNS record"
  value       = digitalocean_record.backend_dns.id
}

output "fqdn" {
  description = "The FQDN of the backend DNS record"
  value       = digitalocean_record.backend_dns.fqdn
}

output "name" {
  description = "The name of the backend DNS record"
  value       = digitalocean_record.backend_dns.name
}

output "value" {
  description = "The value of the backend DNS record"
  value       = digitalocean_record.backend_dns.value
}

output "type" {
  description = "The type of the backend DNS record"
  value       = digitalocean_record.backend_dns.type
}

output "ttl" {
  description = "The TTL of the backend DNS record"
  value       = digitalocean_record.backend_dns.ttl
}

# Internal Backend DNS Outputs
output "internal_id" {
  description = "The ID of the internal backend DNS record"
  value       = digitalocean_record.internal_backend_dns.id
}

output "internal_fqdn" {
  description = "The FQDN of the internal backend DNS record"
  value       = digitalocean_record.internal_backend_dns.fqdn
}

output "internal_name" {
  description = "The name of the internal backend DNS record"
  value       = digitalocean_record.internal_backend_dns.name
}

# Frontend DNS Outputs
output "frontend_id" {
  description = "The ID of the frontend DNS record"
  value       = digitalocean_record.frontend_dns.id
}

output "frontend_fqdn" {
  description = "The FQDN of the frontend DNS record"
  value       = digitalocean_record.frontend_dns.fqdn
}

output "frontend_name" {
  description = "The name of the frontend DNS record"
  value       = digitalocean_record.frontend_dns.name
}

# Internal Frontend DNS Outputs
output "internal_frontend_id" {
  description = "The ID of the internal frontend DNS record"
  value       = digitalocean_record.internal_frontend_dns.id
}

output "internal_frontend_fqdn" {
  description = "The FQDN of the internal frontend DNS record"
  value       = digitalocean_record.internal_frontend_dns.fqdn
}

output "internal_frontend_name" {
  description = "The name of the internal frontend DNS record"
  value       = digitalocean_record.internal_frontend_dns.name
}
