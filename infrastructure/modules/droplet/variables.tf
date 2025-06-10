variable "ssh_key" {
  description = "SSH key fingerprint"
  type = string
}

variable "region" {
  description = "DigitalOcean region"
  type = string
}

variable "droplet_size" {
  description = "Droplet size"
  type = string
}

variable "image" {
  description = "Droplet image slug"
  type = string
}

variable "private_key_path" {
  description = "Ruta absoluta a la llave privada SSH para el provisioner remote-exec."
  type = string
}