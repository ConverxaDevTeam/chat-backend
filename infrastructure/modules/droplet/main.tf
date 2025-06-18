terraform {
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = ">= 2.0"
    }
  }
}

resource "digitalocean_droplet" "backend" {
  image  = var.image
  name   = "sofia-chat-backend-dev-v2"
  region = var.region
  size   = var.droplet_size
  ssh_keys = [var.ssh_key]
  user_data = templatefile("${path.module}/setup.sh", {})

  provisioner "remote-exec" {
    inline = [
      "chmod +x /root/setup.sh || true",
      "/root/setup.sh"
    ]
    connection {
      type        = "ssh"
      user        = "root"
      private_key = file(var.private_key_path)
      host        = self.ipv4_address
    }
  }
}

