variable "domain" {
  description = "The domain name to create DNS records for"
  type = string
}

variable "droplet_ip" {
  description = "The IP address of the droplet to point DNS to"
  type = string
}