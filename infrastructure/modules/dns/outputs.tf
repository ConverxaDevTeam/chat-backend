output "id" {
  description = "The ID of the DNS record"
  value       = digitalocean_record.backend_dns.id
}

output "fqdn" {
  description = "The FQDN of the DNS record"
  value       = digitalocean_record.backend_dns.fqdn
}

output "name" {
  description = "The name of the DNS record"
  value       = digitalocean_record.backend_dns.name
}

output "value" {
  description = "The value of the DNS record"
  value       = digitalocean_record.backend_dns.value
}

output "type" {
  description = "The type of the DNS record"
  value       = digitalocean_record.backend_dns.type
}

output "ttl" {
  description = "The TTL of the DNS record"
  value       = digitalocean_record.backend_dns.ttl
}

output "internal_id" {
  description = "The ID of the internal DNS record"
  value       = digitalocean_record.internal_backend_dns.id
}

output "internal_fqdn" {
  description = "The FQDN of the internal DNS record"
  value       = digitalocean_record.internal_backend_dns.fqdn
}

output "internal_name" {
  description = "The name of the internal DNS record"
  value       = digitalocean_record.internal_backend_dns.name
}
