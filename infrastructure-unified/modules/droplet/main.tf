terraform {
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = ">= 2.0"
    }
  }
}

resource "digitalocean_droplet" "backend" {
  image     = var.image
  name      = "converxa-prod"
  region    = var.region
  size      = var.droplet_size
  ssh_keys  = [var.ssh_key]
  user_data = templatefile("${path.module}/setup.sh", {})

  provisioner "remote-exec" {
    inline = [
      "echo 'Waiting for setup to start...'",
      "sleep 5",
      "echo 'Monitoring setup progress:'",
      "while [ ! -f /tmp/setup_complete ]; do",
      "  if [ -f /tmp/setup_log ]; then",
      "    echo '=== ÚLTIMAS 5 LÍNEAS DEL LOG ==='",
      "    tail -5 /tmp/setup_log",
      "    echo '================================='",
      "  else",
      "    echo 'Esperando que inicie el setup...'",
      "  fi",
      "  sleep 15",
      "done",
      "echo 'Setup completed successfully!'",
      "echo '=== LOG COMPLETO ==='",
      "cat /tmp/setup_log || echo 'No setup log found'"
    ]

    connection {
      type        = "ssh"
      user        = "root"
      private_key = file(var.private_key_path)
      host        = self.ipv4_address
      timeout     = "15m"
    }
  }
}
