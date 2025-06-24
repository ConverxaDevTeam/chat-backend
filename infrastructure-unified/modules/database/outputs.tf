output "database_id" {
  description = "ID of the database cluster"
  value       = digitalocean_database_cluster.converxa_db.id
}

output "database_host" {
  description = "Database host"
  value       = digitalocean_database_cluster.converxa_db.host
}

output "database_port" {
  description = "Database port"
  value       = digitalocean_database_cluster.converxa_db.port
}

output "database_user" {
  description = "Database user"
  value       = digitalocean_database_user.converxa_user.name
}

output "database_password" {
  description = "Database password"
  value       = digitalocean_database_cluster.converxa_db.password
  sensitive   = true
}

output "database_name" {
  description = "Application database name"
  value       = digitalocean_database_db.converxa_app_db.name
}

output "database_uri" {
  description = "Database connection URI"
  value       = digitalocean_database_cluster.converxa_db.uri
  sensitive   = true
}

output "database_private_uri" {
  description = "Database private connection URI"
  value       = digitalocean_database_cluster.converxa_db.private_uri
  sensitive   = true
}

output "database_urn" {
  description = "Database URN for project assignment"
  value       = digitalocean_database_cluster.converxa_db.urn
}
