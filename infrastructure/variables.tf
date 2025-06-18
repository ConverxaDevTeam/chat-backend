variable "do_token" {
  description = "DigitalOcean API token"
  type = string
}

variable "ssh_key" {
  description = "SSH key fingerprint"
  type = string
}

variable "region" {
  description = "DigitalOcean region"
  type = string
  default = "sfo3"
}

variable "droplet_size" {
  description = "Droplet size"
  type = string
  default = "s-2vcpu-2gb"
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