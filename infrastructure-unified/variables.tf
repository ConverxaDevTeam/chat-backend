variable "do_token" {
  description = "DigitalOcean API token"
  type        = string
}

variable "ssh_key" {
  description = "SSH key fingerprint"
  type        = string
}

variable "region" {
  description = "DigitalOcean region"
  type        = string
  default     = "sfo3"
}

variable "droplet_size" {
  description = "Droplet size"
  type        = string
  default     = "s-2vcpu-2gb"
}

variable "image" {
  description = "Droplet image slug"
  type        = string
  default     = "ubuntu-24-10-x64"
}

variable "private_key_path" {
  description = "Ruta absoluta a la llave privada SSH para el provisioner remote-exec."
  type        = string
}

# Frontend Configuration Variables
variable "frontend_repo_url" {
  description = "URL del repositorio del frontend"
  type        = string
  default     = "https://github.com/your-org/converxa-chat-frontend-v2.git"
}

variable "backend_repo_url" {
  description = "URL del repositorio del backend"
  type        = string
  default     = "https://github.com/your-org/converxa-chat-backend-v2.git"
}

variable "frontend_prod_api_url" {
  description = "URL de la API para el frontend de producción"
  type        = string
  default     = "https://dev-converxa-chat.converxacall.com"
}

variable "frontend_internal_api_url" {
  description = "URL de la API para el frontend de pruebas internas"
  type        = string
  default     = "https://internal-back-chat.converxa.com"
}

# DigitalOcean Project Configuration (Optional)
variable "project_id" {
  description = "ID del proyecto de DigitalOcean donde asignar los recursos. Si no se especifica, los recursos no se asignarán a ningún proyecto específico."
  type        = string
  default     = null
}

variable "project_name" {
  description = "Nombre del proyecto de DigitalOcean donde asignar los recursos (alternativa a project_id). Si se especifica, se buscará el proyecto por nombre."
  type        = string
  default     = null
}

# Domain Configuration Variables (for outputs when DNS module is disabled)
variable "backend_domain" {
  description = "Dominio del backend para producción"
  type        = string
  default     = "back-chat.converxa.com"
}

variable "backend_internal_domain" {
  description = "Dominio del backend para pruebas internas"
  type        = string
  default     = "internal-back-chat.converxa.com"
}

variable "frontend_domain" {
  description = "Dominio del frontend para producción"
  type        = string
  default     = "app-chat.converxa.com"
}

variable "frontend_internal_domain" {
  description = "Dominio del frontend para pruebas internas"
  type        = string
  default     = "internal-app.converxa.com"
}

variable "enable_dns_module" {
  description = "Habilitar el módulo DNS de DigitalOcean (crea automáticamente los registros DNS)"
  type        = bool
  default     = false
}

variable "project_create" {
  description = "Crear un nuevo proyecto en DigitalOcean en lugar de usar uno existente"
  type        = bool
  default     = false
}

# Database Configuration Variables
variable "enable_database" {
  description = "Habilitar la creación de base de datos externa en DigitalOcean"
  type        = bool
  default     = true
}

variable "database_name" {
  description = "Nombre del cluster de base de datos"
  type        = string
  default     = "converxa-prod-db"
}

variable "database_size" {
  description = "Tamaño del cluster de base de datos"
  type        = string
  default     = "db-s-1vcpu-1gb"
}

variable "database_user" {
  description = "Usuario de la base de datos"
  type        = string
  default     = "converxa_user"
}

variable "database_password" {
  description = "Contraseña de la base de datos"
  type        = string
  sensitive   = true
  default     = "converxa_password_2024"
}
