# Compute module variables
variable "compartment_ocid" { description = "OCID of your compartment" }
variable "subnet_id" { description = "ID of the subnet to attach the instance to" }
variable "vcn_id" { description = "ID of the VCN" }
variable "ssh_public_key_path" { description = "Path to your SSH public key" }
