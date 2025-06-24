variable "ssh_key" {
  description = "SSH key fingerprint"
  type        = string
}

variable "region" {
  description = "DigitalOcean region"
  type        = string
}

variable "droplet_size" {
  description = "Droplet size"
  type        = string
}

variable "image" {
  description = "Droplet image slug"
  type        = string
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
  default     = "https://internal-dev-converxa-chat.converxacall.com"
}
