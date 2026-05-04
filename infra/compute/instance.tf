resource "oci_core_instance" "restauranos_vm" {
  compartment_id      = var.compartment_ocid
  availability_domain = data.oci_identity_availability_domains.ad.name
  shape               = "VM.Standard.A1.Flex"
  subtype             = "BASIC"

  source_details {
    source_id   = "ocid1.image.oc1.iad.aaaaaaaaeccobvgqs5jfvrycpuofge2jnjqxq5k4n4tnp7fvrycpuof"
    source_type = "image"
  }

  shape_config {
    memory_in_gbs = 4
    ocpus        = 2
  }

  vnics {
    subnet_id         = var.subnet_id
    is_public_ip_assign = true
  }

  metadata = {
    ssh_authorized_keys = file(var.ssh_public_key_path)
  }
}

data "oci_identity_availability_domains" "ad" {
  compartment_id = var.compartment_ocid
}

output "vm_public_ip" { value = oci_core_instance.restauranos_vm.public_ip }
output "vm_private_ip" { value = oci_core_instance.restauranos_vm.private_ip }
