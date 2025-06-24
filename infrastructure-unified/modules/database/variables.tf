variable "database_name" {
  description = "Name of the database cluster"
  type        = string
  default     = "converxa-prod-db"
}

variable "database_size" {
  description = "Size of the database cluster"
  type        = string
  default     = "db-s-1vcpu-1gb"
}

variable "database_region" {
  description = "Region where the database will be created"
  type        = string
  default     = "sfo3"
}

variable "database_user" {
  description = "Database user name"
  type        = string
  default     = "converxa_user"
}

variable "database_password" {
  description = "Database password"
  type        = string
  sensitive   = true
  default     = "converxa_password_2024"
}
