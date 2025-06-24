# Droplet Information
output "droplet_ip" {
  description = "The public IP address of the droplet"
  value       = module.droplet.ipv4_address
}

output "droplet_id" {
  description = "The ID of the droplet"
  value       = module.droplet.id
}

output "droplet_urn" {
  description = "The URN of the droplet"
  value       = module.droplet.urn
}

# DNS Records (conditional based on DNS module)
output "dns_record_fqdn" {
  description = "The FQDN of the main DNS record"
  value       = var.enable_dns_module ? module.dns[0].fqdn : var.backend_domain
}

output "internal_dns_record_fqdn" {
  description = "The FQDN of the internal DNS record"
  value       = var.enable_dns_module ? module.dns[0].internal_fqdn : var.backend_internal_domain
}

output "frontend_dns_record_fqdn" {
  description = "The FQDN of the frontend DNS record"
  value       = var.enable_dns_module ? module.dns[0].frontend_fqdn : var.frontend_domain
}

output "internal_frontend_dns_record_fqdn" {
  description = "The FQDN of the internal frontend DNS record"
  value       = var.enable_dns_module ? module.dns[0].internal_frontend_fqdn : var.frontend_internal_domain
}

# Connection Information
output "ssh_connection" {
  description = "SSH connection command"
  value       = "ssh -i ${var.private_key_path} root@${module.droplet.ipv4_address}"
}

output "blue_green_status" {
  description = "Command to check Blue-Green deployment status"
  value       = "ssh -i ${var.private_key_path} root@${module.droplet.ipv4_address} '/opt/converxa-chat/blue-green-simple.sh status'"
}

# Backend URLs
output "backend_production_url" {
  description = "Backend Production URL"
  value       = "https://${var.enable_dns_module ? module.dns[0].fqdn : var.backend_domain}"
}

output "backend_internal_testing_url" {
  description = "Backend Internal testing URL"
  value       = "https://${var.enable_dns_module ? module.dns[0].internal_fqdn : var.backend_internal_domain}"
}

output "blue_direct_url" {
  description = "Blue container direct URL"
  value       = "http://${module.droplet.ipv4_address}:3002/api/health"
}

output "green_direct_url" {
  description = "Green container direct URL"
  value       = "http://${module.droplet.ipv4_address}:3003/api/health"
}

# Frontend URLs
output "frontend_production_url" {
  description = "Frontend Production URL"
  value       = "https://${var.enable_dns_module ? module.dns[0].frontend_fqdn : var.frontend_domain}"
}

output "frontend_internal_testing_url" {
  description = "Frontend Internal testing URL"
  value       = "https://${var.enable_dns_module ? module.dns[0].internal_frontend_fqdn : var.frontend_internal_domain}"
}

# All URLs Summary
output "all_urls" {
  description = "All available URLs"
  value = {
    backend_production  = "https://${var.enable_dns_module ? module.dns[0].fqdn : var.backend_domain}"
    backend_internal    = "https://${var.enable_dns_module ? module.dns[0].internal_fqdn : var.backend_internal_domain}"
    frontend_production = "https://${var.enable_dns_module ? module.dns[0].frontend_fqdn : var.frontend_domain}"
    frontend_internal   = "https://${var.enable_dns_module ? module.dns[0].internal_frontend_fqdn : var.frontend_internal_domain}"
    blue_direct         = "http://${module.droplet.ipv4_address}:3002/api/health"
    green_direct        = "http://${module.droplet.ipv4_address}:3003/api/health"
  }
}

# Database Information
output "database_host" {
  description = "Database host"
  value       = var.enable_database ? module.database[0].database_host : "localhost"
}

output "database_port" {
  description = "Database port"
  value       = var.enable_database ? module.database[0].database_port : 5432
}

output "database_user" {
  description = "Database user"
  value       = var.enable_database ? module.database[0].database_user : "converxa_user"
}

output "database_name" {
  description = "Application database name"
  value       = var.enable_database ? module.database[0].database_name : "converxa_app"
}

output "database_uri" {
  description = "Database connection URI"
  value       = var.enable_database ? module.database[0].database_uri : "postgresql://converxa_user:converxa_password_2024@localhost:5432/converxa_app"
  sensitive   = true
}

output "database_private_uri" {
  description = "Database private connection URI (for internal use)"
  value       = var.enable_database ? module.database[0].database_private_uri : "postgresql://converxa_user:converxa_password_2024@localhost:5432/converxa_app"
  sensitive   = true
}

# Deployment Commands
output "deployment_commands" {
  description = "Useful deployment commands"
  value = {
    ssh_connect     = "ssh -i ${var.private_key_path} root@${module.droplet.ipv4_address}"
    bg_status       = "ssh -i ${var.private_key_path} root@${module.droplet.ipv4_address} '/opt/converxa-chat/blue-green-simple.sh status'"
    frontend_deploy = "ssh -i ${var.private_key_path} root@${module.droplet.ipv4_address} '/opt/converxa-chat/frontend-deploy.sh'"
    full_deploy     = "ssh -i ${var.private_key_path} root@${module.droplet.ipv4_address} '/opt/converxa-chat/full-deploy.sh'"
    clone_backend   = "ssh -i ${var.private_key_path} root@${module.droplet.ipv4_address} 'git clone git@github.com:your-org/converxa-backend.git /root/repos/converxa-chat-backend-v2'"
    clone_frontend  = "ssh -i ${var.private_key_path} root@${module.droplet.ipv4_address} 'git clone git@github.com:your-org/converxa-frontend.git /root/repos/converxa-frontend'"
  }
}

# Environment Variables Summary
output "environment_variables" {
  description = "Environment variables for the application"
  value = {
    DATABASE_URL  = var.enable_database ? module.database[0].database_private_uri : "postgresql://converxa_user:converxa_password_2024@localhost:5432/converxa_app"
    DATABASE_HOST = var.enable_database ? module.database[0].database_host : "localhost"
    DATABASE_PORT = var.enable_database ? module.database[0].database_port : 5432
    DATABASE_USER = var.enable_database ? module.database[0].database_user : "converxa_user"
    DATABASE_NAME = var.enable_database ? module.database[0].database_name : "converxa_app"
    NODE_ENV      = "production"
    SERVER_IP     = module.droplet.ipv4_address
  }
  sensitive = true
}
