output "droplet_ip" {
  description = "The public IP address of the backend droplet"
  value       = module.droplet.ipv4_address
}

output "droplet_id" {
  description = "The ID of the backend droplet"
  value       = module.droplet.id
}

output "droplet_urn" {
  description = "The URN of the backend droplet"
  value       = module.droplet.urn
}

output "dns_record_fqdn" {
  description = "The FQDN of the DNS record"
  value       = module.dns.fqdn
}

output "internal_dns_record_fqdn" {
  description = "The FQDN of the internal DNS record"
  value       = module.dns.internal_fqdn
}

output "ssh_connection" {
  description = "SSH connection command"
  value       = "ssh -i ${var.private_key_path} root@${module.droplet.ipv4_address}"
}

output "blue_green_status" {
  description = "Command to check Blue-Green deployment status"
  value       = "ssh -i ${var.private_key_path} root@${module.droplet.ipv4_address} '/opt/sofia-chat/blue-green-simple.sh status'"
}

output "production_url" {
  description = "Production URL"
  value       = "https://${module.dns.fqdn}"
}

output "internal_testing_url" {
  description = "Internal testing URL"
  value       = "https://${module.dns.internal_fqdn}"
}

output "blue_direct_url" {
  description = "Blue container direct URL"
  value       = "http://${module.droplet.ipv4_address}:3002/api/health"
}

output "green_direct_url" {
  description = "Green container direct URL"
  value       = "http://${module.droplet.ipv4_address}:3003/api/health"
}
