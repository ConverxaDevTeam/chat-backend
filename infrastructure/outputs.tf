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

output "ssh_connection" {
  description = "SSH connection command"
  value       = "ssh -i ${var.private_key_path} root@${module.droplet.ipv4_address}"
}